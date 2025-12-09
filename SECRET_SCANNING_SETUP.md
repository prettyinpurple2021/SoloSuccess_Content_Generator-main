# Secret Scanning Setup Guide

This guide explains how to set up secret scanning for your repository to prevent accidental credential exposure.

## ✅ Completed Setup

### 1. GitHub Actions Secret Scanning

- **File:** `.github/workflows/secret-scanning.yml`
- **Status:** ✅ Configured
- **Tools:**
  - TruffleHog (automated scanning on push/PR)
  - Basic pattern matching for common secret patterns

### 2. Pre-commit Hooks

- **Tool:** TruffleHog (via npm script)
- **Status:** ✅ Configured
- **Location:** `.husky/pre-commit`

## How It Works

### GitHub Actions

The workflow automatically runs on:

- Every push to `main` or `develop` branches
- Every pull request
- Daily at 2 AM UTC (scheduled scan)

### Pre-commit Hooks

Before each commit, TruffleHog scans your staged files for secrets. If secrets are detected, the commit is blocked.

## Manual Setup Steps

### 1. Enable GitHub Secret Scanning (One-time setup)

1. Go to your GitHub repository
2. Click on **Settings** → **Security** → **Code security and analysis**
3. Under **"Secret scanning"**, click **Enable**
4. Optionally enable **"Push protection"** to block pushes containing secrets

### 2. Install TruffleHog for Local Scanning (Optional)

If you want to scan locally before committing:

```bash
# Install TruffleHog CLI (macOS/Linux)
brew install trufflesecurity/trufflesecurity/trufflehog

# Or using Docker
docker pull trufflesecurity/trufflehog:latest

# Scan your repository
trufflehog git file://. --only-verified
```

### 3. Test the Setup

```bash
# Test pre-commit hook
git add .
git commit -m "test: verify secret scanning"

# Test GitHub Actions (push to trigger)
git push origin main
```

## Using the Pre-commit Hook

The pre-commit hook automatically runs when you commit. It will:

1. Run lint-staged (ESLint, Prettier)
2. Run TruffleHog secret scanning (if installed)
3. Block the commit if secrets are detected

## GitHub Actions Workflow

The workflow includes two jobs:

1. **TruffleHog Secret Scan**: Scans the entire codebase for verified secrets
2. **GitHub Secret Scanning Alert**: Checks for common secret patterns (basic validation)

## Troubleshooting

### Pre-commit hook not running

```bash
# Reinstall husky hooks
npm run prepare

# Make sure the hook is executable
chmod +x .husky/pre-commit
```

### TruffleHog not found

The pre-commit hook uses `npx` to run TruffleHog, so it will automatically download it if not installed locally. Alternatively, install it globally:

```bash
npm install -g @trufflesecurity/trufflehog
```

### False Positives

If TruffleHog flags something that's not a secret:

1. Use the `--ignore` flag in the workflow
2. Add the pattern to `.trufflehogignore` file
3. Or use `ggshield` (GitGuardian) which has better false positive handling

## Alternative: GitGuardian (Recommended for Production)

GitGuardian offers better false positive handling and a free tier:

```bash
# Install GitGuardian CLI
npm install --save-dev @gitguardian/ggshield

# Add to package.json scripts
"scan:secrets": "ggshield scan pre-commit"
```

Then update `.husky/pre-commit` to use `ggshield` instead of TruffleHog.

## Best Practices

1. **Never commit secrets** - Always use environment variables
2. **Rotate exposed secrets immediately** - If a secret is found, rotate it right away
3. **Use secret scanning in CI/CD** - Catch secrets before they reach production
4. **Review alerts promptly** - GitHub will notify you if secrets are detected
5. **Use different credentials for dev/staging/production**

## Monitoring

- **GitHub Security Tab**: Check for secret scanning alerts
- **GitHub Actions**: Monitor workflow runs for secret scan results
- **Email Notifications**: GitHub will email you if secrets are detected

## Resources

- [GitHub Secret Scanning Documentation](https://docs.github.com/en/code-security/secret-scanning)
- [TruffleHog Documentation](https://docs.trufflesecurity.com/)
- [GitGuardian Documentation](https://docs.gitguardian.com/)

---

**Note:** Since your repository is private, GitHub Secret Scanning will automatically scan for secrets. The GitHub Actions workflow provides additional protection and uses TruffleHog for more thorough scanning.
