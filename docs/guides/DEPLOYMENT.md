# Scaffld - Deployment Guide

**Last Updated**: February 11, 2026
**Version**: 2.0
**Platforms**: Firebase Hosting (Web), EAS (Mobile - In Development)

---

## Table of Contents

1. [Overview](#overview)
2. [Web Application Deployment](#web-application-deployment)
3. [Firebase Functions Deployment](#firebase-functions-deployment)
4. [Environment Management](#environment-management)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Mobile App Deployment](#mobile-app-deployment)
7. [Monitoring & Rollback](#monitoring--rollback)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Deployment Stack

**Web Application**:
- **Hosting**: Firebase Hosting
- **CDN**: Firebase CDN (automatic)
- **SSL**: Automatic HTTPS
- **Domains**: Custom domain support

**Backend**:
- **Functions**: Firebase Cloud Functions
- **Database**: Firestore (managed)
- **Storage**: Firebase Storage (managed)

**Mobile (In Development)**:
- **Builds**: EAS Build (Expo)
- **Distribution**: App Store, Google Play
- **OTA Updates**: EAS Update

### Deployment Environments

| Environment | Purpose | URL | Branch |
|-------------|---------|-----|--------|
| **Development** | Local testing | localhost:5173 | * |
| **Staging** | Pre-production testing | staging.scaffld.app | develop |
| **Production** | Live application | app.scaffld.app | master |

---

## Web Application Deployment

### Prerequisites

**Install Firebase CLI**:
```bash
npm install -g firebase-tools

# Verify installation
firebase --version
```

**Login to Firebase**:
```bash
firebase login

# This will open browser for authentication
# Select your Google account associated with Firebase project
```

**Initialize Firebase** (First-time only):
```bash
# In project root
firebase init

# Select:
# - Hosting
# - Functions (if deploying functions)
# - Use existing project: Select your Firebase project
# - Public directory: dist
# - Configure as SPA: Yes
# - Set up automatic builds: No (we handle this manually)
```

---

### Deployment Process

#### Step 1: Pre-Deployment Checklist

```bash
# 1. Ensure you're on the correct branch
git branch  # Should show master or release branch

# 2. Pull latest changes
git pull origin master

# 3. Install dependencies (if needed)
npm install

# 4. Run linter
npm run lint

# 5. Run tests (if configured)
npm test

# 6. Create production build
npm run build

# 7. Verify build output
ls -la dist/
# Should see: index.html, assets/, etc.
```

#### Step 2: Build for Production

```bash
# Build with production environment
npm run build

# Output:
# vite v4.x.x building for production...
# ✓ 234 modules transformed.
# dist/index.html                    0.45 kB
# dist/assets/index.abc123.js      142.25 kB
# dist/assets/index.abc123.css      12.34 kB
# ✓ built in 3.45s
```

**Build verification**:
```bash
# Preview production build locally
npm run preview

# Test in browser at http://localhost:4173
# Verify all functionality works
# Check for console errors
```

#### Step 3: Deploy to Firebase

**Deploy everything**:
```bash
firebase deploy

# Output:
# === Deploying to 'your-project'...
# i  deploying hosting
# ✔  hosting: 124 files uploaded successfully
# ✔  Deploy complete!
#
# Hosting URL: https://your-project.web.app
```

**Deploy only hosting**:
```bash
firebase deploy --only hosting

# Faster if you haven't changed functions
```

**Deploy only functions**:
```bash
firebase deploy --only functions

# Only deploys Firebase Cloud Functions
```

#### Step 4: Verify Deployment

```bash
# Get hosting URL
firebase hosting:sites:list

# Test deployment
# 1. Open production URL in browser
# 2. Test critical user flows:
#    - Login/logout
#    - Create quote
#    - Create invoice
#    - Client portal access
# 3. Check browser console for errors
# 4. Verify Firebase connection (check Network tab)
```

---

### Production Deployment Checklist

**Before Deployment**:
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Linter passing
- [ ] Build succeeds locally
- [ ] Tested in staging environment
- [ ] Database migrations completed (if any)
- [ ] Environment variables updated
- [ ] Backup current production (if critical)

**During Deployment**:
- [ ] Build production assets
- [ ] Deploy to Firebase
- [ ] Verify deployment URL
- [ ] Check for errors in Firebase console

**After Deployment**:
- [ ] Test critical user flows
- [ ] Monitor error logs for 15-30 minutes
- [ ] Check Firebase Analytics for unusual patterns
- [ ] Notify team of successful deployment
- [ ] Tag release in Git

**Deployment command sequence**:
```bash
# Complete deployment workflow
git checkout master
git pull origin master
npm install
npm run lint
npm run build
firebase deploy --only hosting
# Test at production URL
git tag v1.2.3
git push origin v1.2.3
```

---

## Firebase Functions Deployment

### Setup Functions

**Navigate to functions directory**:
```bash
cd functions
npm install
```

**Local testing**:
```bash
# Start Firebase emulators
firebase emulators:start

# Functions will run at http://localhost:5001
```

### Deploy Functions

**Deploy all functions**:
```bash
firebase deploy --only functions

# Output:
# i  deploying functions
# ✔  functions[createPaymentIntent]: Successful update operation.
# ✔  functions[handleStripeWebhook]: Successful update operation.
# ✔  Deploy complete!
```

**Deploy specific function**:
```bash
firebase deploy --only functions:createPaymentIntent

# Faster when only one function changed
```

**Environment variables for functions**:
```bash
# Set environment variable
firebase functions:config:set stripe.secret_key="sk_live_..."

# Get environment variables
firebase functions:config:get

# Example output:
# {
#   "stripe": {
#     "secret_key": "sk_live_..."
#   }
# }
```

---

## Environment Management

### Environment Files

**Structure**:
```
project-root/
├── .env                    # Local development (not committed)
├── .env.example            # Template (committed)
├── .env.staging            # Staging environment
└── .env.production         # Production environment
```

### Managing Environments

**Development (.env)**:
```env
VITE_FIREBASE_API_KEY=dev_api_key
VITE_FIREBASE_PROJECT_ID=scaffld-dev
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Staging (.env.staging)**:
```env
VITE_FIREBASE_API_KEY=staging_api_key
VITE_FIREBASE_PROJECT_ID=scaffld-staging
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Production (.env.production)**:
```env
VITE_FIREBASE_API_KEY=prod_api_key
VITE_FIREBASE_PROJECT_ID=scaffld-prod
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Build with Specific Environment

```bash
# Build for staging
cp .env.staging .env
npm run build
firebase deploy --only hosting --project scaffld-staging

# Build for production
cp .env.production .env
npm run build
firebase deploy --only hosting --project scaffld-prod
```

**Or use environment-specific scripts**:

Add to `package.json`:
```json
{
  "scripts": {
    "build:staging": "cp .env.staging .env && vite build",
    "build:prod": "cp .env.production .env && vite build",
    "deploy:staging": "npm run build:staging && firebase deploy --only hosting --project scaffld-staging",
    "deploy:prod": "npm run build:prod && firebase deploy --only hosting --project scaffld-prod"
  }
}
```

**Usage**:
```bash
npm run deploy:staging  # Deploy to staging
npm run deploy:prod     # Deploy to production
```

---

## CI/CD Pipeline

### GitHub Actions Setup

**Create workflow file**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - master      # Auto-deploy production
      - develop     # Auto-deploy staging

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test
        continue-on-error: true  # Don't fail if no tests yet

      - name: Build application
        run: npm run build

      - name: Deploy to Firebase (Production)
        if: github.ref == 'refs/heads/master'
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_PROD }}'
          channelId: live
          projectId: scaffld-prod

      - name: Deploy to Firebase (Staging)
        if: github.ref == 'refs/heads/develop'
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_STAGING }}'
          channelId: live
          projectId: scaffld-staging
```

### Setup Secrets in GitHub

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `FIREBASE_SERVICE_ACCOUNT_PROD`: Firebase service account JSON (production)
   - `FIREBASE_SERVICE_ACCOUNT_STAGING`: Firebase service account JSON (staging)

**Get service account**:
```bash
# Go to Firebase Console → Project Settings → Service Accounts
# Click "Generate new private key"
# Download JSON file
# Copy contents to GitHub secret
```

---

## Mobile App Deployment

### Expo EAS Deployment

**Platform**: Expo Application Services (EAS)
**Status**: In development (Phase 2)

**Planned workflow**:
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure builds
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

**OTA Updates**:
```bash
# Publish update
eas update --branch production

# Update instantly pushed to all users
# No app store review required
```

More details will be added when mobile development completes.

---

## Monitoring & Rollback

### Monitoring Production

**Firebase Console**:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project
3. Check:
   - **Hosting**: Deployment history, traffic
   - **Firestore**: Usage, performance
   - **Functions**: Logs, errors, performance
   - **Analytics**: User activity

**Firebase CLI monitoring**:
```bash
# View recent deploys
firebase hosting:releases:list

# View function logs
firebase functions:log

# View specific function
firebase functions:log --only createPaymentIntent

# Tail logs in real-time
firebase functions:log --tail
```

**Firestore Usage**:
```bash
# Check Firestore usage in Firebase Console
# Navigate to: Firestore → Usage tab
# Monitor:
# - Document reads
# - Document writes
# - Document deletes
# - Storage (GB)
```

### Rollback Deployment

**Option 1: Rollback via Firebase Console**

1. Go to Firebase Console → Hosting
2. Click "Release history"
3. Find previous working version
4. Click "..." → "Rollback"
5. Confirm rollback

**Option 2: Redeploy previous version**

```bash
# Checkout previous version
git log --oneline  # Find commit hash
git checkout <commit-hash>

# Build and deploy
npm install
npm run build
firebase deploy --only hosting

# Return to master
git checkout master
```

**Option 3: Use release tags**

```bash
# List tags
git tag

# Checkout release tag
git checkout v1.2.2

# Build and deploy
npm install
npm run build
firebase deploy --only hosting

# Return to master
git checkout master
```

---

## Troubleshooting

### Common Deployment Issues

#### Issue: Build fails with environment variables missing

**Solution**:
```bash
# Ensure .env file exists
ls -la .env

# Verify all required variables are set
cat .env | grep VITE_

# Copy from example if needed
cp .env.example .env
# Edit .env and add values
```

#### Issue: Firebase deploy fails with "Permission denied"

**Solution**:
```bash
# Re-login to Firebase
firebase logout
firebase login

# Verify project access
firebase projects:list

# Check you're deploying to correct project
firebase use --add
# Select project from list
```

#### Issue: Deployed site shows old version

**Solution**:
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)

# Or clear Firebase CDN cache
firebase hosting:cache:clear

# Verify build included latest changes
ls -la dist/
cat dist/assets/*.js | grep "your-new-code"
```

#### Issue: Firebase Functions timeout

**Solution**:
```javascript
// Increase timeout in functions
exports.yourFunction = functions
  .runWith({
    timeoutSeconds: 300,  // 5 minutes (default is 60s)
    memory: '1GB'         // Increase memory if needed
  })
  .https.onRequest((req, res) => {
    // Your function code
  });
```

#### Issue: Firestore security rules blocking requests

**Solution**:
```bash
# Check Firestore rules in Firebase Console
# Firestore → Rules tab

# Test rules with Rules Playground
# Simulate authentication state
# Test specific operations

# Common fix: Ensure user authentication
# rules_version = '2';
# service cloud.firestore {
#   match /databases/{database}/documents {
#     match /users/{uid}/{document=**} {
#       allow read, write: if request.auth != null &&
#                            request.auth.uid == uid;
#     }
#   }
# }
```

#### Issue: High Firebase costs

**Solution**:
```bash
# Monitor usage in Firebase Console
# Navigate to: Usage and billing

# Optimize Firestore queries
# - Use indexes for complex queries
# - Limit query results with .limit()
# - Use pagination
# - Cache frequently accessed data

# Optimize Storage
# - Compress images before upload
# - Delete old files
# - Use Cloud Functions to clean up automatically

# Set budget alerts
# Firebase Console → Project settings → Usage and billing
# Set budget alert (e.g., $50/month)
```

---

## Deployment Best Practices

### Pre-Deployment

1. **Test Locally**: Always test build locally with `npm run preview`
2. **Check Dependencies**: Ensure all dependencies are up to date
3. **Database Backups**: Back up critical Firestore data before major changes
4. **Notify Team**: Inform team about deployment timing

### During Deployment

1. **Deploy Off-Peak**: Deploy during low-traffic periods
2. **Monitor Logs**: Watch Firebase Functions logs during deployment
3. **Quick Verification**: Test critical flows immediately after deploy

### Post-Deployment

1. **Monitor Errors**: Check Firebase Console for errors (15-30 min)
2. **User Feedback**: Monitor support channels for issues
3. **Tag Release**: Tag successful releases in Git
4. **Document Changes**: Update changelog

### Rollback Strategy

1. **Quick Rollback**: Keep previous version easily accessible
2. **Database Migrations**: Always reversible (use up/down migrations)
3. **Feature Flags**: Use for risky features (can disable without redeploy)

---

## Release Checklist

### Pre-Release
- [ ] All features tested and working
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Database migrations ready
- [ ] Environment variables configured

### Release
- [ ] Build production assets
- [ ] Deploy to staging first
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Verify production deployment

### Post-Release
- [ ] Monitor for errors (30 min)
- [ ] Test critical user flows
- [ ] Tag release in Git
- [ ] Notify team of release
- [ ] Update project management (close tickets)
- [ ] Celebrate! 🎉

---

## Useful Commands Reference

```bash
# Firebase CLI
firebase login                              # Login to Firebase
firebase logout                             # Logout
firebase projects:list                      # List projects
firebase use <project-id>                   # Switch project

# Deployment
firebase deploy                             # Deploy everything
firebase deploy --only hosting              # Deploy hosting only
firebase deploy --only functions            # Deploy functions only
firebase deploy --only functions:funcName   # Deploy specific function

# Hosting
firebase hosting:sites:list                 # List hosting sites
firebase hosting:releases:list              # List releases
firebase hosting:cache:clear                # Clear CDN cache

# Functions
firebase functions:log                      # View logs
firebase functions:log --only funcName      # View specific function logs
firebase functions:log --tail               # Tail logs
firebase functions:config:set key=val       # Set config
firebase functions:config:get               # Get config

# Emulators
firebase emulators:start                    # Start all emulators
firebase emulators:start --only functions   # Start functions emulator

# Build
npm run build                               # Production build
npm run build:staging                       # Staging build
npm run build:prod                          # Production build
npm run preview                             # Preview build

# Git
git tag v1.2.3                              # Tag release
git push origin v1.2.3                      # Push tag
git checkout v1.2.3                         # Checkout tag
```

---

## Support & Resources

### Documentation
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Vite Production Build](https://vitejs.dev/guide/build.html)

### Monitoring
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Status](https://status.firebase.google.com/)

### Internal
- **DevOps Contact**: [Your Name]
- **Setup Guide**: [SETUP.md](SETUP.md)
- **Architecture**: [../SCAFFLD_ARCHITECTURE.md](../SCAFFLD_ARCHITECTURE.md)

---

**Version**: 2.0
**Last Updated**: February 11, 2026
**Maintained By**: DevOps Team

*Deploy with confidence! 🚀*
