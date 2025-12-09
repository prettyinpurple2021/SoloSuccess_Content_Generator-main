import React from 'react';
import { SignIn, SignUp, UserButton } from '@stackframe/stack';
import { motion } from 'framer-motion';

interface AuthComponentProps {
  onAuthSuccess?: () => void;
}

export const AuthComponent: React.FC<AuthComponentProps> = ({ onAuthSuccess }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Welcome to SoloSuccess AI</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your content planning dashboard
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
          <SignIn />
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthComponent;
