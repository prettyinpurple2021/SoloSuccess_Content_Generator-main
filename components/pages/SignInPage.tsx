import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SignIn } from '@stackframe/stack';

export const SignInPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Sparkles */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="sparkle" style={{ top: '10%', left: '10%', animationDelay: '0s' }}></div>
        <div className="sparkle" style={{ top: '20%', right: '15%', animationDelay: '0.5s' }}></div>
        <div className="sparkle" style={{ bottom: '30%', left: '20%', animationDelay: '1s' }}></div>
        <div
          className="sparkle"
          style={{ bottom: '10%', right: '10%', animationDelay: '1.5s' }}
        ></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold gradient-text">
            SoloSuccess AI
          </Link>
          <Link
            to="/auth/signup"
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl font-bold gradient-text mb-2"
            >
              Welcome Back
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-white/80"
            >
              Sign in to continue building your empire
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="glass-card p-8"
          >
            <SignIn />
          </motion.div>

          <div className="text-center">
            <p className="text-white/60">
              Don't have an account?{' '}
              <Link
                to="/auth/signup"
                className="font-medium text-purple-400 hover:text-purple-300 transition-colors duration-300"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignInPage;
