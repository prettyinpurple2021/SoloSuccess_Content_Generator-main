#!/usr/bin/env node

/**
 * API Key Exposure Test
 *
 * This script tests that sensitive API keys and secrets are not exposed
 * in the client-side build or accessible via browser dev tools
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { validatePath } from '../utils/pathValidator.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Testing API Key Exposure...\n');

// List of sensitive patterns that should NEVER appear in client-side code
const sensitivePatterns = [
  {
    name: 'Google API Keys',
    pattern: /AIza[0-9A-Za-z-_]{35}/g,
    description: 'Google API keys starting with AIza',
  },
  {
    name: 'OpenAI API Keys',
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    description: 'OpenAI API keys starting with sk-',
  },
  {
    name: 'Database URLs',
    pattern: /postgres:\/\/[^@\s]+:[^@\s]+@[^\s]+/g,
    description: 'PostgreSQL connection strings with credentials',
  },
  {
    name: 'Stack Auth Secret Keys',
    pattern: /STACK_SECRET_SERVER_KEY=(?!your_)[a-zA-Z0-9_-]{20,}/g,
    description: 'Stack Auth secret server keys (actual values, not placeholders)',
  },
  {
    name: 'Generic Secret Keys',
    pattern: /['"]\w*[Ss][Ee][Cc][Rr][Ee][Tt]\w*['"]:\s*['"][^'"]{20,}['"]/g,
    description: 'Generic secret key patterns',
  },
  {
    name: 'Private Keys',
    pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----/g,
    description: 'Private key headers',
  },
];

let totalIssues = 0;

function checkFileForSensitiveData(filePath, relativePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  let fileIssues = 0;

  sensitivePatterns.forEach(({ name, pattern, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`❌ ${name} found in ${relativePath}:`);
      console.log(`   Description: ${description}`);
      console.log(`   Matches: ${matches.length}`);
      matches.forEach((match, index) => {
        // Mask the sensitive data for logging
        const masked =
          match.substring(0, 8) +
          '*'.repeat(Math.max(0, match.length - 12)) +
          match.substring(Math.max(8, match.length - 4));
        console.log(`   ${index + 1}. ${masked}`);
      });
      console.log('');
      fileIssues += matches.length;
    }
  });

  totalIssues += fileIssues;
  return fileIssues;
}

function checkClientSideFiles() {
  console.log('📋 Checking client-side source files...');

  const clientFiles = ['App.tsx', 'index.tsx', 'constants.tsx', 'types.ts', 'AppRouter.tsx'];

  let clientIssues = 0;
  clientFiles.forEach((file) => {
    const filePath = validatePath(projectRoot, file);
    clientIssues += checkFileForSensitiveData(filePath, file);
  });

  if (clientIssues === 0) {
    console.log('✅ No sensitive data found in client-side source files\n');
  } else {
    console.log(`❌ Found ${clientIssues} sensitive data issues in client-side source files\n`);
  }
}

function checkBuildOutput() {
  console.log('📋 Checking build output...');

  const distPath = validatePath(projectRoot, 'dist');

  if (!existsSync(distPath)) {
    console.log('⚠️  Build output not found. Run "npm run build" first.\n');
    return;
  }

  try {
    // Find all JS files in the build output
    const jsFiles = execSync('find dist -name "*.js" -type f', {
      cwd: projectRoot,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    let buildIssues = 0;
    jsFiles.forEach((file) => {
      const filePath = validatePath(projectRoot, file);
      buildIssues += checkFileForSensitiveData(filePath, file);
    });

    if (buildIssues === 0) {
      console.log('✅ No sensitive data found in build output\n');
    } else {
      console.log(`❌ Found ${buildIssues} sensitive data issues in build output\n`);
    }
  } catch (error) {
    // Fallback for Windows or if find command is not available
    console.log(
      '⚠️  Could not scan build output automatically. Please manually check dist/ folder.\n'
    );
  }
}

function checkViteConfig() {
  console.log('📋 Checking Vite configuration...');

  const viteConfigPath = validatePath(projectRoot, 'vite.config.ts');
  const content = readFileSync(viteConfigPath, 'utf8');

  // Check for dangerous environment variable exposure
  const dangerousVars = ['SECRET', 'PRIVATE', 'DATABASE_URL', 'GEMINI_API_KEY', 'API_KEY'];

  let configIssues = 0;
  const defineMatch = content.match(/define:\s*{([^}]+)}/s);

  if (defineMatch) {
    const defineContent = defineMatch[1];
    dangerousVars.forEach((varName) => {
      if (defineContent.includes(varName)) {
        console.log(`❌ Potentially dangerous variable "${varName}" found in Vite define config`);
        configIssues++;
      }
    });
  }

  if (configIssues === 0) {
    console.log('✅ Vite configuration looks secure\n');
  } else {
    console.log(`❌ Found ${configIssues} potential security issues in Vite configuration\n`);
  }

  totalIssues += configIssues;
}

function checkEnvironmentFiles() {
  console.log('📋 Checking environment files...');

  const envFiles = ['.env', '.env.local', '.env.production'];
  let envIssues = 0;

  envFiles.forEach((envFile) => {
    const envPath = validatePath(projectRoot, envFile);
    if (existsSync(envPath)) {
      console.log(`⚠️  Environment file ${envFile} exists - ensure it's in .gitignore`);

      // Check if it's properly gitignored
      const gitignorePath = validatePath(projectRoot, '.gitignore');
      if (existsSync(gitignorePath)) {
        const gitignoreContent = readFileSync(gitignorePath, 'utf8');
        if (!gitignoreContent.includes(envFile)) {
          console.log(`❌ ${envFile} is not in .gitignore!`);
          envIssues++;
        }
      }
    }
  });

  // Check .env.example for sensitive data
  const envExamplePath = validatePath(projectRoot, '.env.example');
  if (existsSync(envExamplePath)) {
    envIssues += checkFileForSensitiveData(envExamplePath, '.env.example');
  }

  if (envIssues === 0) {
    console.log('✅ Environment files configuration looks secure\n');
  } else {
    console.log(`❌ Found ${envIssues} issues with environment files\n`);
  }

  totalIssues += envIssues;
}

function generateSecurityReport() {
  console.log('📋 Generating browser exposure test...');

  // Create a simple HTML test page to check what's exposed in the browser
  const testHtml = `<!DOCTYPE html>
<html>
<head>
    <title>API Key Exposure Test</title>
</head>
<body>
    <h1>API Key Exposure Test</h1>
    <div id="results"></div>
    
    <script>
        const results = document.getElementById('results');
        
        // Test what environment variables are accessible
        const envVars = [
            'GEMINI_API_KEY',
            'API_KEY',
            'DATABASE_URL',
            'STACK_SECRET_SERVER_KEY',
            'INTEGRATION_ENCRYPTION_SECRET',
            'VITE_STACK_PROJECT_ID',
            'VITE_STACK_PUBLISHABLE_CLIENT_KEY'
        ];
        
        let exposedVars = [];
        
        envVars.forEach(varName => {
            // Check process.env
            if (typeof process !== 'undefined' && process.env && process.env[varName]) {
                exposedVars.push(\`process.env.\${varName}: \${process.env[varName].substring(0, 10)}...\`);
            }
            
            // Check import.meta.env
            if (typeof import !== 'undefined' && import.meta && import.meta.env && import.meta.env[varName]) {
                exposedVars.push(\`import.meta.env.\${varName}: \${import.meta.env[varName].substring(0, 10)}...\`);
            }
        });
        
        if (exposedVars.length === 0) {
            results.innerHTML = '<p style="color: green;">✅ No sensitive environment variables exposed to browser</p>';
        } else {
            results.innerHTML = '<p style="color: red;">❌ Exposed variables:</p><ul>' + 
                exposedVars.map(v => \`<li>\${v}</li>\`).join('') + '</ul>';
        }
        
        // Also check global variables
        const globalVars = Object.keys(window).filter(key => 
            key.toLowerCase().includes('api') || 
            key.toLowerCase().includes('secret') || 
            key.toLowerCase().includes('key')
        );
        
        if (globalVars.length > 0) {
            results.innerHTML += '<p style="color: orange;">⚠️ Potentially sensitive global variables:</p><ul>' + 
                globalVars.map(v => \`<li>\${v}</li>\`).join('') + '</ul>';
        }
    </script>
</body>
</html>`;

  const testPath = validatePath(projectRoot, 'api-key-exposure-test.html');
  writeFileSync(testPath, testHtml);

  console.log(`✅ Created browser test file: api-key-exposure-test.html`);
  console.log('   Open this file in a browser to test for client-side exposure\n');
}

// Run all tests
async function runApiKeyExposureTest() {
  try {
    checkClientSideFiles();
    checkBuildOutput();
    checkViteConfig();
    checkEnvironmentFiles();
    generateSecurityReport();

    console.log('='.repeat(60));
    console.log('🔍 API KEY EXPOSURE TEST SUMMARY');
    console.log('='.repeat(60));

    if (totalIssues === 0) {
      console.log('✅ No API key exposure issues found!');
      console.log('🎉 Your application appears to be secure from client-side API key exposure.');
      return true;
    } else {
      console.log(`❌ Found ${totalIssues} potential API key exposure issues.`);
      console.log('🚨 Please review and fix the issues above before deploying to production.');
      return false;
    }
  } catch (error) {
    console.error('❌ API key exposure test failed:', error);
    return false;
  }
}

// Run the test
runApiKeyExposureTest().then((success) => {
  process.exit(success ? 0 : 1);
});
