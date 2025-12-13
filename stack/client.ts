// Ensure React is properly imported before Stack Auth
import React from 'react';

// Ensure React is available globally before importing Stack Auth
// This prevents "Cannot set properties of undefined (setting 'Children')" errors
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).React = React;
  // Also ensure React.Children exists
  if (React && !React.Children) {
    // This shouldn't happen, but ensure React is fully initialized
    console.warn('React.Children not available, React may not be properly initialized');
  }
}

import { StackClientApp } from '@stackframe/react';

// Check if required environment variables are available
const projectId = import.meta.env.VITE_STACK_PROJECT_ID;
const publishableKey = import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY;

if (!projectId || !publishableKey) {
  console.error(
    '❌ Stack Auth configuration is missing. Please set VITE_STACK_PROJECT_ID and VITE_STACK_PUBLISHABLE_CLIENT_KEY in your environment variables.'
  );
  // Do not throw here, as it crashes the entire app startup silently in some cases.
  // Instead, we will let the StackClientApp use dummy values or handle it later.
}

// Ensure we have strings to prevent constructor error
const safeProjectId = projectId || 'missing-project-id';
const safePublishableKey = publishableKey || 'missing-publishable-key';

// Initialize StackClientApp - React should be available now
export const stackClientApp = new StackClientApp({
  projectId: safeProjectId,
  publishableClientKey: safePublishableKey,
  tokenStore: 'cookie',
  // redirectMethod is not needed when using BrowserRouter - Stack Auth handles navigation automatically
});
