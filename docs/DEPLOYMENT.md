# Deployment (Vercel)

## Overview

- Static React application built with Vite and deployed to Vercel.
- Serverless functions for API routes if needed.
- Automatic deployments from Git repository.

## Steps

1. Connect your GitHub repository to Vercel.
2. Import the project in Vercel dashboard.
3. Configure environment variables in Vercel dashboard:
   - `GEMINI_API_KEY` (optional)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_API_KEY` (optional)
   - `NEXT_PUBLIC_STACK_PROJECT_ID`
   - `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
   - `STACK_SECRET_SERVER_KEY`
4. Deploy automatically on push to main branch.

## Environments

- Preview: automatic deployments for pull requests.
- Production: automatic deployments from main branch.

## Configuration

- `vercel.json` defines build configuration and routing.
- Static files served from `dist` directory.
- SPA routing handled with fallback to `index.html`.

## Security

- Environment variables managed through Vercel dashboard.
- No secrets in client code; all sensitive data in environment variables.
- Automatic HTTPS and security headers.

## Troubleshooting

- Check Vercel build logs for deployment issues.
- Verify environment variables are set correctly.
- Ensure all dependencies are properly installed.
