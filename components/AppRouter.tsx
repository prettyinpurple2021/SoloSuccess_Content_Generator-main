import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { stackServerApp } from '../stack';
import App from './App';
import SignInPage from './auth/SignInPage';
import SignUpPage from './auth/SignUpPage';
import ProtectedRoute from './auth/ProtectedRoute';

const AppRouter: React.FC = () => {
  return (
    <StackProvider app={stackServerApp}>
      <StackTheme>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth/signin" element={<SignInPage />} />
            <Route path="/auth/signup" element={<SignUpPage />} />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </StackTheme>
    </StackProvider>
  );
};

export default AppRouter;
