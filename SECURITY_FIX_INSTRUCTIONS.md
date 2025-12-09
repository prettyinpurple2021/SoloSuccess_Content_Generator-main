# 🚨 URGENT: Security Fix Instructions

## Critical Security Issue Fixed

We've removed exposed secrets from `vercel.json` and `docs/PRODUCTION_ENVIRONMENT.md`. However, **you must take immediate action** to secure your application.

## Immediate Actions Required

### 1. Set Environment Variables in Vercel Dashboard

All environment variables have been removed from `vercel.json`. You must add them in the Vercel Dashboard:

1. Go to your Vercel project: https://vercel.com/dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables for **Production**, **Preview**, and **Development** environments:

#### Required Variables:

```
VITE_STACK_PROJECT_ID=your_stack_project_id
VITE_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_client_key
STACK_SECRET_SERVER_KEY=your_secret_server_key
DATABASE_URL=your_database_connection_string
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_API_KEY=your_google_api_key
GOOGLE_BLOGGER_API_KEY=your_google_blogger_api_key
INTEGRATION_ENCRYPTION_SECRET=your_encryption_secret
INTEGRATION_RATE_LIMIT_DEFAULT=100
INTEGRATION_MONITORING_ENABLED=true
INTEGRATION_LOG_LEVEL=info
```

### 2. Rotate All Exposed Credentials

**CRITICAL:** Since these credentials were exposed in version control, you must rotate ALL of them:

#### Stack Auth Credentials

1. Go to https://app.stack-auth.com/
2. Navigate to your project settings
3. Generate new **Publishable Client Key** and **Secret Server Key**
4. Update in Vercel Environment Variables

#### Database Credentials

1. Go to https://console.neon.tech/
2. Navigate to your project
3. Reset the database password
4. Generate new connection string
5. Update `DATABASE_URL` in Vercel Environment Variables

#### Google API Keys

1. Go to https://console.cloud.google.com/
2. Navigate to **APIs & Services** → **Credentials**
3. Regenerate all exposed API keys:
   - Gemini API Key
   - Google API Key
   - Google Blogger API Key
4. Update in Vercel Environment Variables

#### Integration Encryption Secret

1. Generate a new 64-character hex secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Important:** If you have existing encrypted credentials in your database, you'll need to:
   - Decrypt them with the old secret
   - Re-encrypt them with the new secret
   - Or migrate users to re-enter their credentials

### 3. Verify Git History

Check if secrets were committed to Git history:

```bash
# Check git history for exposed secrets
git log --all --full-history --source -- "*vercel.json"
git log --all --full-history --source -- "docs/PRODUCTION_ENVIRONMENT.md"
```

If secrets were committed:

1. Consider using `git-filter-repo` or BFG Repo-Cleaner to remove secrets from history
2. Force push to remote (⚠️ coordinate with team first)
3. Or create a new repository and migrate code

### 4. Update `.gitignore`

Ensure these files are in `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.production

# Vercel
.vercel

# Never commit secrets
vercel.json  # Only if it contains secrets
```

### 5. Set Up Secret Scanning

Prevent future secret exposure:

1. **GitHub Secret Scanning** (if using GitHub):
   - GitHub automatically scans for secrets in public repos
   - Enable for private repos in repository settings

2. **Pre-commit Hooks**:

   ```bash
   npm install --save-dev @gitguardian/ggshield
   # Add to package.json scripts
   "pre-commit": "ggshield scan pre-commit"
   ```

3. **CI/CD Checks**:
   - Add secret scanning to your CI/CD pipeline
   - Use tools like GitGuardian, TruffleHog, or GitHub's secret scanning

### 6. Review Access Controls

1. Review who has access to your repository
2. Remove unnecessary collaborators
3. Enable 2FA for all repository collaborators
4. Review Vercel team member access

## Verification Steps

After completing the above steps:

1. ✅ Verify all environment variables are set in Vercel Dashboard
2. ✅ Test that your application works with new credentials
3. ✅ Verify no secrets are in `vercel.json`
4. ✅ Verify documentation uses placeholders only
5. ✅ Test database connection with new credentials
6. ✅ Test API integrations with new keys

## Prevention Checklist

Going forward, always:

- ✅ Never commit secrets to version control
- ✅ Use environment variables for all secrets
- ✅ Use Vercel Environment Variables for production
- ✅ Use `.env.local` for local development (already in `.gitignore`)
- ✅ Review all commits before pushing
- ✅ Use secret scanning tools
- ✅ Rotate credentials regularly
- ✅ Use different credentials for dev/staging/production

## Need Help?

If you need assistance:

1. Review the [PROJECT_REVIEW_AND_RECOMMENDATIONS.md](./PROJECT_REVIEW_AND_RECOMMENDATIONS.md) file
2. Check Vercel documentation: https://vercel.com/docs/environment-variables
3. Review Stack Auth documentation: https://docs.stack-auth.com/

---

**Status:** ✅ Secrets removed from `vercel.json` and documentation  
**Action Required:** Set environment variables in Vercel Dashboard and rotate all credentials  
**Priority:** 🔴 CRITICAL - Complete immediately
