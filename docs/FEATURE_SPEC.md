# SetSheet Feature Specification

## Terminology

### Sheet
A "sheet" is a workout log for a specific date. Each date can have one sheet, which contains:
- Workout name/category
- Exercises with sets, reps, and weights
- Notes
- Status (active or completed)

### Sheet View
The primary landing screen of the app. Displays the sheet for the currently selected "focus date".

### Focus Date
The date currently being viewed in the Sheet View. Defaults to today on app launch.

### Calendar Panel
A sliding drawer at the top of the Sheet View that shows a scrollable list of dates. Used to navigate between sheets.

---

## Screen: Sheet View (HomeScreen)

### Purpose
Display the sheet (workout) for the focus date. Allow navigation to other dates via the calendar panel.

### Behavior

1. **On Launch**
   - Focus date = today
   - Load and display today's sheet (if exists)
   - Calendar panel shows today's date visible in collapsed state

2. **Calendar Panel Interaction**
   - Pull down handle: Opens calendar panel, reveals date history
   - Tap a date: Sets that date as the focus date, collapses panel, loads that date's sheet
   - Pull up handle: Closes calendar panel

3. **Sheet Display**
   - If focus date has a completed sheet: Show workout summary inline
   - If focus date has an active sheet: Show "Continue Workout" option
   - If focus date has no sheet: Show "No sheet started" with "Start a Sheet" button

4. **Calendar Panel Content**
   - Shows ALL dates (not just dates with workouts)
   - Dates with workouts show the workout name
   - Dates without workouts show "No Workout"
   - Chronological order: oldest at top, today at bottom

### Navigation
- **Start a Sheet**: Navigate to CategorySelection for focus date
- **View/Continue Workout**: Navigate to WorkoutSummary or ActiveWorkout
- **Upload Template**: Navigate to UploadTemplate for focus date

---

## Data Flow

```
Calendar Panel (date selection)
        |
        v
   Focus Date (state)
        |
        v
   Sheet View (displays sheet for focus date)
        |
        v
   Load workout from Supabase for focus date
```

---

---

## Current Implementation Status (2026-01-30)

### Working
- Calendar panel opens/closes with drag gesture
- Focus date visible in collapsed state
- Selecting date loads that date's sheet
- All dates shown (not just dates with workouts)
- Card styling with shadow

### Needs Refinement
- Scroll sync during drag may feel slightly off
- Extended scroll state (pull past open) not implemented
- Sign out button removed, needs new location

---

## Future Considerations

- Sign out: Move to settings/profile screen (TBD)
- Sheet history: Consider showing recent sheets in a list below current sheet
- Quick actions: FAB stack for common actions (start sheet, upload template, exercise library)
- Extended scroll: Pull down past open state to scroll through history
