import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin to exclude server-only modules from client bundle
const excludeServerModules = () => {
  // Node.js built-ins that should be stubbed in the browser (only Node-only modules)
  // Note: crypto, url, stream have browser equivalents, so we handle them differently
  const nodeOnlyBuiltIns = [
    'fs',
    'os',
    'net',
    'tls',
    'http',
    'https',
    'child_process',
    'cluster',
    'dgram',
    'dns',
    'readline',
    'repl',
    'string_decoder',
    'vm',
    'zlib',
    'perf_hooks',
  ];

  return {
    name: 'exclude-server-modules',
    resolveId(id: string) {
      // Handle Node.js-only built-ins - stub them for browser
      if (nodeOnlyBuiltIns.includes(id)) {
        return {
          id: `\0virtual:node-builtin:${id}`,
          moduleSideEffects: false,
        };
      }

      // Handle path, util, events - provide minimal stubs
      if (id === 'path' || id === 'util' || id === 'events') {
        return {
          id: `\0virtual:node-builtin:${id}`,
          moduleSideEffects: false,
        };
      }

      // Create virtual stubs for server-only modules to prevent client-side imports
      // Check for both relative paths and absolute URL paths, and node_modules packages
      const isServerOnlyModule =
        id === 'postgres' ||
        id.includes('node_modules/postgres') ||
        id.includes('services/neonService') ||
        id.includes('services/databaseService') ||
        id.includes('services/databaseConnectionManager') ||
        id.includes('services/databasePerformanceService') ||
        id.includes('services/databaseMigrationService') ||
        id.includes('services/enhancedDatabaseService') ||
        id.includes('services/redisService') ||
        id.includes('node_modules/@upstash/redis') ||
        id.includes('node_modules/ioredis') ||
        id.startsWith('/services/databaseService') ||
        id.startsWith('/services/neonService') ||
        id.startsWith('/services/redisService');

      if (isServerOnlyModule) {
        // Return a virtual module that throws an error if imported client-side
        return {
          id: `\0virtual:${id}`,
          moduleSideEffects: false,
        };
      }
      return null;
    },
    load(id: string) {
      // Provide stubs for Node.js built-ins
      if (id.startsWith('\0virtual:node-builtin:')) {
        const builtinName = id.replace('\0virtual:node-builtin:', '');

        // Provide minimal implementations for common modules
        if (builtinName === 'path') {
          return `
            // Minimal path stub for browser
            export const join = (...args) => args.filter(Boolean).join('/').replace(/\\/+/g, '/');
            export const resolve = (...args) => '/' + args.filter(Boolean).join('/').replace(/\\/+/g, '/');
            export const dirname = (p) => p.split('/').slice(0, -1).join('/') || '/';
            export const basename = (p) => p.split('/').pop() || '';
            export const extname = (p) => {
              const parts = p.split('.');
              return parts.length > 1 ? '.' + parts.pop() : '';
            };
            export default { join, resolve, dirname, basename, extname };
          `;
        }

        if (builtinName === 'util') {
          return `
            // Minimal util stub for browser
            export const promisify = (fn) => (...args) => Promise.resolve(fn(...args));
            export const inspect = (obj) => JSON.stringify(obj, null, 2);
            export default { promisify, inspect };
          `;
        }

        if (builtinName === 'events') {
          return `
            // Minimal EventEmitter stub for browser
            export class EventEmitter {
              constructor() { this._events = {}; }
              on(event, handler) {
                if (!this._events[event]) this._events[event] = [];
                this._events[event].push(handler);
                return this;
              }
              emit(event, ...args) {
                if (this._events[event]) {
                  this._events[event].forEach(handler => handler(...args));
                }
                return this;
              }
              off(event, handler) {
                if (this._events[event]) {
                  this._events[event] = this._events[event].filter(h => h !== handler);
                }
                return this;
              }
            }
            export default EventEmitter;
          `;
        }

        // Return empty object stub for other Node.js built-ins
        return `
          // Node.js built-in module stub: ${builtinName}
          // This module is not available in the browser environment.
          console.warn('Attempted to use Node.js built-in "${builtinName}" in browser environment.');
          export default {};
        `;
      }

      // Provide stub implementations for server-only modules
      if (id.startsWith('\0virtual:')) {
        const originalId = id.replace('\0virtual:', '');
        if (
          originalId === 'postgres' ||
          originalId.includes('node_modules/postgres') ||
          originalId.includes('services/neonService') ||
          originalId.includes('services/databaseService') ||
          originalId.includes('services/databaseConnectionManager') ||
          originalId.includes('services/databasePerformanceService') ||
          originalId.includes('services/databaseMigrationService') ||
          originalId.includes('services/enhancedDatabaseService') ||
          originalId.includes('services/redisService') ||
          originalId.includes('node_modules/@upstash/redis') ||
          originalId.includes('node_modules/ioredis') ||
          originalId.startsWith('/services/databaseService') ||
          originalId.startsWith('/services/neonService') ||
          originalId.startsWith('/services/redisService')
        ) {
          // Return a stub that exports empty objects/functions to prevent runtime errors
          // This allows the code to compile but will fail gracefully if actually called
          return `
            // Server-only module stub - this should never be called in client-side code
            const error = () => {
              throw new Error(
                '${originalId} is a server-only module and cannot be used in client-side code. ' +
                'Please use the API endpoints instead (e.g., /api/*) or clientApiService.'
              );
            };
            
            // Export common patterns that might be imported
            export const db = new Proxy({}, {
              get: () => error,
              set: () => { throw error(); },
            });
            
            export const query = error;
            export const auth = { getUser: error, isAuthenticated: error };
            export const pool = error;
            export const databaseService = error;
            export const enhancedDb = error;
            export const enhancedDatabaseService = error;
            export const redisService = error;
            export const RedisService = error;
            
            // Default export
            export default error;
          `;
        }
      }
      return null;
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      // React plugin must run first to properly handle JSX and React imports
      react({
        jsxRuntime: 'automatic',
        jsxImportSource: 'react',
      }),
      // Our custom plugin runs after to handle server-only modules
      excludeServerModules(),
    ],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      target: 'es2020',
      // Only disable minification in development mode for debugging
      // In production, use terser for optimal bundle size
      minify: mode === 'production' ? 'terser' : false,
      ...(mode === 'production' && {
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            keep_classnames: true,
            keep_fnames: true,
          },
          format: {
            comments: false,
          },
        },
      }),
      rollupOptions: {
        external: (id, importer) => {
          // Don't externalize Node.js built-ins - the plugin will stub them for browser
          // Don't externalize postgres or database services - let the plugin handle them with virtual stubs
          return false;
        },
        output: {
          manualChunks: (id) => {
            // Skip database services and Redis - they should be externalized
            if (
              id.includes('services/neonService') ||
              id.includes('services/databaseService') ||
              id.includes('services/databaseConnectionManager') ||
              id.includes('services/databasePerformanceService') ||
              id.includes('services/databaseMigrationService') ||
              id.includes('services/enhancedDatabaseService') ||
              id.includes('services/redisService') ||
              id.startsWith('/services/databaseService') ||
              id.startsWith('/services/neonService') ||
              id.startsWith('/services/redisService')
            ) {
              return null; // Don't include in any chunk
            }

            // Vendor chunks with better splitting
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react') || id.includes('@stackframe/stack')) {
                return 'vendor-ui';
              }
              if (id.includes('marked') || id.includes('uuid')) {
                return 'vendor-utils';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-ai';
              }
              return 'vendor';
            }

            // Performance and monitoring (client-side only)
            if (
              id.includes('frontendPerformanceService') ||
              id.includes('performanceMonitoringService')
            ) {
              return 'performance';
            }

            // Error handling components
            if (
              id.includes('ErrorBoundary') ||
              id.includes('LoadingStateManager') ||
              id.includes('NotificationSystem') ||
              id.includes('UserFeedbackSystem') ||
              id.includes('ErrorReportingSystem') ||
              id.includes('useErrorRecovery') ||
              id.includes('useErrorState') ||
              id.includes('errorUtils') ||
              id.includes('errorHandlingService')
            ) {
              return 'error-handling';
            }

            // AI services
            if (id.includes('geminiService') || id.includes('aiLearningService')) {
              return 'ai-services';
            }
          },
          // Optimize chunk sizes
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
              : 'chunk';
            return `assets/js/[name]-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/css/i.test(ext || '')) {
              return `assets/css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
      // Performance optimizations
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'lucide-react',
        '@stackframe/react',
        // '@stackframe/stack',
        'framer-motion',
      ],
      exclude: [
        '@google/genai', // Large AI library - load on demand
      ],
      esbuildOptions: {
        // Ensure React is processed first
        target: 'es2020',
      },
    },
    // Performance improvements
    esbuild: {
      target: 'es2020',
      // Drop console and debugger only in production builds
      // Keep them in development for debugging
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    define: {
      // Only expose client-safe environment variables
      // Server-side secrets should NEVER be exposed to the client
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || ''),
      'process.env.VITE_STACK_PROJECT_ID': JSON.stringify(env.VITE_STACK_PROJECT_ID || ''),
      'process.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY': JSON.stringify(
        env.VITE_STACK_PUBLISHABLE_CLIENT_KEY || ''
      ),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      // Note: API keys, database URLs, and secret keys should NOT be exposed to client
      // They should only be used server-side in API routes
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Alias server-only packages to empty stubs for client builds
        // API routes run server-side and will use the real packages from node_modules
        ioredis: path.resolve(__dirname, 'vite.server-stub.js'),
      },
      // Ensure React is deduplicated - prevents multiple React instances
      // This is CRITICAL to prevent "Cannot set properties of undefined (setting 'Children')" errors
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  };
});
