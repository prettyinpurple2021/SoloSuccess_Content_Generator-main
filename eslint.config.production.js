import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '*.min.js',
      'coverage/**',
      '.next/**',
      'out/**',
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        performance: 'readonly',
        crypto: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',

        // Node.js globals
        process: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',

        // Web APIs
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',

        // DOM APIs
        HTMLElement: 'readonly',
        HTMLImageElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',

        // Performance APIs
        PerformanceObserver: 'readonly',
        PerformanceEntry: 'readonly',
        IntersectionObserver: 'readonly',

        // Notification API
        Notification: 'readonly',

        // Crypto APIs
        CryptoKey: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',

        // TypeScript/Node types
        NodeJS: 'readonly',
        RequestInit: 'readonly',

        // React (for JSX)
        React: 'readonly',

        // Additional browser/Node globals
        self: 'readonly',
        addEventListener: 'readonly',
        removeEventListener: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        queueMicrotask: 'readonly',
        reportError: 'readonly',
        XMLHttpRequest: 'readonly',
        WebAssembly: 'readonly',
        CustomEvent: 'readonly',
        MSApp: 'readonly',
        HTMLButtonElement: 'readonly',
        PerformanceEventTiming: 'readonly',
        require: 'readonly',

        // Sentry globals (for error tracking)
        __SENTRY_DEBUG__: 'readonly',
        __SENTRY_TRACING__: 'readonly',
        __SENTRY_RELEASE__: 'readonly',
        __REACT_DEVTOOLS_GLOBAL_HOOK__: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      react: react,
    },
    rules: {
      // PRODUCTION-OPTIMIZED: Suppress all non-critical warnings
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'prefer-const': 'off',
      'no-console': 'off',
      'no-debugger': 'off',

      // KEEP ONLY CRITICAL ERRORS THAT BREAK FUNCTIONALITY
      '@typescript-eslint/no-unsafe-function-type': 'error',
      'no-useless-catch': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-inner-declarations': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'error',
      'no-unexpected-multiline': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'react-hooks/rules-of-hooks': 'error', // Keep this - breaks React
    },
  },
];
