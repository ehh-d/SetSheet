# SetSheet - Workout Tracking App

A mobile workout tracking app built with Expo (React Native) and Supabase.

## Phase 1 - COMPLETE ✅

Core workout flow has been implemented:

### Completed Features

1. **Authentication**
   - Login screen with email/password
   - Auto-login with persisted session
   - Sign out functionality

2. **Home Screen**
   - Week view calendar with horizontal scroll
   - Dots under dates with completed workouts
   - Selected date highlighting
   - "Start a Sheet" button when no workout exists
   - FAB stack for quick actions (Library, New Sheet, Upload Template)

3. **Category Selection**
   - Tab bar with filters: All | Splits | Muscle | Cardio | Conditioning
   - Category cards with descriptions
   - Navigation to exercise search

4. **Exercise Search**
   - Alphabetical list with section headers
   - Search functionality
   - Expandable exercise cards showing equipment variations
   - Selected exercises displayed at top
   - "Start Workout" button

5. **Active Workout**
   - Exercise blocks with set tables
   - Add/remove sets dynamically
   - Input reps and weight per set
   - Mark sets as completed
   - Add notes to workout
   - Complete or cancel workout

6. **Workout Summary**
   - Stats: Exercises, Total Sets, Total Reps, Total Volume
   - Exercise breakdown with set details
   - 1RM calculations
   - Navigation back to home

### Project Structure

```
SetSheet/
├── lib/
│   ├── supabase.ts          # Supabase client configuration
│   └── database.types.ts     # TypeScript types for database
├── contexts/
│   └── AuthContext.tsx       # Authentication state management
├── screens/
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx
│   ├── CategorySelectionScreen.tsx
│   ├── ExerciseSearchScreen.tsx
│   ├── ActiveWorkoutScreen.tsx
│   ├── WorkoutSummaryScreen.tsx
│   ├── UploadTemplateScreen.tsx     # Template text input and validation
│   ├── TemplatePreviewScreen.tsx    # Template preview and workout creation
│   └── ExerciseLibraryScreen.tsx    # Placeholder (Phase 4)
├── utils/
│   ├── calculations.ts       # 1RM, volume, PR calculations
│   └── templateParser.ts     # Template parsing logic (Phase 3)
├── types/
│   └── index.ts             # TypeScript type definitions
└── App.tsx                  # Navigation setup
```

## Running the App

### Development Server

```bash
cd SetSheet
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

### Environment

The app connects to the Supabase instance:
- URL: `https://kcgsllsvowamrwljnxmi.supabase.co`
- Database includes 142 exercises and 376 equipment variations
- Two test user accounts are available in Supabase Auth

## Testing the Flow

1. **Login** with one of the test accounts
2. **Select a date** from the week view
3. **Start a Sheet** → Choose a category
4. **Search exercises** → Select exercises and equipment
5. **Start Workout** → Log sets with reps and weight
6. **Complete Workout** → View summary with stats
7. **Navigate Home** → See completed workout on calendar

## Phase 2 - COMPLETE ✅

Polish and enhanced user experience features have been implemented:

### Completed Features

1. **Previous Weight Auto-populate**
   - Displays previous workout data in the "Previous" column
   - Shows reps × weight from last completed workout with same exercise
   - Helps users track progressive overload

2. **Calendar Expansion**
   - **Week View** - Original horizontal week scroll (default)
   - **Month View** - 3-month calendar grid with workout indicators
   - **List View** - Chronological workout history grouped by month
   - View mode toggle buttons in header
   - Tap dates to navigate between views

3. **Exercise Filtering**
   - Horizontal scrollable muscle group filter chips
   - Dynamically generated from available exercises
   - Real-time filtering with search functionality
   - "All" option to show complete exercise list

4. **Swipe to Delete Sets**
   - Swipe left on set rows to reveal delete button
   - Smooth animations with gesture handler
   - Improved set management UX

5. **UI Animations**
   - Animated transitions between view modes
   - Gesture-based interactions
   - Smooth delete button reveal animation

### Technical Updates
- Added `GestureHandlerRootView` wrapper for swipe gestures
- Extended `WorkoutExerciseWithDetails` type with `previousSets`
- Implemented previous workout data fetching logic
- Added view mode state management in HomeScreen

## Phase 3 - COMPLETE ✅

Template functionality has been implemented:

### Completed Features

1. **Upload Template Screen**
   - Multi-line text input for workout templates
   - Format instructions and example template
   - "Example" button to load sample template
   - Real-time parsing and validation

2. **Template Parser & Validation**
   - Parses category name from first line
   - Supports optional stage headers `[Stage Name]`
   - Exercise format: `Exercise Name SetsxReps` or `SetsxReps-RepsMax`
   - Validates all exercises exist in database
   - Shows helpful error messages for missing exercises

3. **Template Preview Screen**
   - Visual breakdown of parsed template
   - Stats display: stages, exercises, total sets
   - Exercises grouped by stage
   - Equipment display for each exercise
   - Target sets and rep ranges shown

4. **Start Workout from Template**
   - Creates workout with all stages and exercises
   - Auto-creates category if doesn't exist
   - Pre-fills sets with target rep ranges
   - Navigates directly to active workout
   - Ready to log immediately

### Technical Implementation
- Template parser in `utils/templateParser.ts`
- UploadTemplateScreen with validation UI
- TemplatePreviewScreen with workout creation logic
- Navigation integration in App.tsx

## Phase 4: Planned Features

### High Priority (P0)
- [x] ~~Start workout button should not create duplicate workouts~~ ✅ Fixed 2026-01-25
- [x] ~~Prevent completing workouts without sets~~ ✅ Fixed 2026-01-25
- [x] ~~Show active workouts on home screen~~ ✅ Fixed 2026-01-25

### Medium Priority (P1) - UX Improvements
- [ ] Calendar infinite scrolling (currently limited to 7-day week view)
- [ ] Prevent starting workouts on future dates
- [ ] +/× button visibility fixes in exercise search
- [ ] Multi-equipment exercise caret vs + button placement refinement
- [ ] Calendar panel expansion (pull-down panel, month grid tap behavior)
- [ ] Filter panel for exercise search

### Low Priority (P2) - Advanced Features
- [ ] Exercise detail modals with full descriptions
- [ ] Exercise Library browse mode
- [ ] PR detection with visual indicators (backend ready, UI not implemented)
- [ ] Duplicate previous workout functionality
- [ ] Export workout data to JSON/CSV
- [ ] Workout templates library (save custom templates)
- [ ] Progressive overload suggestions
- [ ] Rest timer between sets

## Tech Stack

- **Framework:** Expo SDK 54.0 (React Native)
- **Language:** TypeScript (with @ts-nocheck for Supabase compatibility)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Navigation:** React Navigation (Native Stack)
- **State:** React Context API
- **Date Handling:** date-fns
- **Storage:** AsyncStorage (for auth tokens)
- **Gestures:** React Native Gesture Handler (Swipeable)

## Database Schema

**Current Data:** 142 exercises, 376 variations, 20 categories

Key tables:
- `exercises` - Exercise definitions (name, muscle_group, category_ids, specific_muscles, description)
- `exercise_variations` - Equipment variations (exercise_id, equipment)
- `categories` - Workout categories (name, category_group, muscle_groups[])
- `workouts` - User workout sessions (user_id, workout_date, name, status, notes)
- `workout_stages` - Optional workout sections (workout_id, name, sort_order)
- `workout_exercises` - Exercises in a workout (workout_id, exercise_variation_id, proposed_sets/reps)
- `sets` - Individual sets logged (workout_exercise_id, set_number, reps, weight, is_completed)
- `personal_records` - PR tracking (Phase 4 - backend ready, UI not implemented)

**See `ReadMe & Documentation/SUPABASE_ADMIN.md` for full schema documentation and admin workflows**

## Administration & Development

**Claude serves as both developer and database administrator** with user guidance.

### Quick Admin Reference
- **Supabase Dashboard:** https://supabase.com/dashboard/project/kcgsllsvowamrwljnxmi
- **Project ID:** `kcgsllsvowamrwljnxmi`
- **Access Token:** `sbp_8d2c608298a825c8cedecc98594df0d525a8f813`

### Common Admin Tasks

**Regenerate database types** (after schema changes):
```bash
SUPABASE_ACCESS_TOKEN="sbp_8d2c608298a825c8cedecc98594df0d525a8f813" \
npx supabase gen types typescript \
  --project-id kcgsllsvowamrwljnxmi > lib/database.types.ts
```

**Delete all workout data** (testing/cleanup):
- Use service_role key script (see `ReadMe & Documentation/SUPABASE_ADMIN.md` for template)
- Deletes in order: sets → personal_records → workout_exercises → workout_stages → workouts

**Database optimization recommendations:**
- Indexes on: workouts(user_id, workout_date), exercises(muscle_group, name)
- Function for previous workout lookup
- See `ReadMe & Documentation/SUPABASE_ADMIN.md` for SQL scripts

## Development Notes

### Design
- Dark theme (#1A1A1A background, #FFFFFF text, #2A2A2A cards)
- Green accent (#33CC33) for completion/success
- Red accent (#CC3333) for delete/cancel
- iOS-focused (Android compatible)

### Security
- Row Level Security (RLS) enabled on all tables
- Anon key in client code (public, read-only with RLS)
- Service role key for admin scripts only (never committed to git)

### Data Flow
- Real-time updates not required (refresh on navigation)
- Previous workout data fetched on Active Workout load
- Workouts status: 'active' (in progress) or 'completed'

### Known Quirks
- TypeScript: Use `@ts-nocheck` for Supabase compatibility
- Schema Cache: Always regenerate types after dashboard schema changes
- Column Names: Code must match database exactly (see recent fixes in `ReadMe & Documentation/CHANGELOG.md`)

## Recent Fixes (2026-01-25)

### Critical Bugs Fixed
- ✅ React Hooks error when adding sets (useRef in map)
- ✅ Schema cache column name mismatches (sort_order, proposed_*, is_completed)
- ✅ Blank screen on workout summary
- ✅ Home screen not showing active workouts
- ✅ Duplicate exercise selection
- ✅ Complete button now disabled when no sets added

### Behavior Changes
- ❌ No auto-deletion of workouts (user data preservation)
- ✅ Navigate to existing workout instead of creating duplicates
- ✅ Visual feedback for selected exercises (white background + X)

**See `ReadMe & Documentation/CHANGELOG.md` for complete history**

## Documentation

All documentation files are located in the **`ReadMe & Documentation/`** folder:

- **README.md** - This file (overview, quick start, project status)
- **SUPABASE_ADMIN.md** - Database administration guide (credentials, workflows, optimization)
- **CHANGELOG.md** - Detailed change history with dates
- **NEW_COMPUTER_SETUP.md** - Setup instructions for new development machine
- **EAS_UPDATE_SETUP.md** - GitHub Actions OTA update configuration

## Deployment

### Over-The-Air Updates (Configured)
- GitHub Actions workflow automatically publishes updates on push to `main`
- Users receive updates within ~2 minutes (force close & reopen app)
- No App Store submission required for code changes

### Workflow
1. Make code changes
2. `git add . && git commit -m "message" && git push`
3. GitHub Actions runs `eas update --auto`
4. OTA update deployed to production channel
5. Users force close app → reopen → receive update

**See `ReadMe & Documentation/EAS_UPDATE_SETUP.md` for configuration details**

## Known Issues

### Mobile Testing
- Metro bundler may take time to start on first run after cache clear
- For direct mobile testing, connect iPhone via USB: `npx expo run:ios --device`
- Alternatively: `npx expo start --lan` and scan QR code with Expo Go app
- Ensure phone and computer are on same WiFi network

### Database
- Must regenerate types after any Supabase schema changes
- Service role key required for admin operations (see `ReadMe & Documentation/SUPABASE_ADMIN.md`)
- Always test schema changes locally before deploying
