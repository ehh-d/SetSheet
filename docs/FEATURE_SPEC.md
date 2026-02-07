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
| **Stage** | Optional workout section (e.g., Primer, Strength, Capacity) |
| **Variation** | Equipment-specific version of an exercise (e.g., Barbell Bench Press) |

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
| `exercises` | 142 | Exercise definitions (Bench Press, Squat, etc.) |
| `exercise_variations` | 376 | Equipment-specific versions (~2.6 per exercise) |
| `categories` | 20 | Workout categories across 4 groups |
| `profiles` | 2 | User accounts |
| `workouts` | — | User workout sessions |
| `workout_stages` | — | Optional workout sections |
| `workout_exercises` | — | Exercises in a workout |
| `sets` | — | Individual logged sets |
| `personal_records` | — | PR tracking (future) |

### Key Fields

**exercises:**
- `name`, `muscle_group`, `category_ids[]`, `specific_muscles[]`, `description`

**exercise_variations:**
- `exercise_id`, `equipment`

**workouts:**
- `user_id`, `workout_date`, `name`, `category_id`, `status` (active/completed), `notes`, `completed_at`

**workout_exercises:**
- `workout_id`, `stage_id`, `exercise_variation_id`, `sort_order`, `proposed_sets`, `proposed_reps_min`, `proposed_reps_max`, `proposed_weight`

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

**States:**
- **No sheet:** "No sheet started" message
- **Active sheet:** "Continue Workout" option
- **Completed sheet:** Workout summary inline

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

**Layout:**
- Search input with filter chips
- Alphabetical exercise list with section headers
- Equipment variations expandable per exercise
- Selected exercises section at top

**Entry Points:**
- From Category Selection (manual): Pre-filtered by category
- From Upload Template: Exercises + category pre-selected

**Behavior:**
- Category filter is "soft" — can be removed to show all exercises
- Multi-select for filters
- Visual feedback for selected exercises (white background + X icon)
- Prevents duplicate exercise selection

### 6. Upload Template

**Purpose:** Paste workout template from Claude

**Trigger:** "Upload Template" from Start Workout panel

**Layout:**
- Text input (multiline)
- Submit button

**Flow:**
1. Paste Claude-formatted template
2. Submit → validates exercises against library
3. If valid → Exercise Search with:
   - Exercises pre-selected
   - Category pre-set from template (or "General Workout" if none)
4. User can modify selection
5. Start Workout → Active Workout Sheet

### 7. Active Workout Sheet

**Purpose:** Log exercises, sets, reps, weights during workout

**Layout:**
- Stage headers (optional)
- Exercise cards with set logging table
- Previous column showing last session data
- Add set / Delete exercise controls

**Behavior:**
- Swipe to delete sets
- Auto-populate weight from history
- Complete button disabled until sets added

### 8. Workout Summary

**Purpose:** View completed workout stats

**Display Context:**
- Inline on Sheets screen when selecting a date with a completed workout
- Also accessible via WorkoutSummaryScreen (after completing active workout)

**Header:**
- Date as title (e.g., "January 7th") with edit icon
- Workout name as subtitle (e.g., "Pull Day")

**Stats Section:**
- "Exercises" section header
- Row-based stats in rounded card (`#1B1B1B`, 32px radius):
  - Exercises count
  - Total Sets
  - Total Reps
  - Total Volume (lbs)

**Notes Section:**
- "Workout Notes" label with edit icon
- Note text in muted color

**Exercise List:**
- Grouped by workout stage (from `workout_stages` table)
- Stage headers with timeline dot + title
- Exercise cards (accordion-style, collapsed by default):
  - **Collapsed state:**
    - Header: Image placeholder + exercise name + muscle group + chevron indicator
    - Total Volume (see Calculations section)
    - 1 Rep Max estimate (Brzycki formula, highest across completed sets)
  - **Expanded state:**
    - Same header with chevron indicator
    - Total Volume and 1 Rep Max
    - Set detail table showing: Set number / Reps / Weight / PR indicator
  - Toggle expanded/collapsed by tapping header

**Duplicate Sheet Button:**
- Shows for past completed workouts only
- Creates new workout for today with same stages and exercises (no sets)
- Navigates to Active Workout screen

**Components Used:**
- `StatRow` — Label/value row for stats and metric rows within cards
- `StageHeader` — Timeline dot + stage title
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
- Line 1: Workout name/category
- `[Stage Name]`: Stage headers (optional)
- `Exercise Name SETSxREPS`: Exercise with sets/reps

**Validation:**
- Exercise names must match exactly against database
- Stages optional — defaults to "General Workout"
- If no category specified → "General Workout"

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
  - [x] New components: StatRow, StageHeader, ExerciseSummaryCard
  - [x] Stage grouping with timeline
  - [ ] Timeline line connecting cards (needs adjustment)
  - [ ] Edit functionality for date/notes
- [ ] Start Workout panel (branch to manual/upload)
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
| Reps pre-fill | Start at 0 (or lower bound from template) |
| Exercise reordering | Drag and drop |
| Filter selection | Multi-select enabled |
| Template format | Simple text (not JSON) |
| Calendar view | List only (no grid) |
| Calendar panel | Top sheet with 2 snap points (collapsed/open) |
| Animation library | React Native Animated (not Reanimated — Expo Go compatibility) |
| One workout per day | Enforced — shows alert if workout exists |
| Start Workout entry | Single button → panel with manual/upload options |
| Bottom nav | 4 items (Sheets, Start Workout, Exercise Library, Profile) |

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
- `StageHeader` — Timeline dot + stage title for workout stages
- `ExerciseSummaryCard` — Exercise card with timeline sidebar for completed workouts

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v1.0 | In Progress | MVP: Manual + Template Upload + Duplicate |
| v1.1 | Future | Exercise images, body highlighter |
| v2.0 | Future | Apple Watch, voice input |
