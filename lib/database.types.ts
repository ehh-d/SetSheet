export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          description: string | null
          muscle_group: string
          specific_muscles: string[]
          category_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          muscle_group: string
          specific_muscles: string[]
          category_ids: string[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          muscle_group?: string
          specific_muscles?: string[]
          category_ids?: string[]
          created_at?: string
        }
      }
      exercise_variations: {
        Row: {
          id: string
          exercise_id: string
          equipment: string
          created_at: string
        }
        Insert: {
          id?: string
          exercise_id: string
          equipment: string
          created_at?: string
        }
        Update: {
          id?: string
          exercise_id?: string
          equipment?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          created_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          workout_date: string
          category_id: string
          name: string | null
          status: 'pending' | 'active' | 'completed'
          notes: string | null
          started_at: string | null
          completed_at: string | null
          proposed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workout_date: string
          category_id: string
          name?: string | null
          status?: 'pending' | 'active' | 'completed'
          notes?: string | null
          started_at?: string | null
          completed_at?: string | null
          proposed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workout_date?: string
          category_id?: string
          name?: string | null
          status?: 'pending' | 'active' | 'completed'
          notes?: string | null
          started_at?: string | null
          completed_at?: string | null
          proposed_by?: string | null
          created_at?: string
        }
      }
      workout_stages: {
        Row: {
          id: string
          workout_id: string
          name: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          name: string
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          name?: string
          order_index?: number
          created_at?: string
        }
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          stage_id: string | null
          exercise_variation_id: string
          order_index: number
          target_sets: number | null
          target_reps_min: number | null
          target_reps_max: number | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          stage_id?: string | null
          exercise_variation_id: string
          order_index: number
          target_sets?: number | null
          target_reps_min?: number | null
          target_reps_max?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          stage_id?: string | null
          exercise_variation_id?: string
          order_index?: number
          target_sets?: number | null
          target_reps_min?: number | null
          target_reps_max?: number | null
          created_at?: string
        }
      }
      sets: {
        Row: {
          id: string
          workout_exercise_id: string
          set_number: number
          reps: number | null
          weight: number | null
          completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_exercise_id: string
          set_number: number
          reps?: number | null
          weight?: number | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_exercise_id?: string
          set_number?: number
          reps?: number | null
          weight?: number | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
      }
      personal_records: {
        Row: {
          id: string
          user_id: string
          exercise_variation_id: string
          max_weight: number | null
          max_reps: number | null
          max_volume: number | null
          estimated_1rm: number | null
          achieved_at: string
          set_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exercise_variation_id: string
          max_weight?: number | null
          max_reps?: number | null
          max_volume?: number | null
          estimated_1rm?: number | null
          achieved_at: string
          set_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exercise_variation_id?: string
          max_weight?: number | null
          max_reps?: number | null
          max_volume?: number | null
          estimated_1rm?: number | null
          achieved_at?: string
          set_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
