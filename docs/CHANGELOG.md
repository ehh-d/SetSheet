# Changelog

All notable changes to SetSheet are documented in this file.

## [2026-01-31] - Simplified Sticky Month Labels

### Changed
- **Month Label Architecture:** Complete rewrite of sticky month label system using a simpler "fake sticky" approach:
  - **Removed:** Complex scroll-based position calculations, `visibleLabels` state, `monthBlocksRef`
  - **Added:** Simple `activeMonth` state with ref for fast updates
  - **New Approach:**
    - Inline labels at TOP and BOTTOM of each month block (scroll naturally with content)
    - One fixed overlay label always pinned at bottom showing current active month
    - When inline label overlaps fixed label, they show same content (invisible overlap)

### Technical Details
- `CalendarPanel.tsx`:
  - `handleScroll` now only handles lazy loading + determining active month from bottom-most visible row
  - Renders month blocks with `topLabel` (first day) and `bottomLabel` (last day) passed to `CalendarDateRow`
  - Fixed overlay shows `activeMonth` state
  - Uses `activeMonthRef` to avoid unnecessary re-renders on scroll

- `CalendarDateRow.tsx`:
  - Added `topLabel` and `bottomLabel` props
  - Labels render vertically centered in timeline column (using `top: 0, bottom: 0, alignItems: 'center'`)
  - Removed separate inline label rows that were causing gaps

### Fixed
- Month labels now appear beside date cards instead of creating separate rows with gaps
- Reduced delay in month transition by using ref comparison before state updates

### Known Issues / Next Steps
- [ ] Test scrolling behavior with more months of data
- [ ] May want to show only bottom labels (last day of each month) if top+bottom looks redundant
- [ ] Verify fixed overlay position aligns correctly with inline labels

---

## [2026-01-30] - Calendar Panel & Sheet View Refactor

### Added
- **FEATURE_SPEC.md:** New documentation defining terminology:
  - **Sheet** = workout log for a specific date
  - **Sheet View** = primary landing screen (formerly HomeScreen)
  - **Focus Date** = currently viewed date (defaults to today)
  - **Calendar Panel** = sliding drawer for date navigation

- **Calendar Panel Styling:**
  - Card-style drawer with shadow (`box-shadow: 0 12px 12px rgba(0,0,0,0.25)`)
  - Background: `#272727`
  - Border radius: `24px` (bottom corners)
  - Padding: `24px`
  - 8px margin from viewport edges

- **Real-time Scroll Sync:**
  - Focus date stays pinned during panel drag (open/close)
  - Uses `panelHeight.addListener()` to sync scroll position with panel height
  - No delayed/janky scroll animation after release

### Changed
- **HomeScreen → Sheet View:**
  - Removed Sign Out button (to be relocated later)
  - Now loads sheet for ANY selected date (not just today)
  - Shows date even when no sheet exists
  - Renamed variables: `selectedDate` → `focusDate`, `todayWorkout` → `sheet`

- **Calendar Panel Gestures:**
  - Full bottom of card is now draggable (not just handle bar)
  - Handle touch area: 56px height, full width
  - Removed `isAtBottom` restriction - can always drag up to close

- **Calendar Shows All Dates:**
  - Every date in range displayed (not just dates with workouts)
  - Dates without workouts show "No Workout"

### In Progress / Known Issues
- [ ] Scroll sync may need fine-tuning for smoother feel
- [ ] Extended scroll state not yet implemented (pulling past open)
- [ ] Verify lazy loading triggers correctly

### Technical Notes
- Using React Native `Animated` + `PanResponder` (not reanimated - Expo Go version mismatch)
- Scroll position calculated: `scrollY = (focusDateIndex + 1) * ROW_HEIGHT - (panelHeight - HANDLE_HEIGHT)`
- Panel height animated via spring, scroll syncs on every frame

### Design Reference
See `/App Comps/` folder for mockups

---

## [2026-01-25] - Critical Bug Fixes & Database Cleanup

### Fixed
- **React Hooks Violation:** Removed `useRef` from inside `.map()` function in ActiveWorkoutScreen.tsx that caused "change in order of Hooks" error when adding sets
- **Schema Cache Errors:** Fixed ALL column name mismatches between code and database:
  - `order_index` → `sort_order` (workout_exercises, workout_stages)
  - `target_sets` → `proposed_sets`
  - `target_reps_min/max` → `proposed_reps_min/max`
  - `completed` → `is_completed` (sets table)
  - Removed `started_at` (column doesn't exist in database)
- **WorkoutSummaryScreen Blank Screen:** Fixed column name errors preventing summary from rendering
- **HomeScreen Not Showing Active Workouts:** Now displays both 'active' and 'completed' workouts with appropriate buttons
- **Duplicate Exercise Selection:** Prevented adding the same exercise variation twice to a workout
- **Visual Feedback:** Added white background + X icon for selected exercises in search

### Changed
- **Workout Duplicate Prevention:** No longer auto-deletes existing workouts. Instead shows alert with options to:
  - View completed workout
  - Continue active workout
  - Cancel and return
- **Complete Workout Button:** Now disabled (grayed out) when no sets have been added. Shows alert if user attempts to complete empty workout
- **Multi-Equipment Exercise UX:** Removed + button from parent exercise row when variations are shown

### Added
- **SUPABASE_ADMIN.md:** Comprehensive admin guide with:
  - Quick reference for API keys and project details
  - Essential admin task workflows
  - Database schema documentation
  - Optimization recommendations (indexes, functions)
  - Security best practices
  - Common issues and fixes
- **Database Administration:** Claude now serves as dev and admin with efficient workflows documented

### Removed
- All workout history data (cleaned from database for testing)
- Auto-deletion of "orphaned" workouts (user data preservation)

---

## [Phase 3] - Template Upload System

### Added
- Upload Template screen with multi-line text input
- Template parser supporting categories, stages, and exercise formats
- Template preview with visual breakdown
- Start workout directly from template
- Auto-create categories if they don't exist

---

## [Phase 2] - UX Polish & Enhancements

### Added
- Previous workout data in "Previous" column
- Multiple calendar views (Week, Month, List)
- Exercise filtering by muscle group
- Swipe-to-delete for sets
- Smooth animations and gestures

---

## [Phase 1] - Core Workout Flow

### Added
- Authentication (login, auto-login, sign out)
- Home screen with week calendar view
- Category selection with filters
- Exercise search with equipment variations
- Active workout logging with set tracking
- Workout summary with stats and calculations
- Complete Supabase backend integration
