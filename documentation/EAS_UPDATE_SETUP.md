# EAS Update Setup Guide

## Overview

EAS Update lets you push JavaScript/React changes to your app instantly without going through the App Store. When you push code to GitHub, your side-loaded development app receives the update automatically.

## Privacy & Security

**Your app is NOT public.** EAS Update only sends updates to devices that already have your specific build installed. It does not:
- Publish your app to any app store
- Make your app downloadable by others
- Expose your code publicly

The Expo dashboard is only accessible with your Expo account login. Only you (and anyone you've shared your development build with) can receive these updates.

## How It Works

```
Push to GitHub → GitHub Actions runs → EAS Update publishes → Your phone receives update
```

1. **You push code** to the `main` branch on GitHub
2. **GitHub Actions** automatically runs the EAS Update workflow
3. **EAS Update** bundles your JavaScript and uploads it to Expo's servers
4. **Your app** downloads the update next time it opens (requires 2 app launches: first to download, second to apply)

## Channels vs Branches

- **Channel**: What your *built app* listens to for updates (configured at build time)
- **Branch**: What EAS Update publishes to (configured when running `eas update`)

Your development build listens to the `development` channel, so updates must be published to that channel.

| Build Profile | Channel | Use Case |
|---------------|---------|----------|
| development | development | Local testing with development client |
| preview | preview | Internal testing builds |
| production | production | App Store releases |

## Quick Reference

### Updating Your App

Just push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push
```

The GitHub Actions workflow automatically publishes to the `development` channel.

### Manual Update (if needed)

```bash
# Publish to development channel (for your side-loaded dev build)
npx eas-cli update --channel development --message "Your update message"
```

### Receiving Updates on Your Phone

1. Force-close the SetSheet app completely
2. Reopen the app (downloads update in background)
3. Close and reopen again (applies the update)

## Initial Setup (Already Complete)

These steps have already been done for this project:

### 1. GitHub Secret
The `EXPO_TOKEN` secret is configured in your GitHub repository settings.

To get a new token if needed:
1. Go to https://expo.dev/settings/access-tokens
2. Create a token with "Read and Write" permissions
3. Add it to GitHub: Settings → Secrets → Actions → `EXPO_TOKEN`

### 2. Development Build
Your side-loaded iOS app was built with:
```bash
npx eas-cli build --profile development --platform ios
```

This build is configured to receive updates from the `development` channel.

## Limitations

- **JavaScript only**: OTA updates only work for JavaScript/React changes
- **Native changes require rebuild**: Adding new native packages, changing app.json settings, or modifying iOS/Android configs requires a new build via `eas build`
- **Runtime version must match**: The update's runtime version must match your installed build's version

## Troubleshooting

### Updates not appearing?

1. **Check the channel**: Your build must match the update channel
   - Development builds → `development` channel
   - Run `npx eas-cli update --channel development` to publish manually

2. **Force close and reopen twice**: Updates download on first launch, apply on second

3. **Check GitHub Actions**: Go to your repo → Actions tab → check for errors

4. **Verify runtime version**: Both build and update must have runtime version `1.0.0`

### Check update status
```bash
# See recent updates
npx eas-cli update:list

# View on dashboard
open https://expo.dev/accounts/hvelez21/projects/SetSheet/updates
```

## Monitoring

View all published updates at:
https://expo.dev/accounts/hvelez21/projects/SetSheet/updates
