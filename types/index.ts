import { Database } from '../lib/database.types';

// Helper types from database
export type Category = Database['public']['Tables']['categories']['Row'];
export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type ExerciseVariation = Database['public']['Tables']['exercise_variations']['Row'];
export type Workout = Database['public']['Tables']['workouts']['Row'];
export type WorkoutStage = Database['public']['Tables']['workout_stages']['Row'];
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row'];
export type Set = Database['public']['Tables']['sets']['Row'];
export type PersonalRecord = Database['public']['Tables']['personal_records']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

// Extended types with relations
export type ExerciseWithVariations = Exercise & {
  exercise_variations: ExerciseVariation[];
};

export type WorkoutExerciseWithDetails = WorkoutExercise & {
  exercise_variations: ExerciseVariation & {
    exercises: Exercise;
  };
  sets: Set[];
  previousSets?: Set[];
};

export type WorkoutWithDetails = Workout & {
  workout_stages: WorkoutStage[];
  workout_exercises: WorkoutExerciseWithDetails[];
};

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  CategorySelection: { date: string };
  ExerciseSearch: { categoryId: string; categoryName: string; date: string };
  ActiveWorkout: { workoutId: string };
  WorkoutSummary: { workoutId: string };
  UploadTemplate: { date: string };
  TemplatePreview: { parsedTemplate: any; date: string };
  ExerciseLibrary: undefined;
};
