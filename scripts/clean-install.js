#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧹 Cleaning and reinstalling dependencies...');

try {
  // Remove node_modules and package-lock.json
  console.log('Removing node_modules and package-lock.json...');

  // Remove package-lock.json first (safer)
  if (fs.existsSync('package-lock.json')) {
    try {
      fs.unlinkSync('package-lock.json');
      console.log('✅ Removed package-lock.json');
    } catch (error) {
      console.log('⚠️  Could not remove package-lock.json:', error.message);
    }
  }

  // Remove node_modules with better error handling
  if (fs.existsSync('node_modules')) {
    try {
      fs.rmSync('node_modules', { recursive: true, force: true });
      console.log('✅ Removed node_modules directory');
    } catch (error) {
      console.log('⚠️  Could not remove node_modules:', error.message);
      console.log('   This might be due to locked files. Trying alternative method...');

      // Try using platform-specific commands as fallback
      const isWindows = process.platform === 'win32';
      try {
        if (isWindows) {
          execSync('rmdir /s /q node_modules', { stdio: 'inherit', shell: true });
        } else {
          execSync('rm -rf node_modules', { stdio: 'inherit' });
        }
        console.log('✅ Removed node_modules using fallback method');
      } catch (fallbackError) {
        console.log('❌ Could not remove node_modules with any method');
        console.log('   Please manually delete the node_modules folder and run npm install');
        throw fallbackError;
      }
    }
  }

  // Clear npm cache
  console.log('Clearing npm cache...');
  execSync('npm cache clean --force', { stdio: 'inherit' });

  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Verify React version
  console.log('Verifying React version...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const reactVersion = packageJson.dependencies.react;
  console.log(`✅ React version: ${reactVersion}`);

  // Check if React 19 is still present
  try {
    const reactPackageJson = JSON.parse(fs.readFileSync('node_modules/react/package.json', 'utf8'));
    if (reactPackageJson.version.startsWith('19')) {
      console.log('❌ React 19 detected! This will cause compatibility issues.');
      console.log('Please run: npm install react@18.3.1 react-dom@18.3.1 --save');
    } else {
      console.log(`✅ Correct React version installed: ${reactPackageJson.version}`);
    }
  } catch (error) {
    console.log('Could not verify React version in node_modules');
  }

  console.log('🎉 Clean install completed!');
  console.log('You can now run: npm run build');
} catch (error) {
  console.error('❌ Error during clean install:', error.message);
  process.exit(1);
}
