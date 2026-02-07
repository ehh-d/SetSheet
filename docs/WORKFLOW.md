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

1. **Stop running processes** — Kill Metro bundler, Expo, and any test environments
2. **Summarize changes** — Brief list of what was accomplished
3. **Update CHANGELOG.md** — Add entries for changes made this session
4. **Update FEATURE_SPEC.md** (if applicable — see below)
5. **Note incomplete work** — Flag anything left in progress
6. **Identify next steps** — What should be tackled next session

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
2. Understand scope
3. Code

**Session end:**
1. Stop all running processes (Metro, Expo, etc.)
2. Update CHANGELOG.md
3. Update FEATURE_SPEC.md (if features/flows/screens changed)
4. Commit and push
5. Provide session summary
