# SetSheet — Feature Specification

## Overview

**SetSheet** is a workout tracking mobile app for logging exercises, sets, reps, and weights. Built for personal use by Eddie and his girlfriend, with potential for public release later.

**Tech Stack:**
- Framework: Expo (React Native)
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth (email/password)
- Distribution: EAS Build (iOS via Apple Developer account)

---

## Terminology

| Term | Definition |
|------|------------|
| **Sheet** | A workout log for a specific date containing exercises, sets, reps, weights, and notes |
| **Sheets** | Primary app screen for browsing dates and managing sheets |
| **Focus Date** | Currently viewed date (defaults to today on app launch) |
| **Calendar Panel** | Top sliding drawer for date navigation (list view only) |
| ~~**Stage**~~ | Removed — `workout_stages` table dropped from Supabase; `stage_id` set to `null` on workout_exercises |
| ~~**Variation**~~ | Removed — `exercise_variations` table dropped; equipment is now a `text[]` field on `exercises` |

---

## Navigation

### Bottom Tab Bar (4 items)

| Tab | Purpose |
|-----|---------|
| **Sheets** | Primary landing — calendar panel, browse/create/edit sheets |
| **Start Workout** | Entry point for new workouts (manual or template) |
| **Exercise Library** | Browse all exercises (placeholder — future phase) |
| **Profile** | Sign out, future: historical workout summary |

---

## Data Model

### Database Schema

| Table | Records | Description |
|-------|---------|-------------|
| `exercises` | 151 | Exercise definitions (Bench Press, Squat, etc.) — equipment stored as `text[]` |
| `categories` | 20 | Workout categories across 4 groups |
| `profiles` | 2 | User accounts |
| `workouts` | — | User workout sessions |
| ~~`workout_stages`~~ | — | Dropped — `stage_id` nullable on `workout_exercises` |
| `workout_exercises` | — | Exercises in a workout |
| `sets` | — | Individual logged sets |
| `personal_records` | — | PR tracking (future) |

### Key Fields

**exercises:**
- `name`, `body_region`, `muscle_group`, `category_ids[]`, `specific_muscles[]`, `aliases[]`, `description`, `equipment text[]`

**workouts:**
- `user_id`, `workout_date`, `name`, `category_id`, `status` (active/completed), `notes`, `completed_at`

**workout_exercises:**
- `workout_id`, `stage_id`, `exercise_id`, `equipment text`, `sort_order`, `proposed_sets`, `proposed_reps_min`, `proposed_reps_max`, `proposed_weight`

**sets:**
- `workout_exercise_id`, `set_number`, `reps`, `weight`, `is_completed`, `completed_at`, `is_pr`

### Data Visibility

| Data | Visibility |
|------|------------|
| Exercise library | Shared between users |
| Workout history | Private per user |
| Set data (weights, reps) | Private per user |
| PRs, 1RM calculations | Private per user |
| Notes | Private per user |

---

## Category System

### Category Groups

| Tab | Categories |
|-----|------------|
| All | All categories + Free Workout |
| Splits | Push, Pull, Legs, Upper Body, Lower Body, Full Body |
| Muscle | Chest, Back, Shoulders, Arms, Core, Posterior Chain |
| Cardio | Cardio, Running, Cycling, Rowing |
| Conditioning | HIIT, MetCon, GPP, Circuit |

### Category → Muscle Group Mapping

| Category | Filters to Muscle Groups |
|----------|--------------------------|
| Push | Chest, Shoulders, Triceps |
| Pull | Back, Biceps, Rear Delts |
| Legs | Quads, Hamstrings, Glutes, Calves |
| Arms | Biceps, Triceps, Forearms |
| Upper Body | Chest, Back, Shoulders, Arms |
| Lower Body | Quads, Hamstrings, Glutes, Calves |
| Full Body | All |
| Core | Abs, Obliques, Lower Back |
| Posterior Chain | Hamstrings, Glutes, Lower Back, Erectors |

---

## Screens

### 1. Sheets (Primary Landing)

**Purpose:** Browse dates, view/create/edit sheets

**Layout:**
- Calendar panel (top drawer, list view)
- Focus date display
- Sheet content or empty state
- Bottom tab bar

**Swipe Navigation (pre-loaded carousel):**
- Swipe left/right on the content area navigates to next/previous day
- Adjacent dates are pre-rendered in a carousel (14 past days + today); swiping reveals already-loaded content
- 1:1 finger tracking; rubber-band effect at window edges
- If drag exceeds 25% of screen width (accounting for velocity), commits to next/previous day; otherwise springs back
- Capped at today — cannot swipe to future dates
- Only DatePages within ±3 of current position are mounted (~7 active at a time)
- Calendar panel date tap resets the carousel window centered on the selected date
- Updates focusDate state which syncs with calendar panel above

**States:**
- **No sheet:** "No workout" message + date + "(Today)" label if current day
- **Active sheet:** "Continue Sheet" button + "(Today)" label if current day
- **Completed sheet:** Workout summary inline (see below)

### 2. Calendar Panel

**Purpose:** Navigate between dates

**Implementation:** Custom `TopSheetScrollView` using React Native Animated + PanResponder

**View:** List only (no grid view)

**Snap Points:**
- Collapsed: 1 row visible
- Open: 7 rows visible

**Features:**
- Drag handle to expand/collapse
- Velocity-based snap detection
- Lazy loading for older dates (triggers when scrolling near top)
- Scrolls to position focus date at bottom of visible area

**Visual Structure:**
- Three-column layout:
  - Left: Timeline column with month labels
  - Center: Date cards (flex to fill space between columns)
  - Right: Current day button (when not viewing today)
- Timeline line runs vertically on left side
- Each row: timeline column (left) + date card (right)
- Date card shows: `{date}{ordinal} / {workout name or "No Workout"}` + completion dot if completed
- Focus date card has distinct background, non-focus cards have border
- Cards with completed workouts have visually distinct border

**Current Day Action Button:**
- Shows today's date with ordinal suffix (e.g., "7th")
- Only visible when viewing dates other than today
- Taps to jump focus back to current day
- Date cards dynamically adjust spacing to accommodate button when visible

**Month Labels (fake sticky effect):**

The goal: always show the relevant month label at the bottom of the visible area without true sticky positioning.

- **Inline labels**: Dot + month abbreviation (e.g., "Jan") positioned in timeline column
  - Appear at first and last row of each month block
  - Scroll with content
  - **Hidden when they match activeMonth** (avoids duplication with fixed overlay)

- **Fixed overlay**: Dot + month label pinned at bottom of visible area
  - Shows `activeMonth` (the month of the bottom-most visible row)
  - Timeline terminator (covers line below dot) only shown for final/most recent month

- **activeMonth tracking**:
  - When expanded: calculated from bottom-most visible row on scroll
  - When collapsed: set to focus date's month

**Example:** If scrolled so February rows are at the bottom:
- Fixed overlay shows "Feb"
- Any inline "Feb" labels are hidden (match activeMonth)
- Inline "Jan" or "Mar" labels remain visible (don't match)

**Collapsed State:**
- Single row visible (focus date positioned at bottom)
- All inline labels hidden
- Fixed overlay shows focus date's month
- Scroll disabled

### 3. Start Workout

**Purpose:** Entry point for creating new workouts

**Trigger:** Tap "Start Workout" in bottom nav

**Layout:**
- Panel with two options:
  - **Select Exercises** → Category Selection → Exercise Search
  - **Upload Template** → Upload screen

### 4. Category Selection

**Purpose:** Select workout type (manual flow only)

**Trigger:** "Select Exercises" from Start Workout panel

**Layout:**
- Tab bar: All | Splits | Muscle | Cardio | Conditioning
- Scrollable category cards with muscle group subtitles

**Behavior:**
- Selected category applies filter to Exercise Search
- Category becomes the workout type

### 5. Exercise Search

**Purpose:** Find and select exercises for workout

**Layout (top to bottom):**
1. `WorkoutHeader` — date, editable sheet name, "X Exercises Selected" subtitle, Start/Add + Cancel buttons, expandable selected exercises panel
2. Search bar — dark input field, search icon prefix, × clear button
3. "Exercises" section header — label on left, live filtered count on right
4. Scrollable exercise list — alphabetically grouped with letter headers
5. Bottom floating panel — unified search + filter (fixed, not in scroll)

**Entry Points:**
- From Category Selection (manual): Pre-filtered by selected category
- From Upload Template: Exercises + category pre-selected
- From Active Workout "Add Exercise" button: `existingWorkoutId` route param present; existing exercises pre-populated in header; header button shows "Add" instead of "Start"

**Data Loading:**
- All exercises loaded from DB at once (no server-side category filter); equipment is a `text[]` field on each exercise row (no join needed)
- All categories loaded for the filter panel
- When `existingWorkoutId` present: existing workout exercises fetched and pre-populated in `selectedExercises`

**Filtering (client-side):**
- Active categories stored as array; if empty, all exercises shown
- Category match: exercise's `category_ids` overlaps with active category IDs
- Search query applied on top of category filter; matches against exercise name and aliases array
- "Exercises" count reflects current filtered result

**Exercise Cards:**
- Subtitle format: `${muscle_group} (${specific_muscles.join(' & ')})` — falls back to `${muscle_group}` if no specific muscles
- No exercise images (deferred to future phase)
- No info icons (deferred to Exercise Detail phase)
- **Single-variation card, unselected:** dark card, `+` button on right; tapping anywhere adds
- **Single-variation card, selected:** white card, dark text, `×` button on right; tapping anywhere removes
- **Multi-variation card, collapsed, no selection:** dark card, chevron on right
- **Multi-variation card, collapsed, with selection:** white card; below a divider, each selected variation rendered as its own row with `×`; equipment text not shown in header
- **Multi-variation card, expanded:** white card, divider, variation rows below; unselected rows have `+`, selected rows have `×` + light gray `#D5D5D5` pill bg (`borderRadius: 32, height: 56`), dark `#1B1B1B` text
- Tapping a multi-variation card header opens/closes accordion; equipment text NOT shown in header during expanded state

**Bottom Panel (unified, always visible):**
- Single `Animated.View` with `height` animation; `overflow: hidden`
- Light gray `#F0F0F0` bg, rounded top corners, shadow above
- **Collapsed state:** search bar + filter chips row + filter icon button (3-lines with dots)
  - Active category chips: dark pill with `×` + label
  - Filter icon: `options-outline` Ionicons
- **Expanded state (filter panel):** animated to 78% screen height; search hidden; shows category list + `×` close button
  - Active category row: dark bg, white text, `×`
  - Inactive row: white bg, dark text, `+`
  - Live "X exercises Available" count
  - Uses `Animated.timing` (no Reanimated); `collapsedHeightRef` tracks natural collapsed height via `onLayout`

**Keyboard Behavior:**
- When keyboard opens: bottom panel rises above keyboard (KeyboardAvoidingView wrapper); WorkoutHeader collapses and slides off screen (animated marginTop); exercise list fills viewport with safe area (island) padding
- When keyboard closes: header slides back; bottom panel returns to normal position
- Safe area padding on bottom panel adjusts (reduced when keyboard visible, full when hidden)

**Sheet Name:**
- Initialized from `categoryName` route param, editable by user
- Pencil icon in header (next to "Sheet") opens a rename modal
- Modal: dark card, auto-focused text input, Cancel + Save buttons
- Saved name used in the workout DB record on "Start"

**Selected Exercises Panel (in WorkoutHeader):**
- Header shows "X Exercises Selected" as subtitle at all times
- Selected items subtitle format: `equipment · muscleGroup` (e.g., "Dumbbells · Arms")
- When exercises are selected, a drag handle bar appears at the bottom of the header
- Dragging down expands a list of selected exercises within the header panel
- Dragging up collapses it back
- Each row shows exercise name (bold) + `equipment · muscleGroup` subtitle + `×` remove button + `reorder-three` hamburger icon
- Touch the hamburger icon and drag up/down to reorder exercises; committed order used as `sort_order` on DB insert
- In add-to-existing mode: pre-existing exercises cannot be removed via `×`

**Start/Add Button:**
- Lives in the header, next to Cancel (green pill, compact)
- Only rendered when `selectedExercises.length > 0`
- Label: "Start" (new workout) or "Add" (add-to-existing mode)
- In add-to-existing mode: inserts new exercises and updates sort_order for existing exercises; navigates back to Active Workout
- All exercises (existing and new) are assigned `sort_order` based on their index in the full panel order; reordering in the panel affects the final order of all exercises in the Active Workout

**Prevents duplicate exercise selection**

### 6. Upload Template

**Purpose:** Generate and paste AI workout templates

**Trigger:** "Upload Template" from Start Workout panel

**Layout (top to bottom):**
1. Title + subtitle ("Generate with AI" / "Select a category, copy the prompt, and paste it into your AI.")
2. Category group tab bar — inline row (All / Splits / Muscle / Cardio / Conditioning); filters the category dropdown; no background; items spread across full width
3. Category dropdown — opens modal with filtered categories; subtitles from `muscle_groups` DB field; ordered by `display_order`
4. Exercise count dropdown — 3 to 10 (default 6)
5. Generated prompt — contained card with prompt text + "Copy Prompt" button (right-aligned, inside container); only shown when category is selected
6. Text input (multiline, min height 120) — "Paste your template here..."
7. Submit button

**AI Prompt Generation:**
- Prompt built dynamically from selected category + exercise count
- Includes link to public exercise library endpoint
- Template format example matches selected category name
- Instructs AI to filter exercises by selected category, match names exactly, return as plain text code block
- Instructional text says "paste it into your AI" (no specific AI brand)

**Template Parsing:**
- First line checked against exercise regex (`Name (Equipment) SetsxReps`); if it matches, treated as an exercise and category defaults to "Workout"; otherwise first line is the category/workout name
- `[Stage Name]` headers are skipped (stages no longer used)
- Exercise format: `Name (Equipment) SetsxReps` or `Name SetsxReps-RepsMax`

**Flow:**
1. Select category + exercise count → copy generated prompt → paste into AI
2. Paste AI response into text input → Submit
3. Validates exercises against library
4. Navigates directly to Exercise Search with:
   - Exercises pre-selected (with proposed sets + reps from template)
   - Category pre-set from template name
5. User can modify selection
6. Start Workout → Active Workout Sheet (sets pre-created from template proposals)

### 7. Active Workout Sheet

**Purpose:** Log exercises, sets, reps, weights during workout

**Header:**
- Uses shared `WorkoutHeader` component (matches ExerciseSearch header: dark panel, date/name/pencil/Cancel)
- Date + workout name displayed; pencil icon opens rename modal → saves to `workouts.name` in DB
- No Start/Add buttons; no expandable selected panel (header is display-only in this context)

**Layout:**
- Flat sorted exercise list (no stage headers, no stage grouping)
- Each exercise card has trash icon (top-right) for deletion
- Exercise cards with set logging table (flex column widths, spans full card width)
- "Add Exercise" button below the list
- "Complete Workout" button at bottom (disabled until sets added)

**Exercise Card:**
- Header row: exercise name + muscle group (left) + trash icon (right)
- Set table columns (flex proportions): Set# | Reps | Lbs | ✓
- Previous set data shown at bottom of card, inline with "+ Add Set" (format: "Previous [reps]×[weight]" on left, "+ Add Set" on right)
- Trash icon: confirms via Alert → deletes all sets for that exercise → deletes workout_exercise → reloads

**Set Table Input Behavior:**
- Reps and weight inputs use local state for instant response
- DB save triggers `onBlur` only (no per-keystroke reload)
- Toggling ✓ also flushes pending reps/weight input values to DB in the same update (no data loss if user taps ✓ without blurring the input first)
- Toggle complete is awaited (not fire-and-forget) to prevent race conditions with Complete Workout
- `useEffect` on workout data syncs new set IDs into local state without overwriting in-progress edits
- Toggle complete, add set, and delete set update local state optimistically (no full reload)
- When "+ Add Set" is tapped, the previous set is automatically marked as completed if it wasn't already
- "+ Add Set" duplicates the last set's reps and weight values into the new set

**Set Pre-Population:**
- *Template workout*: N sets created per exercise (from `proposed_sets`); reps pre-filled from `proposed_reps_min`; weight pre-filled from previous best
- *Custom/manual workout*: 1 set created per exercise; reps + weight pre-filled from previous best
- *Add Set*: new set inherits last set's current reps and weight input values

**Complete Workout:**
- If uncompleted sets exist, user is prompted: "Mark all as complete?"
  - **Yes:** flushes pending reps/weight input values, marks all incomplete sets as completed, then completes workout
  - **No:** deletes incomplete sets, then completes workout (only previously completed sets saved)
- Prevents accidentally submitting a workout with 0 logged data

**Add Exercise Flow:**
- "Add Exercise" button navigates to ExerciseSearch with `existingWorkoutId` param
- ExerciseSearch pre-populates header panel with all current workout exercises (locked — cannot be removed)
- User selects additional exercises; can reorder them in the header panel via drag handles
- On "Add": filters to only newly selected exercises (pre-existing ones excluded); inserts in the reordered sequence with `sort_order` starting from current exercise count (new exercises always append after existing ones); navigates back to Active Workout

**Cancel/Leave Behavior:**
- Tapping Cancel or navigating away shows confirmation dialog
- Confirming deletes the in-progress workout entirely (no draft saved)

**Behavior:**
- Swipe to delete sets
- Complete button disabled until sets added

### 8. Workout Summary

**Purpose:** View completed workout stats

**Display Context:**
- Inline on Sheets screen (HomeScreen) when selecting a date with a completed workout
- After completing a workout, navigation resets to MainTabs with `initialFocusDate` = workout date, landing directly on the summary

**Header:**
- Date line with "(Today)" suffix if current day (e.g., "March 6th (Today)")
- Workout name as large bold title below date, with action icons on same row:
  - Edit icon (`create-outline`, white) — reopens workout as active, navigates to ActiveWorkout
  - Delete icon (`trash-outline`, red) — confirms then permanently deletes workout + all exercises + sets; refreshes calendar

**Stats Section:**
- "Workout Summary" section title
- Four-column layout with divider lines between columns:
  - Exercises | Sets | Reps | Volume
  - Label on top, bold value below

**Notes Section:**
- "Workout Notes" label
- Note text in muted color

**Exercise List:**
- Flat sorted list (no stage grouping)
- Exercise cards (accordion-style, collapsed by default):
  - **Collapsed state:**
    - Header: exercise name + equipment/muscle group subtitle + chevron indicator
    - "1RM [value] lbs" shown inline on right side of subtitle row (smaller, muted text)
    - No divider, no detail rows
  - **Expanded state:**
    - Same header (1RM inline hidden)
    - Divider line
    - Detail rows: 1 Rep Max, Total Volume, PR (highest weight lifted)
    - Set detail table showing: Set number / Reps / Weight
  - Toggle expanded/collapsed by tapping header

**Duplicate Sheet Button:**
- Shows for past completed workouts only
- Creates new workout for today with same exercises (no sets)
- Navigates to Active Workout screen

**Components Used:**
- `ExerciseSummaryCard` — Accordion exercise card with expand/collapse

### 9. Exercise Library (Future)

**Purpose:** Browse all exercises (read-only)

**Status:** Placeholder in nav, content coming in later phase

### 10. Profile

**Purpose:** User settings and stats

**Current:** Sign out button

**Future:** Historical workout summary, stats

### 11. Exercise Detail

**Parent Level:**
- Exercise name and description
- Muscle group and workout types
- Equipment variations list
- Aggregate stats (total reps)

**Variation Level:**
- Specific equipment version
- 1RM and total reps for this variation

---

## Template Format

Claude generates workout templates in simple text format:

```
Pull Day

[Primer]
Face Pull 2x15
Band Pull Apart 2x15

[Strength]
Lat Pulldown 3x8-10
Bent Over Row 3x10-12
Seated Cable Row 3x10-12

[Capacity]
Bicep Curl 3x10-12
Hammer Curl 3x10-12
```

**Parsing rules:**
- Line 1: If it matches exercise pattern (`Name (Equipment) SetsxReps`), treated as an exercise and category defaults to "Workout"; otherwise treated as workout name/category
- `[Stage Name]`: Stage headers (skipped — stages no longer used)
- `Exercise Name SETSxREPS` or `Exercise Name (Equipment) SETSxREPS-REPSMAX`: Exercise with sets/reps

**Validation:**
- Exercise names must match exactly against database
- If no category line detected → "Workout"

---

## User Flows

### Manual Workout
1. Sheets → Start Workout → "Select Exercises"
2. Category Selection → pick category (e.g., Pull)
3. Exercise Search (pre-filtered) → select exercises
4. Start Workout → Active Workout Sheet
5. Log sets → Complete Workout → Summary

### Template Workout
1. Sheets → Start Workout → "Upload Template"
2. Paste template → Submit
3. Exercise Search with pre-selected exercises + category
4. Modify if needed → Start Workout
5. Active Workout Sheet → Complete → Summary

### Duplicate Past Workout
1. Calendar Panel → tap past date
2. Workout Summary → "Duplicate Sheet"
3. Exercise Search with exercises pre-selected
4. Modify if needed → Start Workout

---

## Calculations

### 1RM Estimate (Brzycki Formula)
```
1RM = weight × (36 / (37 - reps))
```

### Total Volume
```
Volume = Σ (sets × reps × weight)
```

### PR Detection
Auto-detected when weight × reps exceeds previous best for that exercise variation.

---

## Implementation Status

### Completed
- [x] User authentication
- [x] Sheets screen with calendar panel
- [x] Calendar panel (list view, drag gestures, sticky months)
- [x] Category selection
- [x] Exercise search with filtering
- [x] Active workout logging
- [x] Workout summary with stats
- [x] Template upload and parsing
- [x] Scroll to focus date on collapse
- [x] Bottom tab navigation (4 items)

### In Progress
- [ ] Workout Summary redesign (Figma alignment)
  - [x] New components: StatRow, ExerciseSummaryCard
  - [x] Flat exercise list (stages removed)
  - [ ] Timeline line connecting cards (needs adjustment)
  - [ ] Edit functionality for date/notes
- [ ] Start Workout panel (branch to manual/upload)
- [x] Exercise Search redesign (Figma alignment)
  - [x] WorkoutHeader with expandable selected panel, Start/Add button, editable sheet name
  - [x] Client-side category + search filtering
  - [x] Unified bottom panel (animated height, filter + search merged)
  - [x] Category filter panel (expanded state of bottom panel)
  - [x] Card states: single-variation tap-to-toggle, multi-variation accordion, white on selection
  - [x] Closed card selected rows (individual rows with × below divider)
  - [x] Add-to-existing workout mode (`existingWorkoutId` param)
  - [x] Drag-to-reorder selected exercises (hamburger handle, RN responder system)
  - [ ] Exercise images (deferred)
  - [ ] Info icon / Exercise Detail link (deferred)
- [x] Active Workout Sheet redesign
  - [x] WorkoutHeader (shared with ExerciseSearch)
  - [x] Flat exercise list (stages removed)
  - [x] Edit workout title (pencil → modal → DB save)
  - [x] Trash icon per exercise (delete exercise + sets)
  - [x] Add Exercise button → ExerciseSearch add-to-existing flow
  - [x] Flex column widths (full card width)
  - [x] Local input state + onBlur DB save (no per-keystroke reload)
- [ ] Exercise library screen
- [ ] PR detection in UI
- [ ] Profile stats

### Deferred (v1.1+)
- [ ] Exercise images
- [ ] Body highlighter
- [ ] Save workout as template
- [ ] Calendar panel upgrade to @gorhom/bottom-sheet (requires iOS Simulator or standalone build)
- [ ] Reanimated v3 for smoother animations (requires iOS Simulator or standalone build)

### Deferred (v2.0+)
- [ ] Apple Watch companion
- [ ] Voice input for sets
- [ ] RPE tagging

---

## Decisions Log

| Decision | Resolution |
|----------|------------|
| Default stage name | "General Workout" |
| Default category (no template category) | "General Workout" |
| Reps pre-fill | Lower bound from template; previous best if no template |
| Exercise reordering | Drag and drop |
| Filter selection | Multi-select enabled |
| Template format | Simple text (not JSON) |
| Calendar view | List only (no grid) |
| Calendar panel | Top sheet with 2 snap points (collapsed/open) |
| Animation library | React Native Animated (not Reanimated — Expo Go compatibility) |
| One workout per day | Enforced — shows alert if workout exists |
| Start Workout entry | Single button → panel with manual/upload options |
| Bottom nav | 4 items (Sheets, Start Workout, Exercise Library, Profile) |
| Stages in UI | Removed — `workout_stages` table dropped; `stage_id` set to `null` on workout_exercises |
| Cancel/leave Active Workout | Shows confirmation dialog; confirming deletes the workout entirely (no draft state) |
| Equipment storage | `text[]` on `exercises` table — no separate `exercise_variations` table |
| Template flow | Skips TemplatePreview; goes directly to ExerciseSearch with pre-selections |
| Categories in template | Not required to match DB categories — used as workout name only |
| WorkoutSummaryScreen | Removed — summary is the inline sheet view on HomeScreen |
| Post-workout navigation | `navigation.reset` to MainTabs with `initialFocusDate` = workout date |
| Template weight pre-fill | Skipped when `proposed_reps_min` is set; reps from template, weight left blank |

---

## Technical Notes

### Expo Go Limitations
- Reanimated version must match Expo Go's bundled version
- Current implementation uses standard Animated API for compatibility
- Standalone builds via EAS have no such restrictions

### Column Name Reference
Actual database columns (not legacy names):
- `sort_order` (not `order_index`)
- `proposed_sets` (not `target_sets`)
- `proposed_reps_min/max` (not `target_reps_min/max`)
- `is_completed` (not `completed`)

### Key Components
- `TopSheetScrollView` — Custom top sheet with PanResponder
- `CalendarPanel` — Date navigation with lazy loading
- `CalendarDateRow` — Individual date row with inline month labels
- `StatRow` — Label/value row for stats display
- `ExerciseSummaryCard` — Accordion exercise card for completed workout summary
- `WorkoutHeader` — Dark panel shared across ExerciseSearch and ActiveWorkout; supports editable name (pencil → modal), subtitle, expandable selected exercises list; Cancel button on left, Start/Save on right (drag handle bar, PanResponder), drag-to-reorder per row (RN responder system, `onReorderItems` prop), optional Start/Add button (green pill) + Cancel button (red pill); `startLabel` prop overrides button text

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v1.0 | In Progress | MVP: Manual + Template Upload + Duplicate |
| v1.1 | Future | Exercise images, body highlighter |
| v2.0 | Future | Apple Watch, voice input |
