import { Database } from '../lib/database.types';

// Helper types from database
export type Category = Database['public']['Tables']['categories']['Row'];
export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type Workout = Database['public']['Tables']['workouts']['Row'];
export type WorkoutStage = Database['public']['Tables']['workout_stages']['Row'];
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row'];
export type Set = Database['public']['Tables']['sets']['Row'];
export type PersonalRecord = Database['public']['Tables']['personal_records']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

// Extended types with relations
export type WorkoutExerciseWithDetails = WorkoutExercise & {
  exercises: Exercise;
  sets: Set[];
  previousSets?: Set[];
  workout_stages?: WorkoutStage | null;
};

export type WorkoutWithDetails = Workout & {
  workout_stages: WorkoutStage[];
  workout_exercises: WorkoutExerciseWithDetails[];
};

// Calendar panel types
export type CalendarPanelState = 'collapsed' | 'open' | 'extended';

export interface CalendarDateEntry {
  date: Date;
  workout: Workout | null;
  isToday: boolean;
  monthLabel: string | null; // Only set for first date of each month
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  StartWorkout: { date: string };
  CategorySelection: { date: string };
  ExerciseSearch: { categoryId: string; categoryName: string; date: string; addToSession?: boolean; preSelectedExercises?: { exerciseId: string; exerciseName: string; equipment: string; muscleGroup: string; proposedSets?: number; proposedRepsMin?: number; }[] };
  WorkoutOverview: { date: string; workoutName: string; categoryId: string };
  ExerciseView: { exerciseLocalId: string };
  UploadTemplate: { date: string };
};

export type MainTabParamList = {
  Home: { initialFocusDate?: string } | undefined;
  StartWorkout: undefined;
  ExerciseLibrary: undefined;
  Profile: undefined;
};
