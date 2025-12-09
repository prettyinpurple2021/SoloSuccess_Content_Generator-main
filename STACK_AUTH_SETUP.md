# Stack Auth Setup Guide

## Why Your Content Isn't Rendering

Your app uses Stack Auth for authentication, but the environment variables aren't configured. Without these credentials, the `useUser()` hook fails silently, causing your app to get stuck in the loading state.

## Quick Fix Steps

### 1. Set Up Stack Auth Project

1. Go to [Stack Auth Dashboard](https://app.stack-auth.com/)
2. Create a new project or use an existing one
3. Get your credentials from the project settings

### 2. Create Environment File

Create a `.env` file in your project root with these variables:

```bash
# Stack Auth Configuration
VITE_STACK_PROJECT_ID=your_project_id_here
VITE_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_client_key_here
STACK_SECRET_SERVER_KEY=your_secret_server_key_here

# Database Configuration (if using Neon)
VITE_NEON_DATABASE_URL=your_neon_database_url_here
```

### 3. Restart Development Server

After creating the `.env` file:

```bash
npm run dev
```

## What Each Variable Does

- `VITE_STACK_PROJECT_ID`: Identifies your Stack Auth project
- `VITE_STACK_PUBLISHABLE_CLIENT_KEY`: Public key for client-side authentication
- `STACK_SECRET_SERVER_KEY`: Secret key for server-side operations

## Testing Authentication

Once configured, you should see:

1. The landing page loads properly
2. Sign in/Sign up forms work
3. Dashboard content renders after authentication

## Troubleshooting

If you still don't see content:

1. Check browser console for errors
2. Verify environment variables are loaded (check the console log in index.tsx)
3. Ensure Stack Auth project is properly configured
