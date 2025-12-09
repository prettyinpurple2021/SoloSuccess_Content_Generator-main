import React from 'react';
import { useUser } from '@stackframe/stack';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const user = useUser();

  if (user === undefined) {
    // Still loading
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (user === null) {
    // Not authenticated, redirect to sign in
    return <Navigate to="/auth/signin" replace />;
  }

  // Authenticated, render children
  return <>{children}</>;
};

export default ProtectedRoute;
