import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@stackframe/stack';
// User type from Stack Auth
interface User {
  id: string;
  email: string;
  name?: string;
}

interface ProfileData {
  display_name: string;
  bio: string;
  website: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    date_format: string;
  };
}

export const ProfilePage: React.FC = () => {
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<ProfileData>({
    display_name: '',
    bio: '',
    website: '',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      marketing: false,
    },
    preferences: {
      theme: 'dark',
      language: 'en',
      date_format: 'MM/DD/YYYY',
    },
  });

  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        display_name: user.displayName || user.email?.split('@')[0] || '',
        bio: user.profile?.bio || '',
        website: user.profile?.website || '',
      }));
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      // Update user profile using Stack Auth
      await user.update({
        displayName: profileData.display_name,
        profile: {
          bio: profileData.bio,
          website: profileData.website,
          timezone: profileData.timezone,
          notifications: profileData.notifications,
          preferences: profileData.preferences,
        },
      });

      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      // Stack Auth handles password updates differently
      // This would need to be implemented based on Stack Auth's API
      setMessage('Password update feature coming soon!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update password');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    try {
      // Stack Auth handles account deletion differently
      // This would need to be implemented based on Stack Auth's API
      setMessage('Account deletion feature coming soon!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  const handleSignOut = async () => {
    try {
      await user.signOut();
      navigate('/');
    } catch (error) {
      setError('Failed to sign out');
    }
  };

  if (!user) {
    navigate('/auth/signin');
    return null;
  }

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
          <Link to="/dashboard" className="text-2xl font-bold gradient-text">
            SoloSuccess AI
          </Link>
          <div className="flex gap-4">
            <Link
              to="/dashboard"
              className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-300"
            >
              Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold gradient-text mb-2">Profile Settings</h1>
            <p className="text-white/80">Manage your account and preferences</p>
          </div>

          {/* Profile Information */}
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Display Name</label>
                <input
                  type="text"
                  value={profileData.display_name}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, display_name: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Email</label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/20 backdrop-blur-sm text-white/60 cursor-not-allowed"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Bio</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Tell us about yourself"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Website</label>
                <input
                  type="url"
                  value={profileData.website}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Timezone</label>
                <select
                  value={profileData.timezone}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, timezone: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Notifications</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Email Notifications</h3>
                  <p className="text-white/60 text-sm">Receive updates via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={profileData.notifications.email}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Push Notifications</h3>
                  <p className="text-white/60 text-sm">Receive browser notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={profileData.notifications.push}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, push: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Marketing Emails</h3>
                  <p className="text-white/60 text-sm">Receive product updates and tips</p>
                </div>
                <input
                  type="checkbox"
                  checked={profileData.notifications.marketing}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, marketing: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Preferences</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Theme</label>
                <select
                  value={profileData.preferences.theme}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        theme: e.target.value as 'light' | 'dark' | 'auto',
                      },
                    }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Language</label>
                <select
                  value={profileData.preferences.language}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      preferences: { ...prev.preferences, language: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Account Actions</h2>

            <div className="space-y-4">
              <button
                onClick={handleChangePassword}
                className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                🔒 Change Password
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full md:w-auto bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 ml-0 md:ml-4"
              >
                🗑️ Delete Account
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="text-center">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg text-lg font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                '💾 Save Changes'
              )}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg text-sm text-center"
            >
              {message}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Delete Account</h3>
            <p className="text-white/80 mb-6">
              This action cannot be undone. All your data will be permanently deleted.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="DELETE"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-3 rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
