# 🚀 Platform-Specific Content Adaptation Setup Guide

## Overview

This guide will help you set up the platform-specific content adaptation system that automatically optimizes your content for different social media platforms.

## Prerequisites

- ✅ Neon PostgreSQL database configured
- ✅ Stack Auth authentication set up
- ✅ Integration Manager components created
- ✅ Content adaptation services implemented

## Step-by-Step Setup

### 1. Database Setup (Required)

Run the database migrations to ensure all integration tables exist:

**Using Neon PostgreSQL (Recommended):**

1. Go to your Neon dashboard: https://console.neon.tech/
2. Navigate to your project
3. Go to SQL Editor
4. Run the SQL files from the `database/` folder in order:
   - `database/neon-schema.sql` (base schema)
   - `database/neon-integration-schema-migration.sql` (integration tables)
   - `database/performance-optimization.sql` (optional optimizations)

**Or run the complete migration:**

- `database/neon-complete-migration.sql` (includes everything)

### 2. Environment Variables Configuration

Make sure your `.env.local` file is properly configured with:

- ✅ Stack Auth credentials (Project ID, Client Key, Server Key)
- ✅ Neon database connection string
- ✅ AI API keys (at least Gemini API key)
- ✅ Integration encryption secret
- ✅ Rate limiting settings (optional)
- ✅ Monitoring configuration (optional)

See the main README.md for detailed environment variable setup instructions.

### 3. API Keys Setup (For App Owner Only)

**As the app owner, you only need to provide AI API keys for content generation.**

#### Gemini API Setup (Required)

1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Add it to your environment variables as `GEMINI_API_KEY`

#### Optional: Additional AI Services

- **OpenAI**: Get from https://platform.openai.com/api-keys
- **Anthropic Claude**: Get from https://console.anthropic.com/

### 4. User Social Media Integration Setup

**Important:** Users connect their own social media accounts through OAuth flows in the app. You do NOT need to provide social media API credentials.

Users will:

1. Sign up and create an account
2. Navigate to Integration Manager in the app
3. Click "Connect" on the platform they want to use
4. Authenticate with their own accounts through OAuth
5. Their credentials are encrypted and stored securely (only they can access them)

See [API_CREDENTIALS_SETUP.md](./API_CREDENTIALS_SETUP.md) for the user guide on connecting social media accounts.

### 5. Integration Manager UI Setup

#### Add Smart Posting to Your App

Add the SmartPosting component to your main app:

```tsx
// In your main App.tsx or wherever you want the posting feature
import SmartPosting from './components/integrations/SmartPosting';

// Add this to your app
<SmartPosting
  availableIntegrations={yourIntegrations}
  onPostSuccess={(results) => console.log('Posts successful:', results)}
  onPostError={(error) => console.error('Post error:', error)}
/>;
```

#### Integration with Existing Integration Manager

The SmartPosting component works with your existing Integration Manager:

```tsx
// In your IntegrationManager.tsx
import SmartPosting from './SmartPosting';

// Add a new tab for Smart Posting
const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'add', label: 'Add Integration', icon: '➕' },
  { id: 'configure', label: 'Configure', icon: '⚙️' },
  { id: 'monitor', label: 'Monitor', icon: '📈' },
  { id: 'smart-posting', label: 'Smart Posting', icon: '🚀' }, // Add this
];
```

### 6. Usage Instructions

#### Basic Usage

1. **Open Smart Posting**: Navigate to the Smart Posting tab
2. **Write Content**: Enter your content in the text area
3. **Select Platforms**: Choose which platforms to post to
4. **Preview**: Click "Show Preview" to see how content will look on each platform
5. **Post**: Click "Post to X Platforms" to publish

#### Advanced Features

- **Character Limits**: Each platform automatically enforces its character limit
- **Content Adaptation**: Content is automatically optimized for each platform
- **Real-time Validation**: See issues and suggestions before posting
- **Batch Posting**: Post to multiple platforms simultaneously

### 7. Platform-Specific Character Limits

| Platform  | Character Limit | Style                  |
| --------- | --------------- | ---------------------- |
| Twitter/X | 280             | Concise, punchy        |
| LinkedIn  | 1300            | Professional, detailed |
| Facebook  | 63,206          | Conversational         |
| Instagram | 2200            | Visual-focused         |
| BlueSky   | 300             | Tech-savvy             |
| Reddit    | 40,000          | Discussion-oriented    |
| Pinterest | 500             | SEO-optimized          |

### 8. Content Adaptation Examples

**Original Content:**

```
"Just launched our amazing new product! It's going to revolutionize the industry. Check it out and let us know what you think! #innovation #technology #startup"
```

**Platform Adaptations:**

**Twitter (280 chars):**

```
"Just launched our amazing new product! It's going to revolutionize the industry. Check it out and let us know what you think! #innovation #technology #startup What do you think?"
```

**LinkedIn (1300 chars):**

```
"We are excited to announce the launch of our outstanding new product! This innovative solution will transform the industry landscape. We invite you to explore it and share your insights. #innovation #technology"
```

**Instagram (2200 chars):**

```
"Just launched our amazing new product! It's going to revolutionize the industry. Check it out and let us know what you think! ✨ #innovation #technology #startup #productlaunch #revolutionary #industry #tech #innovation #startup #product #launch #amazing #revolutionize #checkitout #newproduct #industry #technology #startup #innovation #productlaunch"
```

### 9. Testing Your Setup

#### Test Content Adaptation

1. Create a test post with various elements (hashtags, mentions, links)
2. Select multiple platforms
3. Check the preview to see adaptations
4. Verify character limits are enforced

#### Test Platform Integration

1. Set up at least one platform integration
2. Try posting to that platform
3. Check if the post appears correctly
4. Verify content adaptation worked

### 10. Troubleshooting

#### Common Issues

**"Content exceeds platform limit"**

- The system automatically truncates content
- Check the preview to see how content is adapted

**"No valid integrations found"**

- Make sure you've added integrations for selected platforms
- Verify credentials are correct in Stack Auth and Neon database

**"Validation failed"**

- Check the preview tab for specific issues
- Adjust content based on suggestions

**API Errors**

- Verify users' connected accounts have proper permissions
- Check if OAuth tokens need to be refreshed
- Ensure rate limits aren't exceeded

### 11. Security Considerations

- ✅ User credentials are encrypted using AES-256-GCM
- ✅ Credentials stored securely in Neon database
- ✅ Each user can only access their own integrations
- ✅ Rate limiting prevents API abuse
- ✅ Error handling prevents credential exposure
- ✅ OAuth tokens are automatically refreshed

### 12. Next Steps

1. **Start the app** and create your first user account
2. **Connect your own social media accounts** through the Integration Manager
3. **Test content generation** with AI
4. **Create and schedule your first posts**
5. **Monitor results and adjust as needed**

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify your Neon database connection
3. Ensure Stack Auth is configured correctly
4. Verify users have connected their social media accounts
5. Check platform-specific API documentation for OAuth setup

## Success Metrics

You'll know it's working when:

- ✅ Content previews show different adaptations per platform
- ✅ Character limits are enforced correctly
- ✅ Posts appear on platforms with proper formatting
- ✅ No validation errors in the preview

---

**Ready to start posting across multiple platforms with automatic optimization!** 🚀
