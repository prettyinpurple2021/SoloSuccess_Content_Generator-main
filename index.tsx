// CRITICAL: React must be imported FIRST and made available globally
// This prevents "Cannot set properties of undefined (setting 'Children')" errors
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';

// Ensure React is available globally before any other imports
// This is critical for libraries like Stack Auth and Sentry that may access React
if (typeof window !== 'undefined') {
  (window as any).React = React;
  // Verify React is properly initialized
  if (!React.Children) {
    console.error('React.Children is not available - React may not be properly initialized');
  }
}

// Import React Router
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

// Import styles early
import './styles/holographic-theme.css';

// Import Stack Auth client (after React is global)
import { stackClientApp } from './stack/client';

// Then import Stack Auth components (which depend on React being available)
import { StackHandler, StackProvider, StackTheme } from '@stackframe/react';

// Import app components
import { HolographicThemeProvider } from './components/HolographicTheme';
import AppWithErrorHandling from './components/AppWithErrorHandling';
import { ErrorBoundaryEnhanced } from './components/ErrorBoundaryEnhanced';

// Import Sentry last (after all React dependencies)
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://f9f127c56f81953217dd8571584f1f80@o4509278644011008.ingest.us.sentry.io/4510191856254976',
  sendDefaultPii: true,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  environment: import.meta.env.MODE,
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

// Clear any existing content to prevent React root conflicts
rootElement.innerHTML = '';

// Debug environment variables
console.log('Environment check:', {
  VITE_STACK_PROJECT_ID: import.meta.env.VITE_STACK_PROJECT_ID ? 'Present' : 'Missing',
  VITE_STACK_PUBLISHABLE_CLIENT_KEY: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY
    ? 'Present'
    : 'Missing',
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
});

// Additional debug info
// Only log client-safe environment variables in development
if (import.meta.env.DEV) {
  console.log('Stack client config:', {
    projectId: import.meta.env.VITE_STACK_PROJECT_ID ? 'Present' : 'Missing',
    publishableKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY ? 'Present' : 'Missing',
    // Never log or reference server-side secrets in client code
  });
}

// Stack Auth Handler Component
function HandlerRoutes() {
  const location = useLocation();
  return <StackHandler app={stackClientApp} location={location.pathname} fullPage />;
}

// Verify React is properly loaded before creating root
if (!React || !ReactDOM) {
  const errorMsg = 'React or ReactDOM is not available. Check your dependencies.';
  console.error(errorMsg);

  // Create error UI using DOM methods to prevent XSS
  const errorContainer = document.createElement('div');
  errorContainer.style.cssText =
    'min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; text-align: center; padding: 2rem;';

  const contentDiv = document.createElement('div');

  const heading = document.createElement('h1');
  heading.style.cssText = 'font-size: 2rem; margin-bottom: 1rem;';
  heading.textContent = 'React Not Available 💀';
  contentDiv.appendChild(heading);

  const description = document.createElement('p');
  description.style.cssText = 'margin-bottom: 1rem;';
  description.textContent = errorMsg;
  contentDiv.appendChild(description);

  const reloadButton = document.createElement('button');
  reloadButton.style.cssText =
    'background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer;';
  reloadButton.textContent = 'Reload Page 🔄';
  reloadButton.addEventListener('click', () => window.location.reload());
  contentDiv.appendChild(reloadButton);

  errorContainer.appendChild(contentDiv);
  rootElement.innerHTML = '';
  rootElement.appendChild(errorContainer);

  throw new Error(errorMsg);
}

// Verify React.Children exists (this is what the error is about)
if (!React.Children) {
  console.error('React.Children is not available. React may not be properly initialized.');
  console.error('React object:', React);
  console.error('Available React properties:', Object.keys(React));
}

const root = ReactDOM.createRoot(rootElement);

// Render app with comprehensive error handling
try {
  root.render(
    <React.StrictMode>
      <Suspense
        fallback={
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            Loading...
          </div>
        }
      >
        <BrowserRouter>
          <StackProvider app={stackClientApp}>
            <StackTheme>
              <ErrorBoundaryEnhanced
                level="page"
                allowRetry={true}
                allowReload={true}
                allowReport={true}
                onError={(error, errorInfo) => {
                  console.error('Root level error:', error, errorInfo);
                  Sentry.captureException(error, {
                    contexts: {
                      react: {
                        componentStack: errorInfo.componentStack,
                      },
                    },
                  });
                }}
              >
                <HolographicThemeProvider>
                  <Routes>
                    <Route path="/handler/*" element={<HandlerRoutes />} />
                    <Route path="/*" element={<AppWithErrorHandling />} />
                  </Routes>
                </HolographicThemeProvider>
              </ErrorBoundaryEnhanced>
            </StackTheme>
          </StackProvider>
        </BrowserRouter>
      </Suspense>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  console.error('Error details:', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ReactAvailable: !!React,
    ReactChildrenAvailable: !!React?.Children,
    ReactDOMAvailable: !!ReactDOM,
  });

  Sentry.captureException(error);

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Create error UI using DOM methods to prevent XSS
  const errorContainer = document.createElement('div');
  errorContainer.style.cssText =
    'min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; text-align: center; padding: 2rem;';

  const contentDiv = document.createElement('div');

  const heading = document.createElement('h1');
  heading.style.cssText = 'font-size: 2rem; margin-bottom: 1rem;';
  heading.textContent = 'App Failed to Load 💀';
  contentDiv.appendChild(heading);

  const description = document.createElement('p');
  description.style.cssText = 'margin-bottom: 1rem;';
  description.textContent = 'A critical error occurred during app initialization.';
  contentDiv.appendChild(description);

  const errorPre = document.createElement('pre');
  errorPre.style.cssText =
    'background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; font-size: 0.875rem; text-align: left; overflow: auto; max-width: 600px;';
  errorPre.textContent = errorMessage;
  contentDiv.appendChild(errorPre);

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'margin-bottom: 1rem;';

  const reloadButton = document.createElement('button');
  reloadButton.style.cssText =
    'background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; margin-right: 0.5rem;';
  reloadButton.textContent = 'Reload Page 🔄';
  reloadButton.addEventListener('click', () => window.location.reload());
  buttonContainer.appendChild(reloadButton);

  const copyButton = document.createElement('button');
  copyButton.style.cssText =
    'background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer;';
  copyButton.textContent = 'Copy Error 📋';
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(errorMessage).then(() => alert('Error copied to clipboard!'));
  });
  buttonContainer.appendChild(copyButton);
  contentDiv.appendChild(buttonContainer);

  const errorId = document.createElement('p');
  errorId.style.cssText = 'font-size: 0.875rem; opacity: 0.8;';
  errorId.textContent = `Error ID: ${Date.now()}`;
  contentDiv.appendChild(errorId);

  const consoleHint = document.createElement('p');
  consoleHint.style.cssText = 'font-size: 0.875rem; opacity: 0.8; margin-top: 0.5rem;';
  consoleHint.textContent = 'Check the browser console for more details.';
  contentDiv.appendChild(consoleHint);

  errorContainer.appendChild(contentDiv);
  rootElement.appendChild(errorContainer);
}
