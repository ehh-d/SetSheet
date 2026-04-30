## Project Type
This is a React Native / Expo mobile app. There is no browser preview server. Skip all browser preview verification steps — do not call preview_start or any preview_* tools.

## Environment
Node is at /opt/homebrew/bin/node
npx is at /opt/homebrew/bin/npx
npm is at /opt/homebrew/bin/npm

Always use full paths for these commands:
- `/opt/homebrew/bin/npx expo start` instead of `npx expo start`
- `/opt/homebrew/bin/node` instead of `node`
- `/opt/homebrew/bin/npm` instead of `npm`

## Physical Device (SetSheet Dev app)
- Work network ALWAYS blocks direct IP connections — local `exp://192.168.x.x:8081` never works
- Use ngrok (authenticated, free account, already set up):
  - Terminal 1: `cd /Users/eddie.velez/Projects/SetSheet && /opt/homebrew/bin/node node_modules/expo/bin/cli start`
  - Terminal 2: `ngrok http 8081`
  - Copy the `https://xxxx.ngrok-free.dev` URL from the Forwarding line
  - Enter in dev app: `exp+setsheet://expo-development-client/?url=https%3A%2F%2Fxxxx.ngrok-free.dev`
- The SetSheet Dev app is on the **development** channel; preview app is on **preview** channel
- Always deploy to BOTH channels: `eas update --branch preview` AND `eas update --branch development`
