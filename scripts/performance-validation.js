#!/usr/bin/env node

/**
 * Performance Validation Script
 *
 * This script tests application performance under normal usage conditions
 * including build size, load times, and resource utilization.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { validatePath } from '../utils/pathValidator.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}\n`),
};

class PerformanceValidator {
  constructor() {
    this.metrics = {
      buildSize: {},
      buildTime: 0,
      bundleAnalysis: {},
      optimizations: {},
      recommendations: [],
      startTime: Date.now(),
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async testBuildPerformance() {
    log.header('🔨 Testing Build Performance');

    try {
      // Clean previous build
      log.info('Cleaning previous build...');
      try {
        execSync('rm -rf dist', { stdio: 'pipe' });
      } catch (error) {
        // Ignore if dist doesn't exist
      }

      // Measure build time
      log.info('Running production build...');
      const buildStart = Date.now();

      try {
        const buildOutput = execSync('npm run build', {
          encoding: 'utf8',
          timeout: 180000, // 3 minute timeout
        });

        this.metrics.buildTime = Date.now() - buildStart;

        log.success(`Build completed in ${(this.metrics.buildTime / 1000).toFixed(2)}s`);

        // Analyze build output for warnings
        if (buildOutput.includes('warning') || buildOutput.includes('Warning')) {
          log.warning('Build completed with warnings');
          this.metrics.recommendations.push('Review build warnings for potential optimizations');
        }
      } catch (error) {
        log.error(`Build failed: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      log.error(`Build performance test failed: ${error.message}`);
      return false;
    }
  }

  async analyzeBundleSize() {
    log.header('📦 Analyzing Bundle Size');

    try {
      const distPath = validatePath(projectRoot, 'dist');

      if (!existsSync(distPath)) {
        log.error('Build output not found. Run build first.');
        return false;
      }

      // Analyze main bundle files
      const assetsPath = join(distPath, 'assets');
      let totalSize = 0;
      let jsSize = 0;
      let cssSize = 0;
      let assetCount = 0;

      if (existsSync(assetsPath)) {
        const files = readdirSync(assetsPath);

        files.forEach((file) => {
          const filePath = join(assetsPath, file);
          const stats = statSync(filePath);
          const size = stats.size;

          totalSize += size;
          assetCount++;

          if (file.endsWith('.js')) {
            jsSize += size;
          } else if (file.endsWith('.css')) {
            cssSize += size;
          }
        });
      }

      // Check index.html size
      const indexPath = join(distPath, 'index.html');
      let htmlSize = 0;
      if (existsSync(indexPath)) {
        htmlSize = statSync(indexPath).size;
        totalSize += htmlSize;
      }

      this.metrics.buildSize = {
        total: totalSize,
        js: jsSize,
        css: cssSize,
        html: htmlSize,
        assetCount,
      };

      // Report bundle sizes
      log.info(`Total bundle size: ${this.formatBytes(totalSize)}`);
      log.info(`JavaScript: ${this.formatBytes(jsSize)}`);
      log.info(`CSS: ${this.formatBytes(cssSize)}`);
      log.info(`HTML: ${this.formatBytes(htmlSize)}`);
      log.info(`Asset count: ${assetCount} files`);

      // Performance recommendations based on size
      if (totalSize > 5 * 1024 * 1024) {
        // 5MB
        log.warning('Bundle size is quite large (>5MB)');
        this.metrics.recommendations.push(
          'Consider code splitting and lazy loading to reduce initial bundle size'
        );
      } else if (totalSize > 2 * 1024 * 1024) {
        // 2MB
        log.warning('Bundle size is moderate (>2MB)');
        this.metrics.recommendations.push(
          'Monitor bundle size growth and consider optimization strategies'
        );
      } else {
        log.success('Bundle size is reasonable (<2MB)');
      }

      if (jsSize > 1.5 * 1024 * 1024) {
        // 1.5MB
        log.warning('JavaScript bundle is large (>1.5MB)');
        this.metrics.recommendations.push('Consider splitting JavaScript into smaller chunks');
      }

      return true;
    } catch (error) {
      log.error(`Bundle analysis failed: ${error.message}`);
      return false;
    }
  }

  async testBuildOptimizations() {
    log.header('⚡ Testing Build Optimizations');

    try {
      // Check Vite configuration
      const viteConfigPath = validatePath(projectRoot, 'vite.config.ts');
      let optimizationScore = 0;
      let maxScore = 10;

      if (existsSync(viteConfigPath)) {
        const viteContent = readFileSync(viteConfigPath, 'utf8');

        // Check for code splitting
        if (viteContent.includes('manualChunks') || viteContent.includes('splitVendorChunk')) {
          log.success('Code splitting configured');
          optimizationScore += 2;
        } else {
          log.warning('Code splitting not configured');
          this.metrics.recommendations.push('Configure code splitting for better performance');
        }

        // Check for minification
        if (viteContent.includes('minify') || viteContent.includes('terser')) {
          log.success('Minification configured');
          optimizationScore += 2;
        } else {
          log.info('Using default minification');
          optimizationScore += 1;
        }

        // Check for tree shaking
        if (viteContent.includes('treeshake') || !viteContent.includes('treeshake: false')) {
          log.success('Tree shaking enabled (default)');
          optimizationScore += 2;
        }

        // Check for source maps configuration
        if (
          viteContent.includes('sourcemap: false') ||
          viteContent.includes('sourcemap: "hidden"')
        ) {
          log.success('Source maps optimized for production');
          optimizationScore += 1;
        } else {
          log.warning('Source maps may be included in production build');
          this.metrics.recommendations.push('Disable or hide source maps in production');
        }

        // Check for asset optimization
        if (viteContent.includes('assetsInlineLimit')) {
          log.success('Asset inlining configured');
          optimizationScore += 1;
        }

        // Check for CSS optimization
        if (viteContent.includes('cssCodeSplit') || !viteContent.includes('cssCodeSplit: false')) {
          log.success('CSS code splitting enabled (default)');
          optimizationScore += 1;
        }

        // Check for build target
        if (viteContent.includes('target:') && viteContent.includes('es2015')) {
          log.success('Modern build target configured');
          optimizationScore += 1;
        }
      } else {
        log.warning('Vite configuration not found');
        maxScore = 5; // Adjust max score if no config
      }

      // Check package.json for optimization scripts
      const packageJsonPath = validatePath(projectRoot, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

        if (packageJson.scripts && packageJson.scripts['build:analyze']) {
          log.success('Bundle analysis script available');
        } else {
          log.info('Bundle analysis script not configured');
          this.metrics.recommendations.push('Add bundle analysis script for monitoring');
        }
      }

      this.metrics.optimizations = {
        score: optimizationScore,
        maxScore,
        percentage: ((optimizationScore / maxScore) * 100).toFixed(1),
      };

      log.info(
        `Optimization score: ${optimizationScore}/${maxScore} (${this.metrics.optimizations.percentage}%)`
      );

      if (optimizationScore >= maxScore * 0.8) {
        log.success('Build optimizations are well configured');
      } else if (optimizationScore >= maxScore * 0.6) {
        log.warning('Build optimizations are partially configured');
      } else {
        log.warning('Build optimizations need improvement');
      }

      return true;
    } catch (error) {
      log.error(`Build optimization test failed: ${error.message}`);
      return false;
    }
  }

  async testRuntimePerformance() {
    log.header('🚀 Testing Runtime Performance Optimizations');

    try {
      // Check for performance monitoring
      const performanceFiles = [
        'services/performanceMonitoringService.ts',
        'services/frontendPerformanceService.ts',
        'hooks/usePerformanceMonitoring.ts',
      ];

      let performanceMonitoringFound = false;
      performanceFiles.forEach((file) => {
        if (existsSync(validatePath(projectRoot, file))) {
          performanceMonitoringFound = true;
          log.success(`Performance monitoring found: ${file}`);
        }
      });

      if (!performanceMonitoringFound) {
        log.warning('Performance monitoring not implemented');
        this.metrics.recommendations.push(
          'Implement performance monitoring for production insights'
        );
      }

      // Check for lazy loading in main app
      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');

        if (appContent.includes('lazy') || appContent.includes('Suspense')) {
          log.success('Lazy loading implemented in main app');
        } else {
          log.warning('Lazy loading not found in main app');
          this.metrics.recommendations.push('Implement lazy loading for large components');
        }

        // Check for memoization
        if (appContent.includes('useMemo') || appContent.includes('useCallback')) {
          log.success('React optimization hooks used');
        } else {
          log.info('React optimization hooks not extensively used');
          this.metrics.recommendations.push(
            'Consider useMemo/useCallback for expensive operations'
          );
        }

        // Check for error boundaries
        if (appContent.includes('ErrorBoundary') || appContent.includes('componentDidCatch')) {
          log.success('Error boundaries implemented');
        } else {
          log.warning('Error boundaries not found');
          this.metrics.recommendations.push('Implement error boundaries to prevent crashes');
        }
      }

      // Check for service worker or caching
      const indexHtmlPath = validatePath(projectRoot, 'index.html');
      if (existsSync(indexHtmlPath)) {
        const indexContent = readFileSync(indexHtmlPath, 'utf8');

        if (indexContent.includes('serviceWorker') || indexContent.includes('sw.js')) {
          log.success('Service worker configured');
        } else {
          log.info('Service worker not configured');
          this.metrics.recommendations.push('Consider implementing service worker for caching');
        }
      }

      return true;
    } catch (error) {
      log.error(`Runtime performance test failed: ${error.message}`);
      return false;
    }
  }

  async testDependencyPerformance() {
    log.header('📚 Testing Dependency Performance');

    try {
      const packageJsonPath = validatePath(projectRoot, 'package.json');
      if (!existsSync(packageJsonPath)) {
        log.error('package.json not found');
        return false;
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};

      const totalDeps = Object.keys(dependencies).length;
      const totalDevDeps = Object.keys(devDependencies).length;

      log.info(`Production dependencies: ${totalDeps}`);
      log.info(`Development dependencies: ${totalDevDeps}`);

      // Check for heavy dependencies
      const heavyDependencies = ['lodash', 'moment', 'jquery', 'bootstrap', 'material-ui'];

      const foundHeavyDeps = Object.keys(dependencies).filter((dep) =>
        heavyDependencies.some((heavy) => dep.includes(heavy))
      );

      if (foundHeavyDeps.length > 0) {
        log.warning(`Heavy dependencies found: ${foundHeavyDeps.join(', ')}`);
        this.metrics.recommendations.push('Consider lighter alternatives for heavy dependencies');
      } else {
        log.success('No obviously heavy dependencies found');
      }

      // Check for modern alternatives
      const modernAlternatives = {
        moment: 'date-fns or dayjs',
        lodash: 'native ES6+ methods',
        jquery: 'native DOM methods',
        axios: 'native fetch API',
      };

      Object.keys(dependencies).forEach((dep) => {
        if (modernAlternatives[dep]) {
          log.info(`Consider ${modernAlternatives[dep]} instead of ${dep}`);
          this.metrics.recommendations.push(
            `Replace ${dep} with ${modernAlternatives[dep]} for better performance`
          );
        }
      });

      // Check for duplicate functionality
      const duplicateFunctionality = [
        ['axios', 'node-fetch'],
        ['lodash', 'ramda'],
        ['moment', 'date-fns', 'dayjs'],
      ];

      duplicateFunctionality.forEach((group) => {
        const found = group.filter((dep) => dependencies[dep]);
        if (found.length > 1) {
          log.warning(`Duplicate functionality: ${found.join(', ')}`);
          this.metrics.recommendations.push(`Remove duplicate dependencies: ${found.join(', ')}`);
        }
      });

      return true;
    } catch (error) {
      log.error(`Dependency performance test failed: ${error.message}`);
      return false;
    }
  }

  async testMemoryUsage() {
    log.header('🧠 Testing Memory Usage Patterns');

    try {
      // Check for potential memory leaks in code
      const codeFiles = ['App.tsx', 'services/geminiService.ts', 'services/neonService.ts'];

      let memoryIssues = [];

      codeFiles.forEach((file) => {
        const filePath = validatePath(projectRoot, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');

          // Check for proper cleanup in useEffect
          if (content.includes('useEffect')) {
            const effectMatches = content.match(/useEffect\([^}]+}/g) || [];
            const cleanupMatches = content.match(/return\s*\(\s*\)\s*=>/g) || [];

            if (effectMatches.length > cleanupMatches.length) {
              memoryIssues.push(`${file}: Some useEffect hooks may lack cleanup`);
            }
          }

          // Check for event listener cleanup
          if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
            memoryIssues.push(`${file}: Event listeners may not be properly cleaned up`);
          }

          // Check for timer cleanup
          if (
            (content.includes('setInterval') || content.includes('setTimeout')) &&
            !content.includes('clearInterval') &&
            !content.includes('clearTimeout')
          ) {
            memoryIssues.push(`${file}: Timers may not be properly cleaned up`);
          }
        }
      });

      if (memoryIssues.length === 0) {
        log.success('No obvious memory leak patterns found');
      } else {
        log.warning('Potential memory issues detected:');
        memoryIssues.forEach((issue) => {
          log.warning(`  ${issue}`);
        });
        this.metrics.recommendations.push('Review and fix potential memory leaks');
      }

      return true;
    } catch (error) {
      log.error(`Memory usage test failed: ${error.message}`);
      return false;
    }
  }

  generatePerformanceReport() {
    log.header('📊 Performance Validation Report');

    const duration = Date.now() - this.metrics.startTime;

    console.log(`${colors.bold}Performance Summary:${colors.reset}`);
    console.log(`⏱️  Test Duration: ${colors.blue}${(duration / 1000).toFixed(2)}s${colors.reset}`);
    console.log(
      `🔨 Build Time: ${colors.blue}${(this.metrics.buildTime / 1000).toFixed(2)}s${colors.reset}`
    );

    if (this.metrics.buildSize.total) {
      console.log(
        `📦 Bundle Size: ${colors.blue}${this.formatBytes(this.metrics.buildSize.total)}${colors.reset}`
      );
      console.log(`   JavaScript: ${this.formatBytes(this.metrics.buildSize.js)}`);
      console.log(`   CSS: ${this.formatBytes(this.metrics.buildSize.css)}`);
      console.log(`   Assets: ${this.metrics.buildSize.assetCount} files`);
    }

    if (this.metrics.optimizations.score) {
      console.log(
        `⚡ Optimization Score: ${colors.blue}${this.metrics.optimizations.score}/${this.metrics.optimizations.maxScore} (${this.metrics.optimizations.percentage}%)${colors.reset}`
      );
    }

    // Performance assessment
    console.log(`\n${colors.bold}Performance Assessment:${colors.reset}`);

    let performanceGrade = 'A';
    let performanceMessage = 'Excellent performance configuration';

    // Determine performance grade
    if (this.metrics.buildTime > 60000) {
      // > 1 minute
      performanceGrade = 'C';
      performanceMessage = 'Build time is slow';
    } else if (this.metrics.buildSize.total > 5 * 1024 * 1024) {
      // > 5MB
      performanceGrade = 'C';
      performanceMessage = 'Bundle size is too large';
    } else if (this.metrics.optimizations.percentage < 60) {
      performanceGrade = 'B';
      performanceMessage = 'Some optimizations missing';
    } else if (this.metrics.buildTime > 30000 || this.metrics.buildSize.total > 2 * 1024 * 1024) {
      performanceGrade = 'B';
      performanceMessage = 'Good performance with room for improvement';
    }

    const gradeColor =
      performanceGrade === 'A'
        ? colors.green
        : performanceGrade === 'B'
          ? colors.yellow
          : colors.red;

    console.log(`Grade: ${gradeColor}${performanceGrade}${colors.reset} - ${performanceMessage}`);

    // Recommendations
    if (this.metrics.recommendations.length > 0) {
      console.log(`\n${colors.bold}Performance Recommendations:${colors.reset}`);
      this.metrics.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Performance benchmarks
    console.log(`\n${colors.bold}Performance Benchmarks:${colors.reset}`);
    console.log(
      `Build Time: ${this.metrics.buildTime < 30000 ? '✅' : this.metrics.buildTime < 60000 ? '⚠️' : '❌'} Target: <30s (Current: ${(this.metrics.buildTime / 1000).toFixed(2)}s)`
    );

    if (this.metrics.buildSize.total) {
      console.log(
        `Bundle Size: ${this.metrics.buildSize.total < 2 * 1024 * 1024 ? '✅' : this.metrics.buildSize.total < 5 * 1024 * 1024 ? '⚠️' : '❌'} Target: <2MB (Current: ${this.formatBytes(this.metrics.buildSize.total)})`
      );
      console.log(
        `JS Bundle: ${this.metrics.buildSize.js < 1 * 1024 * 1024 ? '✅' : this.metrics.buildSize.js < 1.5 * 1024 * 1024 ? '⚠️' : '❌'} Target: <1MB (Current: ${this.formatBytes(this.metrics.buildSize.js)})`
      );
    }

    if (this.metrics.optimizations.percentage) {
      console.log(
        `Optimizations: ${this.metrics.optimizations.percentage >= 80 ? '✅' : this.metrics.optimizations.percentage >= 60 ? '⚠️' : '❌'} Target: >80% (Current: ${this.metrics.optimizations.percentage}%)`
      );
    }

    return performanceGrade !== 'C';
  }

  async runPerformanceValidation() {
    console.log(`${colors.bold}${colors.blue}⚡ Performance Validation${colors.reset}`);
    console.log(
      `${colors.blue}Testing application performance at ${new Date().toISOString()}${colors.reset}\n`
    );

    try {
      // Run all performance tests
      const buildSuccess = await this.testBuildPerformance();
      if (!buildSuccess) return false;

      await this.analyzeBundleSize();
      await this.testBuildOptimizations();
      await this.testRuntimePerformance();
      await this.testDependencyPerformance();
      await this.testMemoryUsage();

      // Generate final report
      const performanceAcceptable = this.generatePerformanceReport();

      return performanceAcceptable;
    } catch (error) {
      log.error(`Performance validation failed: ${error.message}`);
      return false;
    }
  }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new PerformanceValidator();
  validator
    .runPerformanceValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Performance validation failed:', error);
      process.exit(1);
    });
}

export default PerformanceValidator;
