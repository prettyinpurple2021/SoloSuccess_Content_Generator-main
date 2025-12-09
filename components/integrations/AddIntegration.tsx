import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreateIntegrationData, IntegrationType } from '../../types';

interface AddIntegrationProps {
  onCreateIntegration: (data: CreateIntegrationData) => Promise<void>;
  isLoading: boolean;
}

const AddIntegration: React.FC<AddIntegrationProps> = ({ onCreateIntegration, isLoading }) => {
  const [selectedType, setSelectedType] = useState<IntegrationType>('social_media');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [integrationName, setIntegrationName] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);

  const availableIntegrations = {
    social_media: [
      {
        id: 'twitter',
        name: 'Twitter/X',
        icon: '🐦',
        description: 'Post tweets and sync engagement data',
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        icon: '💼',
        description: 'Share professional content and network',
      },
      { id: 'facebook', name: 'Facebook', icon: '📘', description: 'Post to pages and groups' },
      { id: 'instagram', name: 'Instagram', icon: '📷', description: 'Share photos and stories' },
      { id: 'tiktok', name: 'TikTok', icon: '🎵', description: 'Create and share short videos' },
      {
        id: 'blogger',
        name: 'Blogger',
        icon: '📝',
        description: 'Publish blog posts to your Blogger account',
      },
    ],
    analytics: [
      {
        id: 'google_analytics',
        name: 'Google Analytics',
        icon: '📊',
        description: 'Track website and content performance',
      },
      {
        id: 'facebook_analytics',
        name: 'Facebook Analytics',
        icon: '📈',
        description: 'Monitor social media performance',
      },
      {
        id: 'twitter_analytics',
        name: 'Twitter Analytics',
        icon: '📊',
        description: 'Track tweet performance and engagement',
      },
    ],
    ai_service: [
      { id: 'openai', name: 'OpenAI', icon: '🤖', description: 'Advanced AI content generation' },
      { id: 'claude', name: 'Claude', icon: '🧠', description: 'Anthropic AI assistant' },
    ],
    crm: [
      {
        id: 'salesforce',
        name: 'Salesforce',
        icon: '☁️',
        description: 'Customer relationship management',
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        icon: '🟠',
        description: 'Inbound marketing and sales platform',
      },
    ],
    email: [
      { id: 'mailchimp', name: 'Mailchimp', icon: '🐵', description: 'Email marketing automation' },
      { id: 'sendgrid', name: 'SendGrid', icon: '📧', description: 'Email delivery service' },
    ],
    storage: [
      {
        id: 'google_drive',
        name: 'Google Drive',
        icon: '📁',
        description: 'Cloud storage and file sharing',
      },
      { id: 'dropbox', name: 'Dropbox', icon: '📦', description: 'File storage and collaboration' },
    ],
  };

  const getCredentialFields = (platform: string) => {
    const fields: { [key: string]: { label: string; type: string; placeholder: string }[] } = {
      twitter: [
        { label: 'API Key', type: 'password', placeholder: 'Enter your Twitter API key' },
        { label: 'API Secret', type: 'password', placeholder: 'Enter your Twitter API secret' },
        { label: 'Access Token', type: 'password', placeholder: 'Enter your access token' },
        {
          label: 'Access Token Secret',
          type: 'password',
          placeholder: 'Enter your access token secret',
        },
        {
          label: 'Bearer Token',
          type: 'password',
          placeholder: 'Enter your bearer token (optional)',
        },
      ],
      linkedin: [
        { label: 'Client ID', type: 'text', placeholder: 'Enter your LinkedIn client ID' },
        {
          label: 'Client Secret',
          type: 'password',
          placeholder: 'Enter your LinkedIn client secret',
        },
        { label: 'Access Token', type: 'password', placeholder: 'Enter your access token' },
        {
          label: 'Refresh Token',
          type: 'password',
          placeholder: 'Enter your refresh token (optional)',
        },
      ],
      facebook: [
        { label: 'App ID', type: 'text', placeholder: 'Enter your Facebook app ID' },
        { label: 'App Secret', type: 'password', placeholder: 'Enter your Facebook app secret' },
        { label: 'Access Token', type: 'password', placeholder: 'Enter your access token' },
        { label: 'Page ID', type: 'text', placeholder: 'Enter your page ID (optional)' },
      ],
      instagram: [
        {
          label: 'Access Token',
          type: 'password',
          placeholder: 'Enter your Instagram access token',
        },
        { label: 'User ID', type: 'text', placeholder: 'Enter your Instagram user ID' },
        { label: 'Client ID', type: 'text', placeholder: 'Enter your Instagram client ID' },
        {
          label: 'Client Secret',
          type: 'password',
          placeholder: 'Enter your Instagram client secret',
        },
      ],
      google_analytics: [
        { label: 'Client ID', type: 'text', placeholder: 'Enter your Google Analytics client ID' },
        {
          label: 'Client Secret',
          type: 'password',
          placeholder: 'Enter your Google Analytics client secret',
        },
        { label: 'Refresh Token', type: 'password', placeholder: 'Enter your refresh token' },
        { label: 'View ID', type: 'text', placeholder: 'Enter your view ID' },
      ],
      openai: [
        { label: 'API Key', type: 'password', placeholder: 'Enter your OpenAI API key' },
        {
          label: 'Organization ID',
          type: 'text',
          placeholder: 'Enter your organization ID (optional)',
        },
      ],
      claude: [
        { label: 'API Key', type: 'password', placeholder: 'Enter your Claude API key' },
        {
          label: 'Organization ID',
          type: 'text',
          placeholder: 'Enter your organization ID (optional)',
        },
      ],
    };
    return fields[platform] || [];
  };

  const handleConnect = async () => {
    if (!selectedPlatform || !integrationName) {
      alert('Please select a platform and enter an integration name');
      return;
    }

    const credentialFields = getCredentialFields(selectedPlatform);
    const requiredFields = credentialFields.filter(
      (field) => field.type === 'password' || field.label.includes('ID')
    );

    for (const field of requiredFields) {
      if (!credentials[field.label]) {
        alert(`Please enter ${field.label}`);
        return;
      }
    }

    setIsConnecting(true);
    try {
      await onCreateIntegration({
        name: integrationName,
        type: selectedType,
        platform: selectedPlatform,
        credentials: credentials,
      });

      // Reset form
      setSelectedPlatform('');
      setIntegrationName('');
      setCredentials({});
    } catch (error) {
      console.error('Failed to create integration:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-8">
      {/* Integration Type Selection */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Select Integration Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(availableIntegrations).map(([type, platforms]) => (
            <motion.button
              key={type}
              onClick={() => {
                setSelectedType(type as IntegrationType);
                setSelectedPlatform('');
              }}
              className={`p-4 border-2 rounded-xl text-left transition-all duration-300 ${
                selectedType === type
                  ? 'border-purple-400 bg-purple-400/20 text-white'
                  : 'border-white/20 bg-white/10 text-white/70 hover:border-white/40 hover:bg-white/15'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">
                  {type === 'social_media'
                    ? '📱'
                    : type === 'analytics'
                      ? '📊'
                      : type === 'ai_service'
                        ? '🤖'
                        : type === 'crm'
                          ? '👥'
                          : type === 'email'
                            ? '📧'
                            : '💾'}
                </span>
                <div>
                  <div className="font-medium capitalize">{type.replace('_', ' ')}</div>
                  <div className="text-sm opacity-70">{platforms.length} integrations</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Platform Selection */}
      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Select Platform</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableIntegrations[selectedType].map((platform) => (
              <motion.div
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                  selectedPlatform === platform.id
                    ? 'border-blue-400 bg-blue-400/20 text-white'
                    : 'border-white/20 bg-white/10 text-white/70 hover:border-white/40 hover:bg-white/15'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-3xl">{platform.icon}</span>
                  <div>
                    <div className="font-medium">{platform.name}</div>
                    <div className="text-sm opacity-70">{platform.description}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Integration Name */}
      {selectedPlatform && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Integration Details</h3>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Integration Name
              </label>
              <input
                type="text"
                value={integrationName}
                onChange={(e) => setIntegrationName(e.target.value)}
                placeholder="Enter a name for this integration"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Credentials Form */}
      {selectedPlatform && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Credentials</h3>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getCredentialFields(selectedPlatform).map((field, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={credentials[field.label] || ''}
                    onChange={(e) => handleCredentialChange(field.label, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Connect Button */}
      {selectedPlatform && integrationName && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center"
        >
          <button
            onClick={handleConnect}
            disabled={isLoading || isConnecting}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3"
          >
            {isLoading || isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>🔗</span>
                <span>Connect Integration</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Help Text */}
      <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-blue-300 mb-2">💡 Need Help?</h4>
        <p className="text-blue-200/80 mb-2">
          To get started with {selectedPlatform || 'your integration'}, you'll need to:
        </p>
        <ol className="list-decimal list-inside text-blue-200/80 space-y-1">
          <li>Create a developer account with the platform</li>
          <li>Generate API keys or access tokens</li>
          <li>Copy the credentials to the form above</li>
          <li>Test the connection to ensure everything works</li>
        </ol>
      </div>
    </div>
  );
};

export default AddIntegration;
