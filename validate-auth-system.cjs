#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-undef */

// Manual validation script for authentication system
const fs = require('fs');
const path = require('path');
const { validatePath } = require('./utils/pathValidator.cjs');

console.log('🔍 Validating Authentication and Authorization System...\n');

// Load environment variables from .env.local
const envLocalPath = validatePath(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const envLines = envContent.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

  envLines.forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
  console.log('✅ Environment variables loaded from .env.local');
} else {
  console.log('❌ .env.local file not found');
}

// 1. Check Stack Auth Configuration
console.log('\n📋 Stack Auth Configuration:');
console.log('----------------------------');

const requiredEnvVars = [
  'VITE_STACK_PROJECT_ID',
  'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY',
];

let allEnvVarsPresent = true;
requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: Missing`);
    allEnvVarsPresent = false;
  }
});

if (allEnvVarsPresent) {
  console.log('✅ All Stack Auth environment variables are present');
} else {
  console.log('❌ Some Stack Auth environment variables are missing');
}

// 2. Check Database Configuration
console.log('\n🗄️  Database Configuration:');
console.log('---------------------------');

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  console.log('✅ DATABASE_URL is configured');
  if (databaseUrl.includes('neon')) {
    console.log('✅ Using Neon PostgreSQL database');
  }
  if (databaseUrl.includes('sslmode=require')) {
    console.log('✅ SSL is enabled for database connections');
  }
} else {
  console.log('❌ DATABASE_URL is missing');
}

// 3. Check Stack Auth Integration Files
console.log('\n📁 Stack Auth Integration Files:');
console.log('--------------------------------');

const requiredFiles = [
  'stack.ts',
  'AppRouter.tsx',
  'components/pages/SignInPage.tsx',
  'components/pages/SignUpPage.tsx',
  'components/pages/ProfilePage.tsx',
];

requiredFiles.forEach((filePath) => {
  const fullPath = validatePath(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${filePath} exists`);
  } else {
    console.log(`❌ ${filePath} missing`);
  }
});

// 4. Check Database Schema for RLS
console.log('\n🔒 Database Schema RLS Check:');
console.log('-----------------------------');

const schemaFiles = ['database/schema.sql', 'database/neon-complete-migration.sql'];

let rlsFound = false;
schemaFiles.forEach((schemaFile) => {
  const fullPath = validatePath(__dirname, schemaFile);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('ROW LEVEL SECURITY') || content.includes('RLS')) {
      console.log(`✅ ${schemaFile} contains RLS policies`);
      rlsFound = true;
    }
  }
});

if (rlsFound) {
  console.log('✅ Row Level Security policies are configured');
} else {
  console.log('❌ Row Level Security policies not found');
}

// 5. Test Stack Auth Import
console.log('\n📦 Stack Auth Package Test:');
console.log('---------------------------');

try {
  // Try to require the Stack Auth package
  const stackAuth = require('@stackframe/stack');
  console.log('✅ @stackframe/stack package is installed');

  // Check if required exports exist
  const requiredExports = ['useUser', 'useStackApp', 'StackProvider', 'StackTheme', 'SignIn'];
  requiredExports.forEach((exportName) => {
    if (stackAuth[exportName]) {
      console.log(`✅ ${exportName} export is available`);
    } else {
      console.log(`❌ ${exportName} export is missing`);
    }
  });
} catch (error) {
  console.log('❌ @stackframe/stack package import failed:', error.message);
}

// 6. Test Stack Server App Configuration
console.log('\n⚙️  Stack Server App Configuration:');
console.log('-----------------------------------');

try {
  // Temporarily set environment variables for testing
  const originalImportMeta = global.import;
  global.import = {
    meta: {
      env: {
        VITE_STACK_PROJECT_ID: process.env.VITE_STACK_PROJECT_ID,
        VITE_STACK_PUBLISHABLE_CLIENT_KEY: process.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
        STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY,
      },
    },
  };

  // Try to load the stack configuration
  delete require.cache[require.resolve('./stack.ts')];
  const { stackServerApp } = require('./stack.ts');

  if (stackServerApp) {
    console.log('✅ Stack Server App initialized successfully');
    console.log(`✅ Project ID: ${stackServerApp.projectId ? 'Set' : 'Missing'}`);
    console.log(`✅ Publishable Key: ${stackServerApp.publishableClientKey ? 'Set' : 'Missing'}`);
    console.log(`✅ Token Store: ${stackServerApp.tokenStore || 'Not configured'}`);
  } else {
    console.log('❌ Stack Server App initialization failed');
  }

  // Restore original import.meta
  global.import = originalImportMeta;
} catch (error) {
  console.log('❌ Stack Server App configuration error:', error.message);
}

// 7. Summary
console.log('\n📊 Validation Summary:');
console.log('======================');

const checks = [
  { name: 'Environment Variables', status: allEnvVarsPresent },
  { name: 'Database Configuration', status: !!databaseUrl },
  { name: 'Required Files', status: requiredFiles.every((f) => fs.existsSync(validatePath(__dirname, f))) },
  { name: 'RLS Policies', status: rlsFound },
];

const passedChecks = checks.filter((check) => check.status).length;
const totalChecks = checks.length;

console.log(`\n${passedChecks}/${totalChecks} checks passed\n`);

checks.forEach((check) => {
  console.log(`${check.status ? '✅' : '❌'} ${check.name}`);
});

if (passedChecks === totalChecks) {
  console.log('\n🎉 Authentication system validation PASSED!');
  console.log('The Stack Auth integration appears to be correctly configured.');
} else {
  console.log('\n⚠️  Authentication system validation INCOMPLETE');
  console.log('Some issues were found that need to be addressed.');
}

console.log('\n🔧 Next Steps:');
console.log('1. Ensure all environment variables are set in .env.local');
console.log('2. Test authentication flows in the browser');
console.log('3. Verify RLS policies work with actual user sessions');
console.log('4. Test user registration, login, and logout flows');
console.log('5. Validate session management and token handling');
