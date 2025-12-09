import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
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
        <div className="sparkle" style={{ top: '50%', left: '5%', animationDelay: '2s' }}></div>
        <div className="sparkle" style={{ top: '70%', right: '25%', animationDelay: '2.5s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold gradient-text"
          >
            SoloSuccess AI
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex gap-4"
          >
            <Link
              to="/signin"
              className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-300"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl"
        >
          <h1 className="text-6xl sm:text-8xl font-display gradient-text tracking-wider mb-8 relative">
            SoloSuccess AI
            <div className="sparkle" style={{ top: '10px', right: '10px' }}></div>
            <div className="sparkle" style={{ bottom: '10px', left: '10px' }}></div>
          </h1>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-3xl sm:text-4xl font-accent text-white mb-8 font-bold"
          >
            Your Empire. Your Vision. Your AI DreamTeam.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Transform your content creation with AI-powered planning, scheduling, and optimization.
            Build your empire with intelligent automation and strategic insights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              to="/signup"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              🚀 Start Your Journey
            </Link>
            <Link
              to="/signin"
              className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-white/20 transition-all duration-300"
            >
              Already have an account?
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="relative z-10 max-w-7xl mx-auto px-6 pb-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card text-center p-6">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-white mb-3">AI-Powered Content</h3>
            <p className="text-white/80">
              Generate compelling content ideas, blog posts, and social media content with advanced
              AI.
            </p>
          </div>

          <div className="glass-card text-center p-6">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-white mb-3">Smart Scheduling</h3>
            <p className="text-white/80">
              Automatically schedule and optimize your content for maximum engagement and reach.
            </p>
          </div>

          <div className="glass-card text-center p-6">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-3">Analytics & Insights</h3>
            <p className="text-white/80">
              Track performance and get actionable insights to grow your audience and engagement.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="relative z-10 text-center pb-8 text-white/60"
      >
        <p>&copy; 2024 SoloSuccess AI. Building your empire, one post at a time.</p>
      </motion.footer>
    </div>
  );
};

export default LandingPage;
