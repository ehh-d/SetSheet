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
- Use ngrok with `EXPO_PACKAGER_PROXY_URL` (without it, Metro tells the device to fetch from `127.0.0.1:8081` which is unreachable):
  - Terminal 1: `ngrok http 8081` — copy the `https://xxxx.ngrok-free.dev` URL
  - Terminal 2: `cd /Users/eddie.velez/Projects/SetSheet && EXPO_PACKAGER_PROXY_URL=https://xxxx.ngrok-free.dev /opt/homebrew/bin/node node_modules/expo/bin/cli start 2>&1 | tee /tmp/metro.log`
  - On dev app: paste the full deep link in the URL field — `exp+setsheet://expo-development-client/?url=https%3A%2F%2Fxxxx.ngrok-free.dev` — NOT just the ngrok URL (the dev client appends `:8081` which breaks HTTPS).
  - Verify manifest: `curl -s http://localhost:8081/ | python3 -c "import sys,json; print(json.load(sys.stdin)['launchAsset']['url'])"` — should NOT contain `127.0.0.1` or `:8081`.
- **Native module errors (`__UI_WORKLET_RUNTIME_HOLDER`, etc.)** = dev client binary is older than the native modules in package.json. Rebuild: `eas build --profile development --platform ios` (~20 min).
- The SetSheet Dev app is on the **development** channel; preview app is on **preview** channel
- Always deploy to BOTH channels: `eas update --branch preview` AND `eas update --branch development`
