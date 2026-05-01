# SetSheet Development Workflow

## Overview

This document defines the collaboration workflow between Eddie and Claude Code for SetSheet development. Claude Code should follow these guidelines during working sessions.

---

## Documentation Structure

```
SetSheet/
  docs/
    FEATURE_SPEC.md    # Current app specification (source of truth)
    CHANGELOG.md       # Running history of changes
    BACKLOG.md         # Deferred items, UX ideas, known issues to revisit
    EXERCISE_LIBRARY.md # Exercise database reference
    WORKFLOW.md        # This file
```

---

## Session Start

At the **beginning of a working session**, Claude Code should:

1. **Read docs** — Check FEATURE_SPEC.md to understand current implementation
2. **Clarify scope** — Confirm what's being worked on before coding
3. **Note conflicts** — If requested work conflicts with spec, flag it

This happens **once at session start**, not before every edit.

---

## Environment Setup (Session Start)

**Purpose:** Open iOS Simulator for development.

After reading docs, run:

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
open -a Simulator
```

### iOS Simulator — Local Build (`expo run:ios`)

Required when a new native module is added and the existing dev client binary doesn't have it linked.

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node node_modules/expo/bin/cli run:ios 2>&1 | tee /tmp/metro.log
```

> **Work computer issue:** `expo run:ios` calls `xcode-select` internally. If it prompts to open the App Store or says Xcode isn't installed, `xcode-select` isn't pointing to Xcode. The `DEVELOPER_DIR` env var overrides it without requiring sudo. If this still fails, the machine lacks sufficient Xcode developer tool access (work MDM restriction) — use a physical device EAS build instead.

---

### Physical Device (SetSheet Dev build)

The dev client app does not auto-connect — it requires a server URL or QR code.

**Normal (same WiFi):** Run Metro from your terminal and enter `exp://192.168.x.x:8081` in the dev client manually.

**The work network always blocks direct IP connections.** Use ngrok (authenticated, free account set up):

**Terminal 1 — Start ngrok first (so you have the URL for Metro):**
```bash
ngrok http 8081
```
Copy the `https://xxxx.ngrok-free.dev` URL from the Forwarding line.

**Terminal 2 — Start Metro with `EXPO_PACKAGER_PROXY_URL` set to the ngrok URL:**
```bash
cd /Users/eddie.velez/Projects/SetSheet && EXPO_PACKAGER_PROXY_URL=https://xxxx.ngrok-free.dev /opt/homebrew/bin/node node_modules/expo/bin/cli start 2>&1 | tee /tmp/metro.log
```

> **Why this matters:** Without `EXPO_PACKAGER_PROXY_URL`, Metro's manifest tells the device to fetch the bundle from `127.0.0.1:8081`, which is unreachable. With it set, Metro advertises the public ngrok URL (and drops the `:8081` port since ngrok HTTPS uses 443).

**On the dev app:** paste this into the URL field (or open in Safari) — replace the ngrok subdomain with yours:
```
exp+setsheet://expo-development-client/?url=https%3A%2F%2Fxxxx.ngrok-free.dev
```

> **Don't enter just `https://xxxx.ngrok-free.dev` in the URL field** — the dev client will append `:8081`, which breaks because ngrok HTTPS listens on 443. Always use the full `exp+setsheet://...?url=...` deep link format.

**Verify the manifest is correct:**
```bash
curl -s http://localhost:8081/ | python3 -c "import sys,json; print(json.load(sys.stdin)['launchAsset']['url'])"
```
Should print `https://xxxx.ngrok-free.dev/index.ts.bundle?...` (no port). If you see `127.0.0.1:8081` or `:8081` in the URL, `EXPO_PACKAGER_PROXY_URL` isn't set.

ngrok is already installed and authenticated — no extra setup needed.

### When to rebuild the dev client (EAS)

Symptoms: red error overlay with `__UI_WORKLET_RUNTIME_HOLDER` undefined, "Cannot find native module", or similar native-module errors.

Cause: the dev client binary was compiled before a native module (e.g. `react-native-reanimated`, `react-native-keyboard-controller`) was added to package.json. JS bundle expects the module; binary doesn't have it linked.

Fix:
```bash
eas build --profile development --platform ios
```
Takes ~20 minutes. Install the resulting `.ipa` on the device via the link/QR EAS provides, then reconnect.

### Troubleshooting cheat sheet

| Symptom | Cause | Fix |
|---------|-------|-----|
| Red `Could not connect to development server` with URL containing `:8081` | Bare ngrok URL pasted into dev app's URL field — dev client auto-appends `:8081`, but ngrok HTTPS is on 443 | Use the full `exp+setsheet://expo-development-client/?url=https%3A%2F%2Fxxxx.ngrok-free.dev` deep-link format |
| Red `Could not connect` with URL containing `127.0.0.1` | `EXPO_PACKAGER_PROXY_URL` not set when starting Metro | Restart Metro with the env var |
| `ERR_NGROK_3200` (endpoint offline) when `curl`-ing the ngrok URL | ngrok process died or never started | Restart `ngrok http 8081` in its own terminal |
| `ERR_NGROK_8012` (upstream connection failed) | ngrok is up but Metro isn't running on 8081 | Start Metro |
| `Port 8081 is running this app in another window` + `non-interactive mode` exits | Stale Metro process from a prior session | `kill $(lsof -ti :8081)` then restart |
| White screen, dev menu still works | JS loaded but a render path returned nothing — usually a native-module mismatch (see EAS rebuild section above) or auth hanging | Check `/tmp/metro.log` for runtime errors |
| Phone shows "Loading from Metro" forever | First bundle build (especially after `--clear`) takes 1–3 min | Wait it out; don't reload mid-build |
| Bundle changes not reflected after edit | Phone is using a cached bundle | Restart Metro with `--clear` flag, force-quit dev app, reconnect via Safari deep link |
| `Run 'npm start' from react-native root` text in the red error | Generic React Native boilerplate — NOT actual instructions for our setup | Ignore that line; the URL on the same screen is what matters |
| `xcrun simctl ... non-zero code 72` warning at Metro startup | Work-MDM-restricted Xcode tooling; only affects iOS Simulator, not physical device | Ignore — physical device flow still works |
| `Cannot find module ... node_modules/expo/bin/cli` | Ran command from `Projects/` instead of `Projects/SetSheet/` | `cd /Users/eddie.velez/Projects/SetSheet` first |

### Useful side tools

- **ngrok inspector:** `http://127.0.0.1:4040` in a browser on the Mac. Shows every request hitting the tunnel — handy for confirming the phone is reaching ngrok at all. (`GET /` and `HEAD /` are the dev client probing the server; `GET /index.ts.bundle` is the actual bundle download.)
- **Manifest sanity check:** `curl -s http://localhost:8081/ | python3 -c "import sys,json; print(json.load(sys.stdin)['launchAsset']['url'])"` — the URL printed is exactly what the dev client will use to fetch the bundle.
- **Read Metro logs from Claude:** `cat /tmp/metro.log` (only works if Metro was started with `... | tee /tmp/metro.log`).

### Why we can't just use `expo start --tunnel`

Expo's built-in `--tunnel` flag uses `@expo/ngrok-bin`, which doesn't have a binary for Node 25 (the version on this Mac). That's why we run ngrok separately via Homebrew and pair it with `EXPO_PACKAGER_PROXY_URL`. If Node ever gets downgraded to an LTS (22), `--tunnel` becomes a one-line alternative.

### ngrok URL is random each session

The free ngrok plan gives a new random subdomain every time you run `ngrok http 8081`. To get a stable URL (so you can bookmark the deep link in Safari), claim the one free static domain at [dashboard.ngrok.com/domains](https://dashboard.ngrok.com/domains), then run `ngrok http --domain=your-domain.ngrok-free.app 8081`.

---

## During Development

### While Coding

1. **Match terminology** — Use terms from FEATURE_SPEC.md (Sheet, Sheets screen, Focus Date, etc.)
2. **Follow patterns** — Stick to established patterns (Animated API, not Reanimated for Expo Go)
3. **Test in Expo Go** — Ensure changes work in Expo Go before committing

### Do NOT

- Update docs after every change
- Ask for confirmation on minor edits
- Interrupt flow with documentation tasks

Documentation updates happen **only at session end**.

---

## Session End

When Eddie says "end session" (or similar), Claude Code should:

1. **Stop running processes** — Kill Metro bundler (Ctrl+C), confirm Expo terminated
2. **Summarize changes** — Brief list of what was accomplished
3. **Update CHANGELOG.md** — Add entries for changes made this session
4. **Update FEATURE_SPEC.md** (if applicable — see below)
5. **Backlog check** — Ask Eddie: "Anything from this session to add to BACKLOG.md?" Log any unfinished ideas, deferred UX decisions, or known issues he wants to track
6. **Note incomplete work** — Flag anything left in progress
7. **Identify next steps** — What should be tackled next session

### Update FEATURE_SPEC.md when:

- Navigation changed
- New screens added
- Screens removed or significantly modified
- User flows modified
- Features added or updated
- Decisions made that affect future development
- **Feature behavior** changed (how something works, not how it looks)

### Documentation Detail Level

Document features with enough specificity that someone could replicate the behavior from the description alone:
- Explain the mechanism, not just that it exists
- Include conditional logic ("X happens when Y")
- Use concrete examples for complex interactions

**Example — too vague:**
> "Month labels use a fake sticky effect"

**Example — good:**
> "Inline labels hidden when they match activeMonth. When collapsed, activeMonth is set to focus date's month. When expanded, activeMonth is calculated from bottom-most visible row."

### Do NOT update FEATURE_SPEC.md for:

- Bug fixes (CHANGELOG only)
- Styling/visual tweaks — colors, spacing, alignment, font sizes (CHANGELOG only)
- Performance improvements (CHANGELOG only)
- Refactors with no behavior change (CHANGELOG only)

### Feature Behavior vs Styling

**Feature behavior** = how something works:
- "When collapsed, all inline labels hide and fixed overlay shows focus date's month"
- "Exercises pre-selected after template upload"
- "Category filter applied to Exercise Search"

**Styling** = how something looks:
- "Timeline line is 2px thick"
- "Ordinal suffixes are superscript"
- "Dot aligned with timeline"
- "Label moved up 8 pixels"

Only feature behavior goes in FEATURE_SPEC. Styling goes in CHANGELOG.

### Session Summary Format

```
## Session Summary - [Date]

### Completed
- [List of completed items]

### In Progress
- [Anything partially done]

### Next Steps
- [Recommended next tasks]

### Docs Updated
- [ ] CHANGELOG.md
- [ ] FEATURE_SPEC.md (if applicable)

### Processes Stopped
- [ ] Metro bundler
- [ ] Expo dev server
- [ ] Any other running processes
```

---

## CHANGELOG Format

```markdown
## [YYYY-MM-DD] - Brief Description

### Added
- New feature or capability

### Changed
- Modified existing behavior

### Fixed
- Bug fix

### Removed
- Removed feature or code
```

**Rules:**
- Date in reverse chronological order (newest first)
- Group related changes under same date
- Be specific — "Fixed scroll position on panel close" not "Fixed bug"

---

## Git Workflow

### Commit Messages

```
[type]: brief description

- Detail 1
- Detail 2
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code restructure (no behavior change)
- `style` — Styling/UI changes
- `docs` — Documentation only
- `chore` — Maintenance tasks

### Push to GitHub

After committing, push triggers EAS Update to `preview` channel:
```bash
git add .
git commit -m "type: description"
git push
```

---

## Communication Guidelines

### Plan Format

Keep plans concise:
- What's being fixed/built (1-2 sentences)
- Which files are affected (list)
- Then execute

Do NOT include:
- Code snippets in plans (Eddie doesn't need to see code before it's written)
- Verification/testing steps (Eddie knows to test)
- Detailed implementation logic

### When Eddie says...

| Eddie says | Claude Code should |
|------------|-------------------|
| "Build X" | Clarify scope if needed, then implement |
| "Fix X" | Diagnose and fix |
| "Change X to Y" | Implement the change |
| "What's the status of X?" | Check code and docs |
| "End session" | Stop processes, summarize, update docs |

### When unsure

- **Ask** before making assumptions on scope
- **Flag** conflicts with existing spec
- **Propose** alternatives if requested approach has issues

---

## Key Technical Constraints

| Constraint | Reason |
|------------|--------|
| No Reanimated | Expo Go version mismatch |
| React Native Animated + PanResponder | Works in Expo Go |
| 4 bottom nav items | Current design |
| List view only (no grid) | Simplified calendar |
| EAS Update to `preview` channel | Matches side-loaded build |
| Expo dev client | Physical device and simulator connect to same Metro server |
| DEVELOPER_DIR env var | Required for Xcode/Simulator without admin access |

---

## File Locations

| What | Where |
|------|-------|
| Docs | `SetSheet/docs/` |
| Components | `SetSheet/components/` |
| Screens | `SetSheet/screens/` |
| Hooks | `SetSheet/hooks/` |
| Supabase client | `SetSheet/lib/supabase.ts` |
| Types | `SetSheet/lib/database.types.ts` |

---

## Quick Reference

**Session start:**
1. Read FEATURE_SPEC.md
2. Open Simulator
3. Code

**Session end:**
1. Stop all running processes (Metro, Expo, etc.)
2. Update CHANGELOG.md
3. Update FEATURE_SPEC.md (if features/flows/screens changed)
4. Commit and push
5. Provide session summary
