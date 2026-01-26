# Changelog

All notable changes to SetSheet are documented in this file.

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
