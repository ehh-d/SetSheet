# EAS Update Setup Guide

## Overview
Your SetSheet app is now configured to receive automatic over-the-air (OTA) updates when you push to GitHub!

## Setup Steps

### 1. Get Your Expo Access Token
You need to create an access token for GitHub Actions to publish updates:

```bash
npx eas-cli login
npx eas-cli whoami
```

Then create a token at: https://expo.dev/accounts/[your-account]/settings/access-tokens

**Important:** Create a token with "Read and Write" permissions.

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository: https://github.com/ehh-d/SetSheet
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `EXPO_TOKEN`
5. Value: Paste your Expo access token
6. Click **Add secret**

### 3. Rebuild Your App (One-Time)

You need to rebuild your app with the update configuration:

```bash
# For iOS (internal distribution)
npx eas-cli build --profile preview --platform ios

# Or for production
npx eas-cli build --profile production --platform ios
```

After building, install the new build on your iPhone. This version will be able to receive OTA updates.

### 4. Test the Auto-Update

Make a small change to your app, then:

```bash
git add .
git commit -m "Test OTA update"
git push
```

GitHub Actions will automatically:
- Detect the push to main
- Run `eas update --auto`
- Publish the update to the production channel

Your iPhone will download the update next time you open the app!

## Manual Update (Alternative)

You can also publish updates manually without GitHub Actions:

```bash
# Publish to production channel
npx eas-cli update --branch production --message "Your update message"

# Or let EAS auto-detect
npx eas-cli update --auto
```

## How It Works

1. **Push to GitHub** → Triggers GitHub Actions workflow
2. **GitHub Actions** → Runs `eas update --auto`
3. **EAS Update** → Publishes JavaScript bundle to Expo servers
4. **Your iPhone** → Downloads update when app opens (if connected to internet)

## Channels

- **production**: For your live app (used by the preview/production builds)
- **preview**: For testing updates before production
- **development**: For development builds

## Important Notes

- OTA updates only work for JavaScript/React changes
- Native code changes (new packages, config changes) require a new build
- Users must have the app open or restart it to receive updates
- Updates are downloaded in the background and applied on next launch

## Monitoring Updates

Check your updates at: https://expo.dev/accounts/[your-account]/projects/SetSheet/updates

## Troubleshooting

If updates aren't working:
1. Verify EXPO_TOKEN is set in GitHub Secrets
2. Check GitHub Actions tab for errors
3. Ensure your app build has the update configuration
4. Verify runtime version matches between build and update
