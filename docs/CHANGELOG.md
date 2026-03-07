# Changelog

All notable changes to SetSheet are documented in this file.

---

## [2026-03-07] - Swipe Navigation Carousel Rebuild

### Changed
- **Home Screen: Swipe navigation rebuilt as pre-loaded carousel** — replaced single-page animated swipe with a multi-page carousel; adjacent dates are pre-rendered so swiping reveals already-loaded content with no flash or reload
  - Window spans 14 past days + today; capped at today (no future dates)
  - Only DatePages within ±3 of current position are mounted (~7 active at a time)
  - 1:1 finger tracking during swipe (removed 40% dampening); rubber-band at window edges
  - Appending future dates removed; calendar panel used for jumping to distant dates
  - Calendar date tap resets the window centered on the selected date
- **DatePage wrapped in React.memo** — prevents unnecessary re-renders when parent state changes (e.g., focusDate update for calendar sync)
- **DatePage: Loading state only on initial fetch** — re-fetches update data silently in background without flashing a loading spinner
- **WORKFLOW.md: Session start** — opens iOS Simulator directly instead of starting Metro bundler

### Added
- **Upload Template: AI prompt generation** — category dropdown and exercise count dropdown build a dynamic prompt for users to paste into any AI; prompt includes the public exercise library URL, selected category filter, template format example, and exercise count instruction
- **Upload Template: Category group tab bar** — inline tab bar (All / Splits / Muscle / Cardio / Conditioning) on screen filters the category dropdown; selecting a tab clears the selected category if it doesn't belong to the new group
- **Upload Template: Exercise count picker** — dropdown (3–10, default 6) adds "Select N exercises. Distribute evenly across the specific muscles in this category." to the prompt

### Changed
- **Upload Template: Layout simplified** — removed standalone Template Format section; removed background from Generate with AI section; prompt displayed in its own container with Copy Prompt button inside; input field minHeight reduced to 120; placeholder "Paste your template here..."
- **Upload Template: Instructional text** — says "paste it into your AI" (no specific AI brand mentioned)
- **Dynamic categories everywhere** — removed hardcoded `CATEGORY_GROUPS` and `CATEGORY_SUBTITLES` maps from CategorySelectionScreen, UploadTemplateScreen, and ExerciseSearchScreen; tab filtering now uses `category_group` column; subtitles now use `muscle_groups` array joined as comma-separated string; all pulled from Supabase
- **Categories ordered by display_order** — all screens (CategorySelection, ExerciseSearch, UploadTemplate) now order categories by `display_order` instead of `name`
- **`stage_id` fully removed** — removed `stage_id` from workout_exercises inserts in ExerciseSearchScreen and from `database.types.ts`; `workout_stages` FK relationship removed from types
- **Active Workout: Set completion flushes input values** — toggling ✓ now saves pending reps/weight from input fields to DB in the same update (previously only saved on blur, so values could be lost if user tapped ✓ without tapping out of the field first)
- **Active Workout: "Yes" auto-complete flushes inputs** — tapping "Yes" on the incomplete sets prompt now also saves pending reps/weight values before marking sets complete
- **Active Workout: Toggle set complete awaits DB** — `is_completed` update is now awaited instead of fire-and-forget, preventing race conditions where sets appeared incomplete in the completed workout view

### Fixed
- **Swipe flash resolved** — eliminated brief flash of old page content after swipe completes (known issue from 2026-03-06)
- **Future date swiping blocked** — prevented swiping past today, which caused CalendarPanel to cycle through invalid months
- **Template parser: first exercise eaten as category** — first line was always treated as workout name; now checks if line 1 matches the exercise regex pattern (`Name (Equipment) SetsxReps`) and if so, uses "Workout" as the default category and parses line 1 as an exercise
- **workout_stages table error** — `workout_stages` table was dropped from Supabase but ExerciseSearchScreen still queried/inserted into it; removed both references

---

## [2026-03-06] - Active Workout, Home Screen, Swipe Navigation

### Added
- **Home Screen: Swipe navigation** — swipe left/right on the content area to navigate between dates; updates calendar selection; uses pan gesture with drag effect (snaps to next/previous day or springs back)
- **Home Screen: Workout summary stats columns** — Exercises, Sets, Reps, Volume displayed as four columns with divider lines (replaced row-based stat list)

### Changed
- **Active Workout: Previous column relocated** — removed "Previous" column from set table; previous set data now shown at bottom of exercise card inline with "+ Add Set" (format: "Previous 10×135")
- **Active Workout: Set input spacing** — 8px gap between Reps and Lbs input fields
- **Active Workout: "+ Add Set" text** — changed from gray to white
- **Active Workout: Exercise detail spacing** — added 4px margin between exercise name and equipment/muscle group subtitle
- **Active Workout: Complete workout (incomplete sets)** — "No" on incomplete sets prompt now deletes those sets before completing (previously kept them)
- **Home Screen: Completed workout query fixed** — removed `workout_stages` join that was failing with PGRST200 error (relationship no longer exists); workouts now load and display correctly
- **Home Screen: Header layout** — date line with "(Today)" on top, workout title + edit/delete icons on same row below
- **Home Screen: Icon colors** — edit pencil is white, trash bin is red
- **Home Screen: Body padding** — 20px horizontal padding on summary header, stats, and workout summary title
- **Home Screen: "Today" label** — combined with date on one line in sentence case: "March 6th (Today)"
- **Exercise Summary Card: Image placeholder removed** — title and subtitle take full width
- **Exercise Summary Card: Title size** — reduced from 24px to 20px
- **Exercise Summary Card: Equipment shown** — subtitle now shows "Equipment • Muscle Group"
- **Exercise Summary Card: 1RM inline (collapsed)** — shown as "1RM 45 lbs" on the right side of subtitle row; hidden when expanded, shown in detail rows instead
- **Exercise Summary Card: Detail rows** — 1RM, Total Volume, and PR only visible when expanded; divider hidden when collapsed
- **Exercise Summary Card: PR row** — shows highest weight lifted below Total Volume (when expanded); removed PR column from set table
- **Exercise Summary Card: Border jump fix** — `margin: -1` on collapsed card to offset 1px border
- **Exercise Summary Card: Side padding** — increased to 24px
- **Swipe-back disabled** — gesture navigation disabled on all workout flow screens (StartWorkout, CategorySelection, ExerciseSearch, ActiveWorkout, UploadTemplate, TemplatePreview)
- **Database types updated** — added `body_region` (string) and `aliases` (string[]) to exercises table type

### Fixed
- **Workout complete not saving** — status was saving correctly but HomeScreen detailed query failed due to stale `workout_stages` relationship; removed the join

---

## [2026-03-06] - Exercise Search UX + Styling Improvements

### Changed
- **Exercise Search: Multi-field search** — search now matches against exercise name, muscle_group, and specific_muscles (e.g., searching "shoulder" finds "Overhead Press" via its muscle_group)
- **Exercise Search: Keyboard behavior** — bottom search panel rises above iOS keyboard via KeyboardAvoidingView wrapper; header panel collapses and slides off screen when keyboard opens (animated marginTop); exercise list fills viewport with island padding preserved; header slides back on keyboard dismiss
- **Exercise Search: Bottom panel padding** — reduced gap between search bar and keyboard when keyboard is active; safe area padding restored when keyboard is hidden
- **Exercise Search: Search filter** — now matches against exercise name and aliases array only (removed muscle_group and specific_muscles matching)
- **Exercise Search: Selected card styling** — updated to match Figma; dark gray (#313131) background instead of white; light text (#F0F0F0/#C8C8C8); selected variation pill uses #505050 background
- **Exercise Search: Card layout** — increased header horizontal padding to 24px; variation pill edges closer to card edges; variation row inner padding adjusted for icon alignment
- **Exercise Search: Section headers** — larger (16px), lighter color (#B0B0B0), aligned with card text; exercise count shown inline as "(152)" with regular weight
- **Exercise Search: Typography** — search input font reduced to 16px; increased gap between exercise name and subtitle; subtitle line height set to 16px
- **WorkoutHeader: "Sheet" label removed** — header now shows workout name without "Sheet" suffix
- **WorkoutHeader: Button order swapped** — Cancel on left, Start/Save on right, 8px gap
- **Exercise cards: × button** — removed circular background; centered icon

---

## [2026-03-05] - App Icon + Splash Screen + EAS Build Setup

### Added
- **EAS internal distribution build** — `preview` profile configured for ad-hoc distribution to registered devices; both devices registered via Apple Developer Portal
- **GitHub Actions OTA updates** — pushing to main will trigger `eas update --channel preview` for JS/asset changes (native changes require a new build)

### Changed
- **App icon** — updated to new SetSheet icon (book/sheet isometric illustration)
- **Splash screen** — updated to match new app icon on white background

---

## [2026-03-05] - Workout Summary Redesign + Sheet View Actions + UX Fixes

### Added
- **HomeScreen: Delete workout** — trash icon in completed workout header; confirms via Alert; deletes sets → workout_exercises → workout_stages → workout; clears sheet and refreshes calendar dot
- **HomeScreen: Edit workout** — pencil icon in completed workout header; sets workout status back to `active` and navigates to ActiveWorkout
- **HomeScreen: Today indicator** — "TODAY" label in small uppercase appears above the date in all three sheet states (empty, in-progress, completed) when viewing the current day
- **CalendarPanel: `refreshKey` prop** — incrementing this prop triggers `refreshData()` so the calendar dot updates after workout deletion
- **ActiveWorkoutScreen: `useFocusEffect`** — reloads workout on every screen focus, ensuring exercises added via "Add Exercise" flow show up with correct previous set data

### Changed
- **WorkoutSummaryScreen removed** — screen, navigation entry, and route type all deleted; completing a workout now navigates to `MainTabs` with `initialFocusDate` set to the workout date so the sheet view lands on the correct day
- **HomeScreen: Completed workout header** — workout name (large, bold) on top; date below in muted text; no pencil icon; edit/delete icon buttons in top-right
- **HomeScreen: Stage grouping removed** — exercises render as flat sorted list; `StageHeader` component no longer used in sheet view
- **HomeScreen: "Exercises Summary" → "Workout Summary"** — section label updated
- **HomeScreen: `initialFocusDate` param** — `MainTabParamList.Home` now accepts optional `initialFocusDate`; `useState` initializer reads it on mount so the focus date is correct after completing a workout
- **ActiveWorkoutScreen: Template set pre-fill** — when `proposed_reps_min` is set (template workout), weight is left blank instead of pre-filling from history; reps still come from template
- **`get_previous_workout_sets` RPC** — updated in Supabase to use `p_exercise_id` (was `p_exercise_variation_id`); now correctly fetches previous set history after schema migration

### Fixed
- **Previous sets not showing** — RPC was using old `exercise_variation_id` param; updated to `exercise_id`; also fixed existing sets with `is_completed = false` via `UPDATE sets SET is_completed = true WHERE reps IS NOT NULL AND weight IS NOT NULL`
- **Calendar dot persisting after delete** — CalendarPanel now re-fetches when `refreshKey` prop changes

---

## [2026-03-05] - DB Schema Migration + Template Flow + Set Pre-Population

### Changed
- **DB Schema: `exercise_variations` table removed** — equipment now stored as `text[]` directly on `exercises`; removes the triple join (`workout_exercises → exercise_variations → exercises`)
- **DB Schema: `workout_exercises`** — `exercise_variation_id` replaced with `exercise_id uuid` + `equipment text`; all queries and inserts updated across the codebase
- **Template flow: TemplatePreview screen bypassed** — after submitting a template, navigates directly to ExerciseSearch with exercises pre-selected; user reviews and can modify before starting
- **ExerciseSearch: Pre-selected exercises from template** — exercises are toggled on with `proposedSets` and `proposedRepsMin` passed as route params; sets are created at workout start using these values

### Added
- **ActiveWorkoutScreen: Set pre-population** — three scenarios handled:
  - *Template workout*: N sets created per exercise (from `proposed_sets`), reps pre-filled from `proposed_reps_min`, weight pre-filled from previous best
  - *Custom/manual workout*: 1 set created per exercise, reps + weight pre-filled from previous best
  - *Add Set*: duplicates the last set's reps and weight inputs
- **ActiveWorkoutScreen: Incomplete sets prompt** — tapping "Complete Workout" when uncompleted sets exist shows an alert asking to mark them all complete; confirms before finishing
- **ActiveWorkoutScreen: Cancel Workout button removed from footer** — duplicate button removed; Cancel remains in the WorkoutHeader

### Fixed
- **ExerciseSearch: Empty string UUID** — `category_id: ''` caused `invalid input syntax for type uuid`; fixed with `category_id: categoryId || null`
- **Workout summary stats showing 0** — pre-created sets had `is_completed: false`; fixed by the incomplete sets prompt ensuring sets are marked complete before finishing

---

## [2026-02-23] - Active Workout Performance + Reorder Fix

### Fixed
- **ExerciseSearch: Reorder not applying in add-to-existing mode** — `handleAddToWorkout` now assigns `sort_order` based on each exercise's index in the full panel order; also updates `sort_order` for existing exercises via separate UPDATE calls; previously only inserted new exercises at the end using `startSortOrder + index`, ignoring panel order entirely
- **ActiveWorkoutScreen: Input lag** — toggle set complete, add set, and delete set no longer call `loadWorkout()` (which re-fetched the full workout + fired N RPC calls for previous sets per exercise); replaced with optimistic local state updates for instant UI response

### Added
- **ActiveWorkoutScreen: Auto-complete previous set on Add Set** — when "+ Add Set" is tapped, the last set for that exercise is automatically marked as completed (if not already); fires as a fire-and-forget DB update alongside the new set insert

### Changed
- **ActiveWorkoutScreen: "+ Add Exercise" → "+ Add/Edit Exercise"**
- **ExerciseSearch: "Add" CTA → "Save"** in add-to-existing mode (the green pill button in WorkoutHeader)

---

## [2026-02-22] - Bug Fix + Drag-to-Reorder Selected Exercises

### Fixed
- **ActiveWorkoutScreen: Cancel navigation** — `navigation.navigate('Home')` changed to `navigation.navigate('MainTabs')`; was throwing "action not handled" runtime error and leaving user stuck on screen after cancelling a workout

### Added
- **WorkoutHeader: Drag-to-reorder selected exercises** — each selected exercise row now shows a `reorder-three` hamburger icon on the right; touch the handle and drag up/down to reorder; order is committed on release via `onReorderItems` prop and reflected in `sort_order` when exercises are inserted into DB; implemented using RN responder system (`onStartShouldSetResponder` / `onResponderMove` / `onResponderRelease`) — no external library, no native rebuild required

### In Progress
- **WorkoutHeader: Reorder not applying in add-to-existing mode** — dragging exercises in the header panel while adding to an existing workout does not change the exercise order on the Active Workout screen after hitting "Add"; reorder works correctly in new workout flow; root cause and fix TBD next session

---

## [2026-02-22] - Active Workout Redesign + Exercise Search Refinements

### Added
- **ActiveWorkoutScreen: WorkoutHeader** — replaced custom header with shared `WorkoutHeader` component (matches ExerciseSearch header style: dark panel, date/name/pencil/Cancel)
- **ActiveWorkoutScreen: Edit Title** — pencil icon in header opens rename modal; saves to `workouts.name` in DB
- **ActiveWorkoutScreen: Trash Icon per Exercise** — top-right of each exercise card; confirms then deletes exercise + all its sets from DB
- **ActiveWorkoutScreen: Add Exercise Button** — button below exercise list; navigates to ExerciseSearch with `existingWorkoutId` param; pre-populates all currently selected exercises; only inserts newly added exercises (no duplicates)
- **ExerciseSearch: Add-to-Existing Mode** — triggered when `existingWorkoutId` route param is present; fetches and pre-populates current workout exercises; header button shows "Add" instead of "Start"; on confirm, inserts only new exercises and navigates back to ActiveWorkout; pre-existing exercises protected from header panel removal
- **WorkoutHeader: `startLabel` prop** — optional override for the green button text (defaults to "Start")

### Changed
- **Stages removed from Active Workout** — exercises render as flat sorted list; removed stage headers, Add Stage button, rename/delete stage functions; DB still creates a default stage behind the scenes (FK constraint)
- **Stages removed from Workout Summary** — exercises render flat; removed stage grouping, `StageHeader` component, `workout_stages` from query
- **ActiveWorkoutScreen: Set table columns** — switched from fixed pixel widths to `flex` proportions (spans full card width on all device sizes)
- **ActiveWorkoutScreen: Input performance** — reps/weight inputs now use local state; DB saves on `onBlur` only (no per-keystroke reload); new sets sync into local state without overwriting in-progress edits
- **ExerciseSearch: Selected variation rows** — selected row in open accordion now uses `#D5D5D5` light gray pill (`borderRadius: 32, height: 56`), dark `#1B1B1B` text; was previously dark `#1B1B1B` bg
- **ExerciseSearch: Card open state** — opening an accordion no longer shows selected equipment text in the header; in closed state with selections, each selected variation renders as its own row with × below a divider (not comma-separated text in header)
- **ExerciseSearch: Bottom panel** — unified search + filter into a single animated bottom panel; filter icon opens panel to 78% screen height (hides search, shows category list); × closes back to collapsed search view
- **WorkoutHeader: Selected exercise subtitle** — format changed to `equipment · muscleGroup` (e.g., "Dumbbells · Arms")

---

## [2026-02-22] - Exercise Search Redesign

### Added
- **WorkoutHeader: Expandable Selected Exercises Panel**
  - Drag handle appears at bottom of header when exercises are selected
  - Drag down to expand selected exercise list within header; drag up to collapse
  - Each row: exercise name (bold) + muscle group + × remove button
  - Uses `PanResponder` + `Animated.spring` for height animation
  - Auto-collapses when all exercises are removed
- **WorkoutHeader: Start Button**
  - Green pill (`#2E7D32`) appears next to Cancel when exercises are selected
  - Only rendered when `selectedExercises.length > 0`
  - Both Start and Cancel are compact (`fontSize: 13, paddingHorizontal: 12`)
- **WorkoutHeader: Editable Sheet Name**
  - Pencil icon (`Ionicons name="pencil"`, size 11) renders after "Sheet" in header title
  - Tapping opens a rename modal (dark card overlay, auto-focused input, Cancel + Save)
  - Saved name used in workout DB record
- **Exercise Search: Client-Side Filtering**
  - All exercises loaded from DB; category filtering applied in-browser
  - Active categories stored as array; empty array = show all
  - Category match via `exercise.category_ids` overlap with active category IDs
- **Exercise Search: Filter Category Panel**
  - Slide-up overlay via `Animated.timing`
  - Lists all categories with `+`/`×` toggle, subtitles from static map + DB fallback
  - Live "X exercises Available" count
- **Exercise Search: Selected Equipment Label**
  - Multi-variation cards show selected variation's equipment name as third line below subtitle
  - Visible in both collapsed and expanded states
- **Exercise Search: Exercises Count Header**
  - "Exercises" label + live count (reflecting active filters) below search bar

### Changed
- **WorkoutHeader title format:** Removed "New " prefix — renders as `**[name]** Sheet ✏️`
- **WorkoutHeader layout:** Left section wraps date row + subtitle; buttons column on right
- **ExerciseSearchScreen background:** `#1E1E1E` (was `#1A1A1A`)
- **Exercise Search layout restructure:**
  - "Search Exercises" bold title removed; placeholder text in input serves that purpose
  - Search bar moved to top of exercise list (dark `#2A2A2A` bg, search icon prefix)
  - Selected exercises section removed from main scroll — lives in WorkoutHeader panel
  - Bottom panel now contains only filter chips + filter icon (no search bar, no Start button)
  - Start button moved into WorkoutHeader header row
- **Exercise card behavior:**
  - Multi-variation card turns white when any variation is selected (was dark until expanded)
  - Single-variation card: tapping the full row adds/removes (not just the button)
- **Workout creation uses editable `sheetName`** (not the original `categoryName` param)

### Removed
- **Info icons** removed from all exercise cards and variation rows (deferred to Exercise Detail phase)
- **Image placeholders** removed from exercise cards (deferred to future phase)

---

## [2026-02-09] - iOS Simulator Setup & Workflow Updates

### Added
- **iOS Simulator Support:** Successfully built and ran SetSheet in Xcode iOS Simulator (iPhone 16e)
  - Used `npx expo run:ios` to generate iOS native project and build dev client
  - Metro bundler connected to both simulator and physical device simultaneously

### Changed
- **WORKFLOW.md:** Added "Environment Setup" section for dual-device development
  - Metro bundler starts at session beginning (after reading docs)
  - Both iOS Simulator and physical device receive hot-reload updates from same server
  - Session end protocol updated to kill Metro before updating docs

---

## [2026-02-08] - Calendar Panel Investigation (Reverted)

### Attempted
- **TopSheet Migration:** Attempted to migrate CalendarPanel from `TopSheetScrollView` (PanResponder + Animated API) to custom `TopSheet` component (Reanimated v3 + GestureHandler)
  - Goal: Better performance with Reanimated worklets running on UI thread
  - Installed `@gorhom/bottom-sheet` for future bottom drawers (filters, confirmations)
  - Added `GestureHandlerRootView` wrapper in `App.tsx`
  - Added `react-native-reanimated/plugin` to `babel.config.js`
- **Calendar Positioning:** Attempted to implement auto-scroll to show selected date at bottom of collapsed panel
  - Multiple approaches tried: scroll calculations from top, from bottom, using scrollToEnd + offset
  - Issue: `scrollToEnd()` worked, but `scrollTo({ y: number })` consistently failed to reach target position

### Issues Discovered
- **ScrollView Layout Conflicts:** When ScrollView was inside TopSheet, `scrollTo()` method didn't reliably position content
  - `scrollToEnd()` worked perfectly, but calculated scroll positions were consistently off by 100-1000px
  - Scroll events fired correctly, but visual content didn't move to expected positions
- **Gesture Coordination:** Pan gestures for drawer vs ScrollView's native scroll gesture created conflicts
- **Layout Constraints:** `flexGrow: 1` + `justifyContent: 'flex-end'` prevented content from overflowing (required for scrolling)

### Reverted
- **All changes reverted** to commit `115275a` (before TopSheet migration)
- Calendar panel back to working `TopSheetScrollView` implementation
- Lost: TopSheet component, @gorhom/bottom-sheet installation, scroll positioning attempts

### Next Steps
- **Re-attempt TopSheet migration** with lessons learned:
  - Start with minimal working TopSheet (just expand/collapse, no scroll positioning)
  - Get basic scrolling working first before attempting auto-positioning
  - Consider alternative approaches: inverted FlatList, reversed data array, different layout strategy
  - May need to rethink fundamental approach to "selected date at bottom" feature

### Lessons Learned
- Don't combine multiple complex changes (migration + new feature) in one session
- Test each piece independently before integrating
- React Native ScrollView behavior differs significantly from web CSS scrolling
- `scrollTo()` reliability issues may indicate architectural mismatch

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
| exercises | 151 | Equipment stored as `text[]` on each row |
| categories | 20 | 4 category groups |
| profiles | 2 | Test accounts |
