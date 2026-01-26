# Supabase Administration Guide

## Admin Role & Responsibilities

**Claude serves as both developer and database administrator** for this project, with user guidance. This document provides the efficient workflows for managing the Supabase backend.

## Quick Reference

### Project Details
- **Project ID:** `kcgsllsvowamrwljnxmi`
- **Project URL:** `https://kcgsllsvowamrwljnxmi.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/kcgsllsvowamrwljnxmi

### API Keys (Stored in code)
- **Anon Key:** In `lib/supabase.ts` - public, read-only with RLS
- **Service Role Key:** Retrieved via API - admin access, bypasses RLS

### Access Token
- **Personal Access Token:** `sbp_8d2c608298a825c8cedecc98594df0d525a8f813`
- Used for: CLI operations, API key retrieval, schema operations

---

## Essential Admin Tasks

### 1. Regenerate Database Types

**When to do this:** After any schema changes in Supabase dashboard

```bash
SUPABASE_ACCESS_TOKEN="sbp_8d2c608298a825c8cedecc98594df0d525a8f813" \
npx supabase gen types typescript \
  --project-id kcgsllsvowamrwljnxmi > lib/database.types.ts
```

### 2. Retrieve Service Role Key

**When to do this:** For admin operations (data deletion, bulk updates, bypassing RLS)

```bash
curl -s -X GET 'https://api.supabase.com/v1/projects/kcgsllsvowamrwljnxmi/api-keys' \
  -H 'Authorization: Bearer sbp_8d2c608298a825c8cedecc98594df0d525a8f813' | \
  node -e "const data=require('fs').readFileSync(0,'utf-8'); const keys=JSON.parse(data); console.log(keys.find(k=>k.name==='service_role').api_key);"
```

**Current Service Role Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZ3NsbHN2b3dhbXJ3bGpueG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg3NDgxNywiZXhwIjoyMDg0NDUwODE3fQ.KvFy9wzRE9sZoXpZKbyctKgCeo0sWn-CWY6PhNHHscg
```

### 3. Delete All Workout Data

**When to do this:** Testing, cleaning user data, reset

Create a script:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kcgsllsvowamrwljnxmi.supabase.co',
  'SERVICE_ROLE_KEY_HERE'
);

async function deleteAllWorkouts() {
  console.log('Deleting all workout data...\n');

  // Delete in order due to foreign key constraints
  await supabase.from('sets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Deleted all sets');

  await supabase.from('personal_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Deleted all personal records');

  await supabase.from('workout_exercises').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Deleted all workout exercises');

  await supabase.from('workout_stages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Deleted all workout stages');

  await supabase.from('workouts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Deleted all workouts');

  console.log('\n✅ Complete');
  process.exit(0);
}

deleteAllWorkouts();
```

Run: `node script.js` (delete script after use for security)

### 4. Inspect Database

**When to do this:** Quality checks, counting records, finding issues

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kcgsllsvowamrwljnxmi.supabase.co',
  'SERVICE_ROLE_KEY_HERE'
);

async function inspect() {
  const { count: exercises } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
  const { count: variations } = await supabase.from('exercise_variations').select('*', { count: 'exact', head: true });
  const { count: workouts } = await supabase.from('workouts').select('*', { count: 'exact', head: true });

  console.log(`Exercises: ${exercises}`);
  console.log(`Variations: ${variations}`);
  console.log(`Workouts: ${workouts}`);
}

inspect();
```

---

## Database Schema

### Core Tables

**exercises** (142 records)
- Exercise definitions (Bench Press, Squat, etc.)
- Fields: `name`, `muscle_group`, `category_ids[]`, `specific_muscles[]`, `description`
- All have variations, all have descriptions

**exercise_variations** (376 records)
- Equipment variations (Barbell Bench Press, Dumbbell Bench Press, etc.)
- Fields: `exercise_id`, `equipment`
- Average 2.6 variations per exercise

**categories** (20 records)
- Workout categories (Push, Pull, Legs, etc.)
- Fields: `name`, `category_group`, `muscle_groups[]`
- Groups: Splits (6), Muscle (7), Cardio (4), Conditioning (3)

**profiles** (2 test users)
- User accounts
- Fields: `id`, `email`, `display_name`

### Workout Tables

**workouts**
- User workout sessions
- Fields: `user_id`, `workout_date`, `name`, `category_id`, `status`, `notes`, `completed_at`
- Status: 'active' or 'completed'

**workout_stages**
- Optional workout sections (Warmup, Main, Cooldown)
- Fields: `workout_id`, `name`, `sort_order`

**workout_exercises**
- Exercises in a workout
- Fields: `workout_id`, `stage_id`, `exercise_variation_id`, `sort_order`, `proposed_sets`, `proposed_reps_min`, `proposed_reps_max`, `proposed_weight`

**sets**
- Individual logged sets
- Fields: `workout_exercise_id`, `set_number`, `reps`, `weight`, `is_completed`, `completed_at`, `is_pr`

**personal_records**
- PR tracking (Phase 4 - not yet implemented in UI)
- Fields: `user_id`, `exercise_variation_id`, `set_id`, `max_weight`, `max_reps`, `max_volume`, `estimated_1rm`, `achieved_at`

---

## Common Schema Issues & Fixes

### Issue: Column name mismatches

**Problem:** Code uses wrong column names (cached schema)

**Fix:**
1. Regenerate types: `SUPABASE_ACCESS_TOKEN="..." npx supabase gen types...`
2. Update code to match actual database columns

**Common mismatches found:**
- ✗ `order_index` → ✓ `sort_order`
- ✗ `target_sets` → ✓ `proposed_sets`
- ✗ `target_reps_min/max` → ✓ `proposed_reps_min/max`
- ✗ `completed` → ✓ `is_completed`
- ✗ `started_at` → ✗ (doesn't exist in database)

### Issue: Orphaned workouts

**Problem:** Failed workout creation leaves incomplete data

**Solution implemented:** Check for existing workouts before creating, navigate to existing instead of deleting

---

## Database Optimization Opportunities

### Current State (As of Jan 2026)
✅ **Good:**
- No orphaned exercises (all have variations)
- Good data quality (all exercises have descriptions)
- Proper foreign key constraints
- Row Level Security enabled

### Recommended Indexes
```sql
-- Speed up workout loading (most common query)
CREATE INDEX IF NOT EXISTS idx_workouts_user_date
  ON workouts(user_id, workout_date DESC);

-- Speed up exercise search
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group
  ON exercises(muscle_group);

CREATE INDEX IF NOT EXISTS idx_exercises_name
  ON exercises(name);

-- Speed up previous workout lookup
CREATE INDEX IF NOT EXISTS idx_workout_exercises_variation
  ON workout_exercises(exercise_variation_id);
```

### Recommended Functions
```sql
-- Get user's most recent workout for an exercise
CREATE OR REPLACE FUNCTION get_previous_sets(
  p_user_id UUID,
  p_exercise_variation_id UUID,
  p_before_date DATE
)
RETURNS TABLE (
  set_number INT,
  reps INT,
  weight NUMERIC
) AS $$
  SELECT s.set_number, s.reps, s.weight
  FROM sets s
  JOIN workout_exercises we ON s.workout_exercise_id = we.id
  JOIN workouts w ON we.workout_id = w.id
  WHERE w.user_id = p_user_id
    AND we.exercise_variation_id = p_exercise_variation_id
    AND w.workout_date < p_before_date
    AND w.status = 'completed'
    AND s.is_completed = true
  ORDER BY w.workout_date DESC, s.set_number ASC
  LIMIT 10;
$$ LANGUAGE SQL STABLE;
```

---

## Security Best Practices

### ✅ DO:
- Use service_role key only in server-side scripts
- Delete scripts containing service_role key after use
- Use anon key in client code (`lib/supabase.ts`)
- Keep RLS policies enabled on all tables

### ❌ DON'T:
- Commit service_role key to git
- Use service_role key in client-side code
- Disable RLS policies without user approval
- Auto-delete user data without confirmation

---

## Deployment Checklist

### Before Schema Changes:
- [ ] Backup data if needed (export to JSON)
- [ ] Test changes in Supabase dashboard SQL editor
- [ ] Note which tables are affected

### After Schema Changes:
- [ ] Regenerate `database.types.ts`
- [ ] Update affected code files to match new schema
- [ ] Test locally with `npx expo start`
- [ ] Verify on device before pushing to GitHub

### After Code Changes:
- [ ] Git commit changes
- [ ] Git push to GitHub (triggers EAS Update)
- [ ] Wait ~2 minutes for OTA update to deploy
- [ ] Force close and reopen app on device to receive update

---

## Quick Command Reference

```bash
# Regenerate types
SUPABASE_ACCESS_TOKEN="sbp_8d2c608298a825c8cedecc98594df0d525a8f813" \
npx supabase gen types typescript --project-id kcgsllsvowamrwljnxmi > lib/database.types.ts

# Start dev server
npx expo start

# Start with cache clear
npx expo start --clear

# View logs
npx expo start --tunnel

# Push to GitHub (triggers OTA update)
git add . && git commit -m "message" && git push
```

---

## Database Statistics

**Last Updated:** January 25, 2026

| Table | Count | Notes |
|-------|-------|-------|
| exercises | 142 | All have descriptions |
| exercise_variations | 376 | Avg 2.6 per exercise |
| categories | 20 | 4 category groups |
| profiles | 2 | Test accounts |
| workouts | 0 | User data (cleared) |
| sets | 0 | User data (cleared) |

---

## Support & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/kcgsllsvowamrwljnxmi
- **Supabase Docs:** https://supabase.com/docs
- **Table Editor:** https://supabase.com/dashboard/project/kcgsllsvowamrwljnxmi/editor
- **SQL Editor:** https://supabase.com/dashboard/project/kcgsllsvowamrwljnxmi/sql
- **API Docs:** https://supabase.com/dashboard/project/kcgsllsvowamrwljnxmi/api
