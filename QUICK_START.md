# SetSheet - Quick Start Guide

## Phase 1 Complete! 🎉

The core workout tracking flow is fully implemented and ready to test.

## What's Working

✅ **Login/Authentication** - Supabase Auth with session persistence
✅ **Home Screen** - Week calendar view with workout tracking
✅ **Category Selection** - Browse workout categories with filters
✅ **Exercise Search** - Search and select exercises with equipment variations
✅ **Active Workout** - Log sets with reps and weight in real-time
✅ **Workout Summary** - View completed workouts with stats and volume calculations

## Running the App

### 1. Start the Development Server

The server is currently running! If you need to restart it:

```bash
cd SetSheet
npx expo start
```

### 2. Open on Your Device

**iOS (Recommended):**
- Open Expo Go app on your iPhone
- Scan the QR code displayed in the terminal
- Or press `i` in the terminal to open iOS Simulator

**Android:**
- Press `a` in the terminal for Android emulator
- Or scan QR code with Expo Go app

**Web (Limited Support):**
- Press `w` for web browser (some features may not work)

## Testing the Complete Flow

### Step 1: Login
Use one of the test accounts from your Supabase Auth dashboard:
- Email: (check your Supabase dashboard)
- Password: (your test password)

### Step 2: Start a Workout
1. From Home Screen, tap **"Start a Sheet"**
2. Or tap the **➕** FAB button at bottom right

### Step 3: Select Category
1. Choose a tab: All | Splits | Muscle | Cardio | Conditioning
2. Tap a category (e.g., "Pull" or "Push")

### Step 4: Choose Exercises
1. Browse alphabetically or use search
2. Tap **+** button to add exercises
3. Expand exercises to see equipment variations
4. Tap **"Start Workout"** when ready

### Step 5: Log Your Sets
1. Tap **"+ Add Set"** for each exercise
2. Enter **Reps** and **Weight (lbs)**
3. Tap the **○** to mark set as complete **✓**
4. Add more sets as needed
5. Optional: Add workout notes

### Step 6: Complete Workout
1. Tap **"Complete Workout"** at bottom
2. View summary with:
   - Total exercises, sets, reps, volume
   - Exercise breakdown
   - Set details with 1RM calculations

### Step 7: View on Calendar
1. Navigate back to Home
2. See completed workout marked on calendar
3. Tap any date with a workout to view summary

## Key Features to Try

### Week View Calendar
- Swipe horizontally through weeks
- Tap dates to select them
- Green dots show completed workouts
- Selected date is highlighted in white

### FAB Stack (Bottom Right)
- **📚** Exercise Library (placeholder for Phase 4)
- **➕** Start New Sheet
- **📤** Upload Template (placeholder for Phase 3)

### Exercise Selection
- Search by name
- Filter by category tabs
- Expand to see equipment options
- Selected exercises shown at top

### Active Workout
- Real-time set tracking
- Mark sets complete with checkmark
- Previous weights shown (placeholder)
- Add/remove sets dynamically

## Troubleshooting

### App Won't Load
```bash
# Clear cache and restart
npx expo start --clear
```

### Authentication Issues
- Check Supabase credentials in `lib/supabase.ts`
- Verify test accounts exist in Supabase Auth dashboard
- Check network connection

### TypeScript Errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Database Connection Issues
- Verify Supabase URL and anon key in `lib/supabase.ts`
- Check that database is accessible
- Ensure RLS policies are configured correctly

## Project Files Overview

```
SetSheet/
├── App.tsx                          # Main navigation setup
├── lib/
│   ├── supabase.ts                  # Supabase client
│   └── database.types.ts            # Database TypeScript types
├── contexts/
│   └── AuthContext.tsx              # Auth state management
├── screens/
│   ├── LoginScreen.tsx              # Email/password login
│   ├── HomeScreen.tsx               # Calendar and main view
│   ├── CategorySelectionScreen.tsx  # Category picker
│   ├── ExerciseSearchScreen.tsx     # Exercise selection
│   ├── ActiveWorkoutScreen.tsx      # Set logging
│   └── WorkoutSummaryScreen.tsx     # Completed workout view
├── utils/
│   ├── calculations.ts              # 1RM, volume, PR functions
│   └── templateParser.ts            # Template parsing (Phase 3)
└── types/
    └── index.ts                     # TypeScript definitions
```

## What's Next

### Phase 2: Polish (Coming Soon)
- [ ] Auto-populate previous weights
- [ ] Month view calendar
- [ ] Advanced filtering
- [ ] Swipe to delete sets

### Phase 3: Templates (Coming Soon)
- [ ] Upload workout templates
- [ ] Parse Claude-generated workouts
- [ ] Preview and start from template

### Phase 4: Advanced (Coming Soon)
- [ ] Exercise library browser
- [ ] PR detection and stars
- [ ] Duplicate workouts
- [ ] Export data

## Need Help?

- Check `README.md` for detailed docs
- Review implementation brief for database schema
- All 142 exercises and 376 variations are already in Supabase
- Test accounts should be in your Supabase Auth dashboard

## Development Commands

```bash
# Start server
npx expo start

# Clear cache
npx expo start --clear

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android

# Install new dependency
npx expo install package-name

# Check for updates
npx expo upgrade
```

Enjoy tracking your workouts! 💪
