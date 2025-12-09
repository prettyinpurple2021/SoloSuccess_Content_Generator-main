import { StackServerApp } from '@stackframe/stack';

// Get environment variables from either import.meta.env (browser) or process.env (Node.js)
const getEnvVar = (name: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name] || '';
  }
  // Use globalThis to access process safely
  return (globalThis as any).process?.env?.[name] || '';
};

export const stackServerApp = new StackServerApp({
  tokenStore: 'cookie',
  urls: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    afterSignIn: '/',
    afterSignUp: '/',
  },
  projectId: getEnvVar('VITE_STACK_PROJECT_ID'),
  publishableClientKey: getEnvVar('VITE_STACK_PUBLISHABLE_CLIENT_KEY'),
  secretServerKey: getEnvVar('STACK_SECRET_SERVER_KEY'),
});
