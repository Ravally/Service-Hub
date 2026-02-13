# Scaffld - Development Environment Setup Guide

**Last Updated**: February 11, 2026
**Version**: 2.0
**Platform Support**: Windows, macOS, Linux

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Web Application Setup](#web-application-setup)
3. [Firebase Setup](#firebase-setup)
4. [Stripe Setup](#stripe-setup)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

**Node.js & npm**:
```bash
# Install Node.js 18+ (LTS recommended)
# Download from: https://nodejs.org/

# Verify installation
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher
```

**Git**:
```bash
# Install Git
# Download from: https://git-scm.com/

# Verify installation
git --version  # Should be 2.x or higher
```

**Code Editor** (Recommended):
- **VS Code**: https://code.visualstudio.com/
- **Extensions**:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Firebase Explorer

---

## Web Application Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/service-hub-app.git
cd service-hub-app

# Or if you're continuing existing work
cd path/to/service-hub-app
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# This will install:
# - React 18
# - Vite
# - Tailwind CSS
# - Firebase SDK
# - All other dependencies
```

**Installation time**: ~2-5 minutes depending on your connection.

### 3. Verify Installation

```bash
# Check for any vulnerabilities
npm audit

# Fix vulnerabilities if any
npm audit fix
```

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `scaffld-dev` (or your preferred name)
4. Enable Google Analytics (optional)
5. Wait for project creation (~30 seconds)

### 2. Enable Firebase Services

**Authentication**:
1. Navigate to Authentication → Sign-in method
2. Enable "Email/Password"
3. Save changes

**Firestore Database**:
1. Navigate to Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select location: `us-central1` (or your preferred region)
5. Wait for database creation (~1 minute)

**Storage**:
1. Navigate to Storage
2. Click "Get started"
3. Choose "Start in test mode" (for development)
4. Keep default location
5. Click "Done"

**Cloud Functions** (Optional for development):
1. Navigate to Functions
2. Click "Get started"
3. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

### 3. Get Firebase Configuration

1. Navigate to Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click "Web" icon (</>) to add web app
4. Register app name: `Scaffld Web`
5. Copy the Firebase configuration object

**Example configuration**:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 4. Update Firestore Security Rules

```bash
# Navigate to Firestore → Rules
# Replace with:
```

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }

    // User-scoped collections
    match /users/{uid}/{collection}/{docId} {
      allow read, write: if isOwner(uid);
    }

    // Nested collections (2 levels deep)
    match /users/{uid}/{collection}/{docId}/{subcollection}/{subdocId} {
      allow read, write: if isOwner(uid);
    }

    // Public quote access
    match /public/quotes/{quoteId} {
      allow read: if true;
      allow write: if false;
    }

    // Invites
    match /invites/{inviteId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }
  }
}
```

### 5. Update Storage Security Rules

```bash
# Navigate to Storage → Rules
# Replace with:
```

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow authenticated users to upload files to their folder
      allow read, write: if request.auth != null &&
        request.auth.uid == request.path[0];
    }
  }
}
```

---

## Stripe Setup

### 1. Create Stripe Account

1. Go to [Stripe](https://stripe.com)
2. Sign up for account
3. Verify email
4. Complete business information

### 2. Get API Keys

1. Navigate to [Developers → API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy "Publishable key" (starts with `pk_test_`)
3. Click "Reveal test key token"
4. Copy "Secret key" (starts with `sk_test_`)

**⚠️ Security Warning**: Never commit secret keys to Git!

### 3. Configure Webhooks (Optional for local development)

1. Navigate to [Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. For local testing:
   - Use `https://localhost:3000/api/webhook` (requires HTTPS)
   - Or use [Stripe CLI](https://stripe.com/docs/stripe-cli)
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

---

## Environment Configuration

### 1. Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# Or create new .env file
touch .env
```

### 2. Configure Environment Variables

Open `.env` and add:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Optional: For Firebase Functions
STRIPE_SECRET_KEY=sk_test_your_secret_key
FIREBASE_FUNCTIONS_URL=http://localhost:5001/your-project/us-central1
```

**Important**:
- All Vite environment variables must be prefixed with `VITE_`
- Never commit `.env` to Git (already in `.gitignore`)
- Use separate `.env` files for development and production

### 3. Verify Configuration

```bash
# Check that environment variables are loaded
# Create a test file: test-env.js
console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('Stripe Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

# Run with Node (if using)
node test-env.js

# Or check in browser console when app runs
```

---

## Running the Application

### 1. Development Server

```bash
# Start development server
npm run dev

# Output:
#   VITE v4.x.x  ready in 500 ms
#   ➜  Local:   http://localhost:5173/
#   ➜  Network: use --host to expose
#   ➜  press h to show help
```

**Access the app**: Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Build for Production

```bash
# Create production build
npm run build

# Output directory: dist/
# Build time: ~10-30 seconds
```

### 3. Preview Production Build

```bash
# Preview production build locally
npm run preview

# Access at: http://localhost:4173
```

### 4. Linting & Formatting

```bash
# Run ESLint
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format with Prettier (if configured)
npm run format
```

---

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin master

# 2. Install any new dependencies
npm install

# 3. Start development server
npm run dev

# 4. Make changes and test
# ... code changes ...

# 5. Before committing:
npm run lint        # Check for errors
npm run build       # Verify build works

# 6. Commit changes
git add .
git commit -m "feat: add feature description"

# 7. Push to remote
git push origin your-branch
```

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Create fix branch
git checkout -b fix/bug-description

# Create refactor branch
git checkout -b refactor/description
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>: <description>

# Types:
feat:     # New feature
fix:      # Bug fix
refactor: # Code refactoring
docs:     # Documentation changes
style:    # Code style changes (formatting, etc.)
test:     # Adding or updating tests
chore:    # Maintenance tasks

# Examples:
git commit -m "feat: add PDF invoice generation"
git commit -m "fix: resolve calculation bug in totals"
git commit -m "refactor: extract utility functions"
git commit -m "docs: update API documentation"
```

---

## Troubleshooting

### Common Issues

#### Issue: `npm install` fails

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Issue: Port 5173 already in use

**Solution**:
```bash
# Kill process on port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

#### Issue: Firebase connection errors

**Solution**:
```bash
# Verify environment variables are set
echo $VITE_FIREBASE_API_KEY

# Check Firebase config in src/firebase/config.js
# Ensure all values are correct

# Check Firebase project is active in console
# Verify Firestore and Auth are enabled
```

#### Issue: Build fails with "Out of memory"

**Solution**:
```bash
# Increase Node memory limit
NODE_OPTIONS=--max_old_space_size=4096 npm run build

# Or add to package.json scripts:
# "build": "NODE_OPTIONS=--max_old_space_size=4096 vite build"
```

#### Issue: Hot reload not working

**Solution**:
```bash
# Restart dev server
# Press Ctrl+C to stop
npm run dev

# Clear browser cache
# Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# Check for file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Issue: Tailwind styles not applying

**Solution**:
```bash
# Verify tailwind.config.js content paths
# Ensure all file paths are included:
content: ['./index.html', './src/**/*.{js,jsx}']

# Restart dev server
npm run dev

# Check for CSS import in src/index.css or src/main.jsx
import './index.css'
```

#### Issue: Firebase "Permission denied" errors

**Solution**:
```bash
# Check Firestore rules in Firebase Console
# Verify user is authenticated: console.log(auth.currentUser)
# Ensure user ID matches document path
# Check browser console for detailed error message
```

---

## VS Code Setup (Recommended)

### Extensions

Install these extensions for optimal development experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "toba.vsfire",
    "formulahendry.auto-rename-tag",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

### Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["className\\s*=\\s*['\"]([^'\"]*)['\"]"]
  ]
}
```

### Snippets

Create `.vscode/snippets.code-snippets`:

```json
{
  "React Component": {
    "prefix": "rfc",
    "body": [
      "import React from 'react';",
      "",
      "export default function ${1:ComponentName}() {",
      "  return (",
      "    <div>",
      "      ${2}",
      "    </div>",
      "  );",
      "}"
    ]
  }
}
```

---

## Next Steps

After completing setup:

1. **Read Architecture Guide**: [../SCAFFLD_ARCHITECTURE.md](../SCAFFLD_ARCHITECTURE.md)
2. **Review Master Roadmap**: [../SCAFFLD_MASTER_ROADMAP.md](../SCAFFLD_MASTER_ROADMAP.md)
3. **Check Current Phase**: [../phases/PHASE_2_IN_PROGRESS.md](../phases/PHASE_2_IN_PROGRESS.md)
4. **Follow Coding Guidelines**: See [../SCAFFLD_ARCHITECTURE.md#coding-conventions](../SCAFFLD_ARCHITECTURE.md#coding-conventions)
5. **Review Brand System**: [../../brand/SCAFFLD_BRAND.md](../../brand/SCAFFLD_BRAND.md)

---

## Useful Commands Reference

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm run preview            # Preview production build

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix linting issues

# Testing
npm test                   # Run tests (if configured)
npm run test:watch         # Watch mode

# Dependencies
npm install <package>      # Add dependency
npm install -D <package>   # Add dev dependency
npm update                 # Update dependencies
npm outdated               # Check for outdated packages

# Git
git status                 # Check status
git add .                  # Stage all changes
git commit -m "message"    # Commit changes
git push origin branch     # Push to remote
git pull origin master     # Pull latest changes

# Firebase CLI (if installed)
firebase login             # Login to Firebase
firebase deploy            # Deploy to Firebase Hosting
firebase emulators:start   # Start local emulators
```

---

## Support & Resources

### Documentation
- [Firebase Docs](https://firebase.google.com/docs)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind Docs](https://tailwindcss.com)
- [Stripe Docs](https://stripe.com/docs)

### Community
- [Scaffld GitHub Issues](https://github.com/your-org/service-hub-app/issues)
- [Firebase Support](https://firebase.google.com/support)
- [React Community](https://react.dev/community)

### Internal
- **Project Lead**: [Your Name]
- **Architecture Questions**: See [SCAFFLD_ARCHITECTURE.md](../SCAFFLD_ARCHITECTURE.md)
- **Deployment Questions**: See [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Version**: 2.0
**Last Updated**: February 11, 2026
**Maintained By**: Development Team

*Happy coding! 🚀*
