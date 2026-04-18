# SetSheet — Backlog

Items that came up during development but weren't actioned. Review at session start or end.

---

## UX

| # | Item | Original Note |
|---|------|--------------|
| 1 | Revisit set auto-complete UX | "Auto-complete on blur fights against editing reps mid-workout. Users often adjust reps after starting — the current flow feels restrictive. Consider a more intentional trigger (e.g., manual checkmark only, or auto-complete only on 'Next Exercise')." |
| 2 | Keyboard covering input fields | "We need a way to see the input field and text that's being inputted into said field when the keyboard is raised in all instances. I sometimes can't see the text that's being added." |
| 3 | Gray out exercise row on delete | "Gray out workouts temporarily as workout is removing when clicking workout removed." |
| 4 | Verify add exercise during active workout | "When going to the add exercise screen during an active workout, and adding a new exercise, it isn't adding the selected exercise when hitting 'save' and returning to active workout screen. It's as if I never added it." |

---

## Data / DB

| # | Item | Context |
|---|------|---------|
| 1 | Stop writing `sets.is_completed` | Always written as `true` — redundant since we only write completed sets. Code-only change. |
| 2 | Stop writing `workout_exercises.stage_id` | Always `null`, legacy column from when stages existed. Code-only change. |

---

## Features

| # | Item | Context |
|---|------|---------|
| 1 | Workout notes | `workouts.notes` column exists in DB, never written or shown in app. |
| 2 | PR detection | `sets.is_pr` column exists, `personal_records` table exists — nothing writes to either. |
