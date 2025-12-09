import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useStackApp } from '@stackframe/stack';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const app = useStackApp();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await app.sendPasswordResetEmail(email);

      if (result.status === 'success') {
        setMessage('Check your email for the password reset link!');
      } else {
        // Handle specific error cases
        switch (result.error?.code) {
          case 'UserNotFound':
            setError('No user found with this email address.');
            break;
          case 'RateLimitExceeded':
            setError('Too many requests. Please try again later.');
            break;
          case 'InvalidEmail':
            setError('Please enter a valid email address.');
            break;
          default:
            setError(
              result.error?.message || 'Failed to send password reset email. Please try again.'
            );
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

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
            to="/signin"
            className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-300"
          >
            Back to Sign In
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
              Reset Password
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-white/80"
            >
              Enter your email address and we'll send you a link to reset your password
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="glass-card p-8"
          >
            <form className="space-y-6" onSubmit={handlePasswordReset}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg text-sm"
                >
                  {message}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  '📧 Send Reset Link'
                )}
              </button>
            </form>

            <div className="mt-6">
              <Link
                to="/signin"
                className="w-full flex justify-center py-2 px-4 border border-white/20 text-sm font-medium rounded-lg text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
              >
                ← Back to Sign In
              </Link>
            </div>
          </motion.div>

          <div className="text-center">
            <p className="text-white/60">
              Remember your password?{' '}
              <Link
                to="/signin"
                className="font-medium text-purple-400 hover:text-purple-300 transition-colors duration-300"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
