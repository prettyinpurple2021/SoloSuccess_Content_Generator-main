import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IntegrationType } from '../../types';

interface IntegrationCredentialsFormProps {
  platform: string;
  type: IntegrationType;
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => Promise<void>;
  isConnecting: boolean;
}

const IntegrationCredentialsForm: React.FC<IntegrationCredentialsFormProps> = ({
  platform,
  type,
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}) => {
  const [localCredentials, setLocalCredentials] = useState<Record<string, string>>(credentials);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update local credentials when props change
  useEffect(() => {
    setLocalCredentials(credentials);
  }, [credentials]);

  // Define credential fields for each platform
  interface CredentialField {
    key: string;
    label: string;
    type: 'text' | 'password';
    required: boolean;
    placeholder: string;
  }

  const getCredentialFields = (platform: string, type: IntegrationType): CredentialField[] => {
    const fields: Record<string, CredentialField[]> = {
      // Social Media Platforms
      twitter: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'text',
          required: true,
          placeholder: 'Enter your Twitter API Key',
        },
        {
          key: 'apiSecret',
          label: 'API Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Twitter API Secret',
        },
        {
          key: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Access Token',
        },
        {
          key: 'accessTokenSecret',
          label: 'Access Token Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Access Token Secret',
        },
        {
          key: 'bearerToken',
          label: 'Bearer Token',
          type: 'password',
          required: false,
          placeholder: 'Enter your Bearer Token (optional)',
        },
      ],
      linkedin: [
        {
          key: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your LinkedIn Client ID',
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your LinkedIn Client Secret',
        },
        {
          key: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Access Token',
        },
        {
          key: 'refreshToken',
          label: 'Refresh Token',
          type: 'password',
          required: false,
          placeholder: 'Enter your Refresh Token (optional)',
        },
      ],
      facebook: [
        {
          key: 'appId',
          label: 'App ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Facebook App ID',
        },
        {
          key: 'appSecret',
          label: 'App Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Facebook App Secret',
        },
        {
          key: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Access Token',
        },
        {
          key: 'pageId',
          label: 'Page ID',
          type: 'text',
          required: false,
          placeholder: 'Enter your Page ID (optional)',
        },
      ],
      instagram: [
        {
          key: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Instagram Access Token',
        },
        {
          key: 'userId',
          label: 'User ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Instagram User ID',
        },
        {
          key: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Instagram Client ID',
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Instagram Client Secret',
        },
      ],
      bluesky: [
        {
          key: 'identifier',
          label: 'Handle/Email',
          type: 'text',
          required: true,
          placeholder: 'Enter your BlueSky handle or email',
        },
        {
          key: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Enter your BlueSky password',
        },
        {
          key: 'serviceUrl',
          label: 'Service URL',
          type: 'text',
          required: false,
          placeholder: 'Enter custom service URL (optional)',
        },
      ],
      reddit: [
        {
          key: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Reddit Client ID',
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Reddit Client Secret',
        },
        {
          key: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          placeholder: 'Enter your Reddit username',
        },
        {
          key: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Enter your Reddit password',
        },
        {
          key: 'userAgent',
          label: 'User Agent',
          type: 'text',
          required: true,
          placeholder: 'Enter your User Agent string',
        },
      ],
      pinterest: [
        {
          key: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Pinterest Access Token',
        },
        {
          key: 'appId',
          label: 'App ID',
          type: 'text',
          required: false,
          placeholder: 'Enter your Pinterest App ID (optional)',
        },
        {
          key: 'appSecret',
          label: 'App Secret',
          type: 'password',
          required: false,
          placeholder: 'Enter your Pinterest App Secret (optional)',
        },
        {
          key: 'boardId',
          label: 'Board ID',
          type: 'text',
          required: false,
          placeholder: 'Enter your default Board ID (optional)',
        },
      ],
      youtube: [
        {
          key: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your YouTube Client ID',
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your YouTube Client Secret',
        },
        {
          key: 'refreshToken',
          label: 'Refresh Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Refresh Token',
        },
      ],
      // Analytics Platforms
      google_analytics: [
        {
          key: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Google Analytics Client ID',
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Google Analytics Client Secret',
        },
        {
          key: 'refreshToken',
          label: 'Refresh Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Refresh Token',
        },
        {
          key: 'viewId',
          label: 'View ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Google Analytics View ID',
        },
      ],
      facebook_analytics: [
        {
          key: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Facebook Access Token',
        },
        {
          key: 'pageId',
          label: 'Page ID',
          type: 'text',
          required: false,
          placeholder: 'Enter your Page ID (optional)',
        },
      ],
      twitter_analytics: [
        {
          key: 'bearerToken',
          label: 'Bearer Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Twitter Bearer Token',
        },
      ],
      // AI Services
      openai: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your OpenAI API Key',
        },
        {
          key: 'organizationId',
          label: 'Organization ID',
          type: 'text',
          required: false,
          placeholder: 'Enter your Organization ID (optional)',
        },
      ],
      claude: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your Claude API Key',
        },
        {
          key: 'organizationId',
          label: 'Organization ID',
          type: 'text',
          required: false,
          placeholder: 'Enter your Organization ID (optional)',
        },
      ],
      // CRM Platforms
      hubspot: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your HubSpot API Key',
        },
        {
          key: 'portalId',
          label: 'Portal ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your HubSpot Portal ID',
        },
      ],
      salesforce: [
        {
          key: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Salesforce Client ID',
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Salesforce Client Secret',
        },
        {
          key: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          placeholder: 'Enter your Salesforce Username',
        },
        {
          key: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Enter your Salesforce Password',
        },
      ],
      // Email Platforms
      mailchimp: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your Mailchimp API Key',
        },
        {
          key: 'serverPrefix',
          label: 'Server Prefix',
          type: 'text',
          required: true,
          placeholder: 'Enter your Server Prefix (e.g., us1)',
        },
      ],
      sendgrid: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your SendGrid API Key',
        },
      ],
      // Storage Platforms
      google_drive: [
        {
          key: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Google Drive Client ID',
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Google Drive Client Secret',
        },
        {
          key: 'refreshToken',
          label: 'Refresh Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Refresh Token',
        },
      ],
      dropbox: [
        {
          key: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Dropbox Access Token',
        },
      ],
    };

    return fields[platform] || [];
  };

  const credentialFields = getCredentialFields(platform, type);

  // Handle input change
  const handleInputChange = (key: string, value: string) => {
    const newCredentials = { ...localCredentials, [key]: value };
    setLocalCredentials(newCredentials);
    onCredentialsChange(newCredentials);

    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (key: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Validate credentials
  const validateCredentials = () => {
    const errors: Record<string, string> = {};

    credentialFields.forEach((field) => {
      if (field.required && !localCredentials[field.key]?.trim()) {
        errors[field.key] = `${field.label} is required`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle connect button click
  const handleConnect = async () => {
    if (!validateCredentials()) {
      return;
    }

    await onConnect();
  };

  // Get platform-specific help text
  const getHelpText = (platform: string) => {
    const helpTexts: Record<string, string> = {
      twitter:
        "Get your API credentials from the Twitter Developer Portal. You'll need to create a new app and generate API keys.",
      linkedin:
        'Create a LinkedIn app in the LinkedIn Developer Portal to get your Client ID and Client Secret.',
      facebook:
        'Create a Facebook app in the Facebook Developer Console to get your App ID and App Secret.',
      instagram:
        'Use the Instagram Basic Display API. Create an app in the Facebook Developer Console.',
      google_analytics:
        'Enable the Google Analytics Reporting API and create OAuth 2.0 credentials in the Google Cloud Console.',
      openai:
        'Get your API key from the OpenAI platform. You can find it in your account settings.',
      claude: 'Get your API key from the Anthropic platform. Sign up for access to the Claude API.',
    };

    return (
      helpTexts[platform] || "Please refer to the platform's documentation for API credentials."
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-white">
          Configure {platform.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </h3>
        <div className="text-lg text-white/70">
          {credentialFields.filter((f) => f.required).length} required field
          {credentialFields.filter((f) => f.required).length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Credential Fields */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleConnect();
        }}
        className="space-y-4"
      >
        {credentialFields.map((field, index) => (
          <motion.div
            key={field.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <label className="block text-lg font-medium text-white mb-3">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <div className="relative">
              <input
                type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                value={localCredentials[field.key] || ''}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={`w-full px-4 py-4 border border-white/20 bg-white/10 backdrop-blur-sm rounded-lg text-white text-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 ${
                  validationErrors[field.key] ? 'border-red-400 bg-red-500/20' : ''
                }`}
              />
              {field.type === 'password' && (
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(field.key)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white text-xl"
                >
                  {showSecrets[field.key] ? '👁️' : '👁️‍🗨️'}
                </button>
              )}
            </div>
            {validationErrors[field.key] && (
              <p className="mt-2 text-lg text-red-300">{validationErrors[field.key]}</p>
            )}
          </motion.div>
        ))}
      </form>

      {/* Help Text */}
      <div className="mt-8 p-6 bg-blue-500/20 border border-blue-500/50 rounded-lg">
        <div className="flex items-start">
          <div className="text-blue-300 mr-4 mt-1 text-2xl">💡</div>
          <div>
            <h4 className="text-lg font-medium text-blue-300 mb-2">How to get your credentials:</h4>
            <p className="text-lg text-blue-200">{getHelpText(platform)}</p>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 p-5 bg-green-500/20 border border-green-500/50 rounded-lg">
        <div className="flex items-center">
          <div className="text-green-300 mr-3 text-2xl">🔒</div>
          <p className="text-lg text-green-200">
            <strong>Secure:</strong> Your credentials are encrypted with AES-256-GCM encryption and
            stored securely. We never store credentials in plain text.
          </p>
        </div>
      </div>

      {/* Connect Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleConnect}
          disabled={isConnecting || Object.keys(localCredentials).length === 0}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-bold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center shadow-lg hover:shadow-xl"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
              Connecting...
            </>
          ) : (
            <>
              <span className="mr-3 text-xl">🔗</span>
              Connect Integration
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default IntegrationCredentialsForm;
