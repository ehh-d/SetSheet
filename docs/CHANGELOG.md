# Changelog

All notable changes to SetSheet are documented in this file.

---

## [2026-02-07] - Exercise Accordion Cards, Duplicate Sheet, Current Day Action

### Added
- **Collapsible Exercise Cards:** `ExerciseSummaryCard` now functions as accordion-style cards (collapsed by default)
  - Collapsed state: Exercise header + Total Volume + 1 Rep Max (estimated using Brzycki formula)
  - Expanded state: Same info + detailed set table (Set / Reps / Lbs / PR columns with star icons)
  - 1RM calculation: `calculate1RM(weight, reps)` using Brzycki formula, displays highest estimate across completed sets
  - Total Volume: Sum of (reps × weight) for all completed sets
  - Toggle via header tap
- **Duplicate Sheet Button:** Added to HomeScreen for past completed workouts
  - Creates new workout for today with same stages/exercises (no sets)
  - Navigates to ActiveWorkout screen
- **Current Day Action Button:** Added to CalendarPanel
  - 32×32 bordered button showing today's date with ordinal suffix (e.g., "7th")
  - Only visible when viewing dates other than today
  - Positioned on right side of calendar panel, moves with drawer
  - Taps to jump focus back to current day
- **Three-column layout:** Calendar drawer now uses consistent left/right padding
  - Left: Month labels (scrolling + fixed)
  - Center: Date cards (flex to fill available space)
  - Right: Current day button (when viewing past/future dates)

### Changed
- **ExerciseSummaryCard redesign:** Removed info icon, converted to accordion with 1RM and volume metrics
- **CalendarDateRow:** Cards now dynamically adjust right margin when current day button is visible
  - `marginRight: 52px` when button showing (32px button + 8px gap + 12px base margin)
  - `marginRight: 12px` when button hidden
- **Supabase queries:** Added `is_pr` field to sets queries in HomeScreen and WorkoutSummaryScreen

### Fixed
- **Date timezone bug:** Fixed date display showing wrong day due to UTC offset
  - Replaced `new Date(dateString)` with `parseISO(dateString)` across all screens (HomeScreen, WorkoutSummaryScreen, ActiveWorkoutScreen, CategorySelectionScreen)
  - Fixed `StartWorkoutScreen` date fallback using `format(new Date(), 'yyyy-MM-dd')` instead of `toISOString().split('T')[0]`
- **Calendar card borders:** Restored visible borders on all date cards (border: `#333333`, workout cards: `#505050`)
- **Date ordinal suffixes:** Properly superscripted and top-aligned throughout app
  - Calendar cards: day number + smaller superscript suffix
  - Workout summary header: "January 7" + superscript "th"

### Technical Notes
- Brzycki 1RM formula: `weight × (36 / (37 - reps))`
- Formula breaks down at 37+ reps, returns weight as-is
- Date strings stored as `yyyy-MM-dd` format in database
- `parseISO()` correctly interprets as local midnight, avoiding timezone shift

---

## [2026-02-03] - Workout Summary Redesign (In Progress)

### Added
- **New Reusable Components:**
  - `components/timeline/TimelineSidebar.tsx` — Vertical timeline line with optional dot
  - `components/timeline/StageHeader.tsx` — Stage title with timeline dot
  - `components/stats/StatRow.tsx` — Label/value row for stats display
  - `components/exercise/ExerciseSummaryCard.tsx` — Exercise card with image placeholder, title, muscle group, info icon, and set summary

### Changed
- **HomeScreen Completed Workout View:** Now uses new components for inline summary display
  - Row-based stats in rounded card (replaces grid layout)
  - Exercise cards grouped by stage with timeline sidebar
  - Stage headers with timeline dots
- **WorkoutSummaryScreen:** Redesigned to match Figma specs
  - Header: Date title + edit icon, workout name subtitle
  - Stats section with StatRow components
  - Notes section with edit icon
  - Exercise list grouped by workout stages
- **Supabase Query:** Updated to fetch `workout_stages` for stage grouping
- **Styling Updates:**
  - Card background: `#1B1B1B`
  - Timeline color: `#757575`
  - Card border radius: `32px`
  - Exercise image placeholder: `48x48` white background

### Known Issues
- Timeline line may need further adjustment for connecting between cards
- Edit icons are placeholders (not functional yet)

---

## [2026-02-02] - Date Card Styling Update

### Changed
- **Date Card Styles:** Updated to match Figma designs
  - Selected (focus date): solid `#1B1B1B` background
  - Workout completed (non-selected): transparent with `1px solid #505050` border
  - Selected + has workout: both background and border applied
- **Date Card Typography:**
  - Font size: 12px (was 15px)
  - Text color: `#D5D5D5` (was white)
  - Border radius: 8px (was 10px)
  - Completion dot: 4px (was 6px)
- **Scroll Animation:** Smooth animated scroll to focus date after panel open/close

### Added
- `isSelected` prop to CalendarDateRow for focus date detection
- `onHeightChange` callback to TopSheetScrollView (for future use)

---

## [2026-01-31] - Calendar Panel Refinements

### Added
- **Sticky Month Labels:** Simplified "fake sticky" implementation:
  - Inline labels at top and bottom of each month block
  - Fixed overlay label pinned at bottom showing active month
  - Labels appear beside date cards (no gaps)

### Changed
- **Month Label Architecture:** Replaced complex scroll-based positioning with simpler approach:
  - Removed `visibleLabels` state and position calculations
  - Added `activeMonth` state with ref for fast updates
  - `handleScroll` now only handles lazy loading + determining active month
- **Calendar View:** Removed grid view, list view only

### Fixed
- **Scroll to Focus Date on Panel Close:** Panel now scrolls to show selected date when collapsing
  - Uses `useEffect` watching `currentSnapIndex` instead of setTimeout
  - 300ms delay allows animation to settle before scrolling

---

## [2026-01-30] - Calendar Panel & Sheet View Refactor

### Added
- **TopSheetScrollView Component:** Custom top sheet with:
  - Smooth drag gestures via PanResponder
  - Spring animations via React Native Animated
  - Configurable snap points (collapsed/open)
  - Rubber banding at edges
  - Velocity-based snap detection
- **Calendar Panel Styling:**
  - Card-style drawer with shadow
  - Background: `#272727`
  - Border radius: `24px` (bottom corners)
  - 8px margin from viewport edges

### Changed
- **HomeScreen → Sheets:** Primary landing screen renamed
  - Loads sheet for any selected date (not just today)
  - Shows date even when no sheet exists
  - Renamed: `selectedDate` → `focusDate`, `todayWorkout` → `sheet`
- **Calendar Panel Gestures:**
  - Full handle area draggable (56px height)
  - Removed `isAtBottom` restriction
- **Calendar Shows All Dates:** Every date displayed, not just dates with workouts

### Technical Notes
- Using React Native Animated + PanResponder (not Reanimated — Expo Go version mismatch)
- Removed `react-native-reanimated` dependency entirely

---

## [2026-01-25] - Critical Bug Fixes & Database Cleanup

### Fixed
- **React Hooks Violation:** Removed `useRef` from inside `.map()` in ActiveWorkoutScreen
- **Schema Cache Errors:** Fixed all column name mismatches:
  - `order_index` → `sort_order`
  - `target_sets` → `proposed_sets`
  - `target_reps_min/max` → `proposed_reps_min/max`
  - `completed` → `is_completed`
  - Removed `started_at` (doesn't exist)
- **WorkoutSummaryScreen Blank:** Fixed column name errors
- **HomeScreen Not Showing Active Workouts:** Now displays both active and completed
- **Duplicate Exercise Selection:** Prevented adding same variation twice
- **Visual Feedback:** White background + X icon for selected exercises

### Changed
- **Workout Duplicate Prevention:** Alert with options instead of auto-delete
- **Complete Workout Button:** Disabled when no sets added
- **Multi-Equipment Exercise UX:** Removed + button from parent row when variations shown

---

## [Phase 3] - Template Upload System

### Added
- Upload Template screen with multi-line text input
- Template parser supporting categories, stages, and exercise formats
- Exercises pre-selected in Exercise Search after template upload
- Category auto-applied from template (defaults to "General Workout" if none)

---

## [Phase 2] - UX Polish & Enhancements

### Added
- Previous workout data in "Previous" column
- Exercise filtering by muscle group
- Swipe-to-delete for sets
- Smooth animations and gestures

---

## [Phase 1] - Core Workout Flow

### Added
- Authentication (login, auto-login, sign out)
- Home screen with calendar panel
- Category selection with filters
- Exercise search with equipment variations
- Active workout logging with set tracking
- Workout summary with stats and calculations
- Complete Supabase backend integration

---

## Database Statistics

| Table | Count | Notes |
|-------|-------|-------|
| exercises | 142 | All have descriptions |
| exercise_variations | 376 | Avg 2.6 per exercise |
| categories | 20 | 4 category groups |
| profiles | 2 | Test accounts |
