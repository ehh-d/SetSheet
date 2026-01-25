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

## Next Steps

### Phase 4: Advanced Features
- [ ] Exercise detail modals with descriptions
- [ ] Exercise Library browse mode
- [ ] PR detection with visual indicators
- [ ] Duplicate workout functionality
- [ ] Export workout data to JSON

## Tech Stack

- **Framework:** Expo (React Native)
- **Language:** TypeScript
- **Backend:** Supabase (PostgreSQL + Auth)
- **Navigation:** React Navigation
- **State:** React Context API
- **Date Handling:** date-fns
- **Storage:** AsyncStorage (for auth tokens)

## Database Schema

See implementation brief for full schema. Key tables:
- `exercises` - Exercise definitions
- `exercise_variations` - Equipment variations
- `categories` - Workout categories
- `workouts` - User workout sessions
- `workout_exercises` - Exercises in a workout
- `sets` - Individual sets logged
- `personal_records` - PR tracking (Phase 4)

## Development Notes

- Dark theme (#1A1A1A background, #FFFFFF text)
- iOS-focused for now (Android compatible)
- Row Level Security enabled on all tables
- Real-time updates not required (refresh on load)
- TypeScript strict mode with `@ts-nocheck` for Supabase type compatibility

## Known Issues

### Mobile Testing
- Metro bundler may take time to start on first run after cache clear
- For direct mobile testing, connect iPhone via USB and run: `npx expo run:ios --device`
- Alternatively, use `npx expo start --lan` and scan QR code with Expo Go app
- Ensure phone and computer are on same WiFi network

### TypeScript
- Some Supabase generated types may show as `never` - files use `@ts-nocheck` as workaround
- To regenerate types: `npx supabase gen types typescript --project-id kcgsllsvowamrwljnxmi > lib/database.types.ts`
