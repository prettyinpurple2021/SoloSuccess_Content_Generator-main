import React, { useState, useEffect } from 'react';
import { bloggerIntegration } from '../../services/integrations/bloggerIntegration';

interface BloggerIntegrationSetupProps {
  onComplete: (credentials: any) => void;
  onCancel: () => void;
  existingCredentials?: any;
}

interface BlogInfo {
  id: string;
  name: string;
  url: string;
}

const BloggerIntegrationSetup: React.FC<BloggerIntegrationSetupProps> = ({
  onComplete,
  onCancel,
  existingCredentials,
}) => {
  const [step, setStep] = useState<'credentials' | 'auth' | 'blogs' | 'complete'>('credentials');
  const [credentials, setCredentials] = useState({
    clientId: existingCredentials?.clientId || '',
    clientSecret: existingCredentials?.clientSecret || '',
    accessToken: existingCredentials?.accessToken || '',
    refreshToken: existingCredentials?.refreshToken || '',
    blogId: existingCredentials?.blogId || '',
  });
  const [authCode, setAuthCode] = useState('');
  const [blogs, setBlogs] = useState<BlogInfo[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<BlogInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If we have existing credentials, try to load blogs
  useEffect(() => {
    if (existingCredentials?.accessToken && existingCredentials?.blogId) {
      setStep('complete');
      loadBlogs();
    }
  }, [existingCredentials]);

  const handleGetAuthUrl = () => {
    if (!credentials.clientId) {
      setError('Please enter your Google Client ID first');
      return;
    }

    const redirectUri = `${window.location.origin}/integrations/blogger/callback`;
    const authUrl = bloggerIntegration.getAuthUrl(credentials.clientId, redirectUri);

    // Open auth URL in new window
    window.open(authUrl, 'blogger-auth', 'width=600,height=600');
    setStep('auth');
  };

  const handleAuthCodeSubmit = async () => {
    if (!authCode.trim()) {
      setError('Please enter the authorization code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const redirectUri = `${window.location.origin}/integrations/blogger/callback`;
      const tokens = await bloggerIntegration.exchangeCodeForToken(
        credentials.clientId,
        credentials.clientSecret,
        authCode,
        redirectUri
      );

      setCredentials((prev) => ({
        ...prev,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || '',
      }));

      setStep('blogs');
      await loadBlogs();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to exchange authorization code');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBlogs = async () => {
    setIsLoading(true);
    setError('');

    try {
      const userBlogs = await bloggerIntegration.listUserBlogs({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
      });

      setBlogs(userBlogs);

      // If we have a pre-selected blog, find it
      if (credentials.blogId) {
        const existingBlog = userBlogs.find((blog) => blog.id === credentials.blogId);
        if (existingBlog) {
          setSelectedBlog(existingBlog);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load blogs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlogSelect = (blog: BlogInfo) => {
    setSelectedBlog(blog);
    const finalCredentials = {
      ...credentials,
      blogId: blog.id,
    };
    setCredentials(finalCredentials);
    setStep('complete');
  };

  const handleComplete = () => {
    if (!selectedBlog) {
      setError('Please select a blog');
      return;
    }

    onComplete({
      ...credentials,
      blogId: selectedBlog.id,
      blogName: selectedBlog.name,
      blogUrl: selectedBlog.url,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Connect Your Blogger Account</h3>
        <p className="text-white/60">
          Add your Google API credentials to post to your own Blogger blogs
        </p>
      </div>

      {/* Step 1: Credentials */}
      {step === 'credentials' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Google Client ID</label>
            <input
              type="text"
              value={credentials.clientId}
              onChange={(e) => setCredentials((prev) => ({ ...prev, clientId: e.target.value }))}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              placeholder="Your Google OAuth Client ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Google Client Secret
            </label>
            <input
              type="password"
              value={credentials.clientSecret}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, clientSecret: e.target.value }))
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              placeholder="Your Google OAuth Client Secret"
            />
          </div>

          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-blue-300 mb-2">How to get your credentials:</h4>
            <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
              <li>
                Go to{' '}
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google Cloud Console
                </a>
              </li>
              <li>Create a new project or select existing one</li>
              <li>Enable the Blogger API</li>
              <li>Create OAuth 2.0 credentials</li>
              <li>
                Add{' '}
                <code className="bg-black/20 px-1 rounded">
                  {window.location.origin}/integrations/blogger/callback
                </code>{' '}
                as redirect URI
              </li>
            </ol>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGetAuthUrl}
              disabled={!credentials.clientId || !credentials.clientSecret}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Continue to Authorization
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Authorization */}
      {step === 'auth' && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-white/80 mb-4">
              A new window should have opened for Google authorization. After authorizing, copy the
              authorization code and paste it below.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Authorization Code</label>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              placeholder="Paste authorization code here"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep('credentials')}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleAuthCodeSubmit}
              disabled={!authCode.trim() || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Blog Selection */}
      {step === 'blogs' && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-white/80 mb-4">Select which blog you want to post to:</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-white/60 mt-2">Loading your blogs...</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {blogs.map((blog) => (
                <button
                  key={blog.id}
                  onClick={() => handleBlogSelect(blog)}
                  className="w-full text-left p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
                >
                  <div className="font-semibold text-white">{blog.name}</div>
                  <div className="text-sm text-white/60">{blog.url}</div>
                </button>
              ))}
            </div>
          )}

          {blogs.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-white/60">
                No blogs found. Make sure you have at least one Blogger blog.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && selectedBlog && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Ready to Post!</h4>
            <p className="text-white/60">
              Your Blogger integration is configured and ready to use.
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-lg p-4">
            <h5 className="font-semibold text-white mb-2">Selected Blog:</h5>
            <div className="text-white/80">
              <div className="font-medium">{selectedBlog.name}</div>
              <div className="text-sm text-white/60">{selectedBlog.url}</div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep('blogs')}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Change Blog
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default BloggerIntegrationSetup;
