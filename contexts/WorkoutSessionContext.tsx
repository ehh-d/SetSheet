// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

function makeLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface LocalSet {
  localId: string;
  set_number: number;
  reps: string;
  weight: string;
  is_completed: boolean;
}

export interface SessionExercise {
  localId: string;
  exerciseId: string;
  exerciseName: string;
  equipment: string;
  muscleGroup: string;
  proposedSets: number;
  proposedRepsMin: number | null;
  sort_order: number;
  sets: LocalSet[];
  previousBest: { reps: number | null; weight: number | null } | null;
}

export interface WorkoutSession {
  date: string;
  workoutName: string;
  categoryId: string | null;
  exercises: SessionExercise[];
  workoutId?: string; // set when editing an existing completed workout
}

interface InitExercise {
  exerciseId: string;
  exerciseName: string;
  equipment: string;
  muscleGroup: string;
  proposedSets?: number;
  proposedRepsMin?: number | null;
}

interface ExistingSet {
  set_number: number;
  reps: number | null;
  weight: number | null;
  is_completed: boolean;
}

interface ExistingExercise {
  exerciseId: string;
  exerciseName: string;
  equipment: string;
  muscleGroup: string;
  sort_order: number;
  sets: ExistingSet[];
}

interface WorkoutSessionContextType {
  session: WorkoutSession | null;
  initSession: (data: { date: string; workoutName: string; categoryId: string | null; exercises: InitExercise[] }) => void;
  initSessionFromExisting: (data: { workoutId: string; date: string; workoutName: string; categoryId: string | null; exercises: ExistingExercise[] }) => void;
  clearSession: () => void;
  loadPreviousSets: (userId: string, exercises: SessionExercise[], date: string) => Promise<void>;
  addExercises: (exercises: InitExercise[]) => void;
  removeExercise: (localId: string) => void;
  reorderExercises: (reordered: SessionExercise[]) => void;
  updateWorkoutName: (name: string) => void;
  updateExerciseEquipment: (exerciseLocalId: string, equipment: string) => void;
  addSet: (exerciseLocalId: string) => void;
  updateSetField: (exerciseLocalId: string, localSetId: string, field: 'reps' | 'weight', value: string) => void;
  toggleSetComplete: (exerciseLocalId: string, localSetId: string) => void;
  markAllSetsComplete: (exerciseLocalId: string) => void;
  deleteSet: (exerciseLocalId: string, localSetId: string) => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextType | null>(null);

function buildInitialSets(proposedSets: number, proposedRepsMin: number | null): LocalSet[] {
  return Array.from({ length: proposedSets }, (_, i) => ({
    localId: makeLocalId(),
    set_number: i + 1,
    reps: proposedRepsMin != null ? proposedRepsMin.toString() : '',
    weight: '',
    is_completed: false,
  }));
}

function buildSessionExercise(ex: InitExercise, index: number): SessionExercise {
  const proposedSets = ex.proposedSets ?? 1;
  const proposedRepsMin = ex.proposedRepsMin ?? null;
  return {
    localId: makeLocalId(),
    exerciseId: ex.exerciseId,
    exerciseName: ex.exerciseName,
    equipment: ex.equipment,
    muscleGroup: ex.muscleGroup,
    proposedSets,
    proposedRepsMin,
    sort_order: index,
    sets: buildInitialSets(proposedSets, proposedRepsMin),
    previousBest: null,
  };
}

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WorkoutSession | null>(null);

  const initSession = useCallback((data: { date: string; workoutName: string; categoryId: string | null; exercises: InitExercise[] }) => {
    const exercises = data.exercises.map((ex, i) => buildSessionExercise(ex, i));
    setSession({ date: data.date, workoutName: data.workoutName, categoryId: data.categoryId, exercises });
  }, []);

  const initSessionFromExisting = useCallback((data: { workoutId: string; date: string; workoutName: string; categoryId: string | null; exercises: ExistingExercise[] }) => {
    const exercises: SessionExercise[] = data.exercises.map(ex => ({
      localId: makeLocalId(),
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      equipment: ex.equipment,
      muscleGroup: ex.muscleGroup,
      proposedSets: ex.sets.length || 1,
      proposedRepsMin: null,
      sort_order: ex.sort_order,
      previousBest: null,
      sets: ex.sets.map((s, i) => ({
        localId: makeLocalId(),
        set_number: s.set_number ?? i + 1,
        reps: s.reps != null ? s.reps.toString() : '',
        weight: s.weight != null ? s.weight.toString() : '',
        is_completed: s.is_completed,
      })),
    }));
    setSession({ date: data.date, workoutName: data.workoutName, categoryId: data.categoryId, exercises, workoutId: data.workoutId });
  }, []);

  const clearSession = useCallback(() => setSession(null), []);

  const loadPreviousSets = useCallback(async (userId: string, exercises: SessionExercise[], date: string) => {
    const results = await Promise.all(
      exercises.map(ex =>
        supabase.rpc('get_previous_workout_sets', {
          p_user_id: userId,
          p_exercise_id: ex.exerciseId,
          p_before_date: date,
        })
      )
    );

    setSession(prev => {
      if (!prev) return prev;
      const updatedExercises = prev.exercises.map((ex, i) => {
        const prevSets: any[] = results[i]?.data ?? [];
        const best = prevSets.reduce((acc: any, ps: any) => {
          if (ps.weight != null && (acc == null || ps.weight > acc.weight)) return ps;
          return acc;
        }, null);
        const previousBest = best ? { reps: best.reps ?? null, weight: best.weight ?? null } : null;

        // Pre-fill weight for manual workout sets that are still empty
        const updatedSets = ex.sets.map(s => ({
          ...s,
          weight:
            s.weight === '' && previousBest?.weight != null && ex.proposedRepsMin == null
              ? previousBest.weight.toString()
              : s.weight,
        }));

        return { ...ex, previousBest, sets: updatedSets };
      });
      return { ...prev, exercises: updatedExercises };
    });
  }, []);

  const updateWorkoutName = useCallback((name: string) => {
    setSession(prev => (prev ? { ...prev, workoutName: name } : prev));
  }, []);

  const updateExerciseEquipment = useCallback((exerciseLocalId: string, equipment: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.localId === exerciseLocalId ? { ...ex, equipment } : ex
        ),
      };
    });
  }, []);

  const markAllSetsComplete = useCallback((exerciseLocalId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.localId !== exerciseLocalId) return ex;
          return {
            ...ex,
            sets: ex.sets.map(s => ({ ...s, is_completed: true })),
          };
        }),
      };
    });
  }, []);

  const addExercises = useCallback((newExercises: InitExercise[]) => {
    setSession(prev => {
      if (!prev) return prev;
      const existingKeys = new Set(prev.exercises.map(ex => `${ex.exerciseId}::${ex.equipment}`));
      const toAdd = newExercises
        .filter(ex => !existingKeys.has(`${ex.exerciseId}::${ex.equipment}`))
        .map((ex, i) => buildSessionExercise(ex, prev.exercises.length + i));
      return { ...prev, exercises: [...prev.exercises, ...toAdd] };
    });
  }, []);

  const removeExercise = useCallback((localId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, exercises: prev.exercises.filter(ex => ex.localId !== localId) };
    });
  }, []);

  const reorderExercises = useCallback((reordered: SessionExercise[]) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, exercises: reordered.map((ex, i) => ({ ...ex, sort_order: i })) };
    });
  }, []);

  const addSet = useCallback((exerciseLocalId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.localId !== exerciseLocalId) return ex;
          const sorted = [...ex.sets].sort((a, b) => a.set_number - b.set_number);
          const lastSet = sorted[sorted.length - 1];
          const newSet: LocalSet = {
            localId: makeLocalId(),
            set_number: sorted.length + 1,
            reps: lastSet?.reps ?? '',
            weight: lastSet?.weight ?? '',
            is_completed: false,
          };
          const updatedSets = ex.sets.map(s =>
            s.localId === lastSet?.localId && !s.is_completed
              ? { ...s, is_completed: true }
              : s
          );
          return { ...ex, sets: [...updatedSets, newSet] };
        }),
      };
    });
  }, []);

  const updateSetField = useCallback((exerciseLocalId: string, localSetId: string, field: 'reps' | 'weight', value: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.localId !== exerciseLocalId) return ex;
          return {
            ...ex,
            sets: ex.sets.map(s => (s.localId === localSetId ? { ...s, [field]: value } : s)),
          };
        }),
      };
    });
  }, []);

  const toggleSetComplete = useCallback((exerciseLocalId: string, localSetId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.localId !== exerciseLocalId) return ex;
          return {
            ...ex,
            sets: ex.sets.map(s =>
              s.localId === localSetId ? { ...s, is_completed: !s.is_completed } : s
            ),
          };
        }),
      };
    });
  }, []);

  const deleteSet = useCallback((exerciseLocalId: string, localSetId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.localId !== exerciseLocalId) return ex;
          const filtered = ex.sets
            .filter(s => s.localId !== localSetId)
            .sort((a, b) => a.set_number - b.set_number)
            .map((s, i) => ({ ...s, set_number: i + 1 }));
          return { ...ex, sets: filtered };
        }),
      };
    });
  }, []);

  return (
    <WorkoutSessionContext.Provider
      value={{
        session,
        initSession,
        initSessionFromExisting,
        clearSession,
        loadPreviousSets,
        addExercises,
        removeExercise,
        reorderExercises,
        updateWorkoutName,
        updateExerciseEquipment,
        addSet,
        updateSetField,
        toggleSetComplete,
        markAllSetsComplete,
        deleteSet,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) throw new Error('useWorkoutSession must be used within WorkoutSessionProvider');
  return ctx;
}
