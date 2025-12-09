# Deployment Information

## ⚠️ IMPORTANT: This Project Deploys to Vercel ONLY

This project is configured to deploy **exclusively to Vercel**. Do not deploy to Render or any other platform.

## Current Deployment Platform

- **Platform:** Vercel
- **Deployment Type:** Automatic on push to `main` branch
- **Framework:** Vite (detected automatically by Vercel)

## Why Vercel?

- ✅ Native Vite support (no Docker needed)
- ✅ Serverless functions for API routes
- ✅ Automatic deployments on git push
- ✅ Edge network for fast global CDN
- ✅ Built-in environment variable management
- ✅ Free tier with generous limits

## Files NOT Used for Deployment

The following files are present but **NOT used** for Vercel deployment:

- `Dockerfile` - Not needed (Vercel uses native Vite)
- `nginx.conf` - Not needed (Vercel handles routing)
- `.github/workflows/docker-build.yml` - Disabled (Vercel handles builds)

These files may trigger other platforms (like Render) to attempt deployments. If you see deployments to other platforms, follow the steps in `DISABLE_RENDER_DEPLOYMENT.md`.

## Deployment Configuration

### Vercel Configuration

- **Config File:** `vercel.json`
- **Build Command:** `npm run build` (automatic)
- **Output Directory:** `dist` (automatic)
- **Framework:** Vite (detected automatically)

### Environment Variables

All environment variables are managed in the Vercel Dashboard:

1. Go to your Vercel project
2. Navigate to **Settings** → **Environment Variables**
3. Add all required variables (see `SECURITY_FIX_INSTRUCTIONS.md`)

## Disabling Other Platforms

If Render or another platform is trying to deploy:

1. **Render:** Follow `DISABLE_RENDER_DEPLOYMENT.md`
2. **Other Platforms:** Disable auto-deploy in their dashboard
3. **GitHub Webhooks:** Remove any webhooks pointing to other platforms

## Verifying Deployment

To verify only Vercel is deploying:

1. Check Vercel Dashboard: https://vercel.com/dashboard
2. Check GitHub Actions: Should only see CI workflows, not deployment workflows
3. Check other platforms: Make sure auto-deploy is disabled

## Need Help?

- Vercel Deployment: See `VERCEL_DEPLOYMENT_GUIDE.md`
- Disable Render: See `DISABLE_RENDER_DEPLOYMENT.md`
- Troubleshooting: See `VERCEL_TROUBLESHOOTING.md`
