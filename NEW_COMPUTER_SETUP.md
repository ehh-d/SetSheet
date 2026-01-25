# New Computer Setup Guide

This guide will help you set up your development environment on a new machine to continue working on SetSheet.

## Prerequisites

Before starting, make sure you have:
- Your GitHub account credentials
- Your Expo account credentials
- Your Apple Developer account (if building for iOS)

## Step 1: Install Required Software

### Install Homebrew (macOS/Linux)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Install Node.js and npm
```bash
brew install node
```

Verify installation:
```bash
node --version  # Should be v20.x or higher
npm --version
```

### Install Git
```bash
brew install git
```

### Install GitHub CLI
```bash
brew install gh
```

### Install Watchman (for React Native)
```bash
brew install watchman
```

### Install CocoaPods (for iOS development)
```bash
sudo gem install cocoapods
```

## Step 2: Configure Git

Set your Git identity:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Authenticate with GitHub

### Option A: Using GitHub CLI (Recommended)
```bash
# Login with workflow permissions
gh auth login --scopes workflow

# Follow the prompts:
# - Choose: GitHub.com
# - Choose: HTTPS
# - Authenticate with: Login with a web browser
# - Copy the one-time code and press Enter
# - Complete authentication in browser
```

### Option B: Using SSH Keys (Alternative)
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub:
# 1. Go to https://github.com/settings/keys
# 2. Click "New SSH key"
# 3. Paste your public key
```

## Step 4: Clone Your Repository

```bash
# Using HTTPS (if you used GitHub CLI)
cd ~/DevEnvironment  # or wherever you want your projects
git clone https://github.com/ehh-d/SetSheet.git
cd SetSheet

# OR using SSH (if you set up SSH keys)
git clone git@github.com:ehh-d/SetSheet.git
cd SetSheet
```

## Step 5: Install Project Dependencies

```bash
npm install
```

## Step 6: Set Up Expo/EAS

### Login to Expo
```bash
npx eas-cli login
```

Enter your Expo credentials.

### Verify EAS Project Link
```bash
npx eas-cli whoami
npx eas-cli project:info
```

You should see:
- Project ID: 16e35b36-7269-45b7-b41a-6f26a1f157e5
- Bundle ID: com.hvelez21.SetSheet

## Step 7: Set Up Environment Files

If you have any environment files (like `.env` with Supabase keys), you'll need to recreate them:

```bash
# Create .env file if needed
touch .env
```

Add your Supabase credentials and any other secrets to `.env`.

**Important:** Never commit `.env` files to Git!

## Step 8: iOS Development Setup (macOS only)

### Install Xcode
1. Download Xcode from the Mac App Store
2. Open Xcode and accept license agreements
3. Install command line tools:
   ```bash
   xcode-select --install
   ```

### Install iOS Simulators (optional)
1. Open Xcode
2. Go to Preferences → Components
3. Download desired iOS simulators

## Step 9: Test Your Setup

### Start the Development Server
```bash
npx expo start
```

You should see a QR code and options to:
- Press `i` for iOS simulator
- Press `a` for Android
- Scan QR code with Expo Go app

## Step 10: Verify Git and Push Access

Test that you can push to GitHub:

```bash
# Make a small test change
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "Test commit from new machine"
git push

# If successful, clean up
git rm TEST.md
git commit -m "Remove test file"
git push
```

## Step 11: Building with EAS

### Verify Build Capabilities
```bash
# Check EAS configuration
npx eas-cli build:configure

# Build for iOS (preview/internal distribution)
npx eas-cli build --profile preview --platform ios

# Build for production
npx eas-cli build --profile production --platform ios
```

## Step 12: Publishing Updates

### Manual Update
```bash
npx eas-cli update --auto
```

### Automatic Updates via GitHub
Once you push to the `main` branch, GitHub Actions will automatically publish updates (if EXPO_TOKEN is set in GitHub Secrets).

## Common Issues and Solutions

### Issue: npm install fails
**Solution:** Delete `node_modules` and `package-lock.json`, then run `npm install` again:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: EAS build fails
**Solution:** Make sure you're logged into the correct Expo account:
```bash
npx eas-cli logout
npx eas-cli login
```

### Issue: Git push fails with authentication error
**Solution:** Re-authenticate with GitHub CLI:
```bash
gh auth login --scopes workflow
```

### Issue: CocoaPods errors (iOS)
**Solution:** Update CocoaPods:
```bash
sudo gem install cocoapods
cd ios  # if you have an ios folder
pod install
```

## Checklist for New Computer

- [ ] Homebrew installed
- [ ] Node.js and npm installed
- [ ] Git installed and configured
- [ ] GitHub CLI installed and authenticated
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Expo/EAS CLI authenticated
- [ ] Environment files created (if needed)
- [ ] Xcode installed (macOS, for iOS builds)
- [ ] CocoaPods installed (macOS, for iOS)
- [ ] Development server runs successfully
- [ ] Can push to GitHub
- [ ] Can build with EAS

## Quick Reference Commands

```bash
# Start dev server
npx expo start

# Build for iOS
npx eas-cli build --profile preview --platform ios

# Publish update
npx eas-cli update --auto

# Check git status
git status

# Commit and push
git add .
git commit -m "Your message"
git push

# View GitHub CLI status
gh auth status

# View Expo/EAS status
npx eas-cli whoami
```

## Important Files to Keep Synced

These files are in Git and will automatically sync:
- `package.json` - Project dependencies
- `app.json` - Expo configuration
- `eas.json` - EAS build/update configuration
- `.gitignore` - Files to ignore
- All source code files

These files are NOT in Git (must recreate on new machine):
- `.env` - Environment variables (if you have one)
- `node_modules/` - Installed dependencies (run `npm install`)
- `.expo/` - Expo cache (automatically created)

## Support Resources

- **Expo Documentation:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **EAS Update:** https://docs.expo.dev/eas-update/introduction/
- **GitHub CLI:** https://cli.github.com/manual/
- **React Native:** https://reactnative.dev/docs/environment-setup

---

**Note:** Save your Expo login credentials and any API keys in a password manager before switching computers!
