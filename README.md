<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SoloSuccess AI Content Planner

An AI-powered content planning and publishing platform that helps users create, schedule, and publish content across multiple social media platforms and blogs.

## Features

- 🤖 **AI Content Generation** - Powered by Google Gemini, OpenAI, and Anthropic Claude
- 📱 **Multi-Platform Publishing** - Connect and post to Twitter, LinkedIn, Facebook, Instagram, Reddit, Pinterest, and more
- 📅 **Smart Scheduling** - Schedule posts for optimal engagement times
- 🎨 **Content Templates** - Reusable templates for consistent content creation
- 📊 **Analytics** - Track performance across all your connected platforms
- 🔒 **Secure** - User credentials are encrypted and stored securely
- 👥 **User Accounts** - Each user connects their own social media accounts

## Run Locally

**Prerequisites:** Node.js, Neon PostgreSQL account, Stack Auth account

### Setup Steps

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Setup Neon PostgreSQL Database:**
   - Create a free account at [Neon](https://neon.tech)
   - Create a new project
   - Copy your connection string (it will be used as `DATABASE_URL`)
   - Run the SQL schema from `database/neon-complete-migration.sql` in your Neon SQL Editor

3. **Setup Stack Auth:**
   - Create a free account at [Stack Auth](https://app.stack-auth.com/)
   - Create a new project
   - Get your Project ID, Publishable Client Key, and Secret Server Key

4. **Configure environment variables:**
   - Copy `.env.example` to `.env.local`
   - Set your Stack Auth credentials:
     - `VITE_STACK_PROJECT_ID`
     - `VITE_STACK_PUBLISHABLE_CLIENT_KEY`
     - `STACK_SECRET_SERVER_KEY`
   - Set your database connection:
     - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - Set your AI API keys (at least one required):
     - `GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
     - `OPENAI_API_KEY` - Optional, get from [OpenAI](https://platform.openai.com/api-keys)
     - `ANTHROPIC_API_KEY` - Optional, get from [Anthropic](https://console.anthropic.com/)
   - Generate and set encryption secret:
     - `INTEGRATION_ENCRYPTION_SECRET` - Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

5. **Run the app:**
   ```bash
   npm run dev
   ```

### Environment Variables

**Required:**

- `VITE_STACK_PROJECT_ID` - Your Stack Auth project ID
- `VITE_STACK_PUBLISHABLE_CLIENT_KEY` - Your Stack Auth publishable client key
- `STACK_SECRET_SERVER_KEY` - Your Stack Auth secret server key (server-side only)
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini AI API key (for content generation)
- `INTEGRATION_ENCRYPTION_SECRET` - 64-character hex string for encrypting user credentials

**Optional:**

- `OPENAI_API_KEY` - OpenAI API key (additional AI provider)
- `ANTHROPIC_API_KEY` - Anthropic Claude API key (additional AI provider)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (for Blogger integration)
- `GOOGLE_API_KEY` - Google API key (for Blogger integration)

**Note:** Users connect their own social media accounts through OAuth flows in the app. You do NOT need to provide social media API credentials.

## User Guide

Once the app is running, users can:

1. Create an account and sign in
2. Navigate to the Integration Manager
3. Connect their own social media accounts (Twitter, LinkedIn, Facebook, etc.)
4. Use AI to generate content
5. Schedule and publish posts to their connected accounts

See [API_CREDENTIALS_SETUP.md](./API_CREDENTIALS_SETUP.md) for detailed instructions on connecting social media accounts.

## Deployment

See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for deployment instructions.

## Documentation

- [API_CREDENTIALS_SETUP.md](./API_CREDENTIALS_SETUP.md) - User guide for connecting social media accounts
- [DATABASE_SETUP_INSTRUCTIONS.md](./DATABASE_SETUP_INSTRUCTIONS.md) - Database setup guide
- [STACK_AUTH_SETUP.md](./STACK_AUTH_SETUP.md) - Stack Auth configuration guide
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Deployment instructions
- [docs/](./docs/) - Additional documentation
