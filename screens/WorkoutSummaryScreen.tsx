import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { WorkoutExerciseWithDetails } from '../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { calculateVolume, calculate1RM } from '../utils/calculations';

type WorkoutSummaryNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WorkoutSummary'
>;
type WorkoutSummaryRouteProp = RouteProp<RootStackParamList, 'WorkoutSummary'>;

interface WorkoutData {
  id: string;
  workout_date: string;
  name: string | null;
  notes: string | null;
  workout_exercises: WorkoutExerciseWithDetails[];
}

export default function WorkoutSummaryScreen() {
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<WorkoutSummaryNavigationProp>();
  const route = useRoute<WorkoutSummaryRouteProp>();

  const { workoutId } = route.params;

  useEffect(() => {
    loadWorkout();
  }, [workoutId]);

  const loadWorkout = async () => {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        id,
        workout_date,
        name,
        notes,
        workout_exercises (
          id,
          exercise_variation_id,
          order_index,
          exercise_variations (
            id,
            equipment,
            exercises (
              id,
              name,
              muscle_group
            )
          ),
          sets (
            id,
            set_number,
            reps,
            weight,
            completed
          )
        )
      `)
      .eq('id', workoutId)
      .single();

    if (!error && data) {
      setWorkout(data as any);
    }
    setLoading(false);
  };

  if (loading || !workout) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
      </View>
    );
  }

  const totalExercises = workout.workout_exercises.length;
  const totalSets = workout.workout_exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
    0
  );
  const totalReps = workout.workout_exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0),
    0
  );
  const totalVolume = workout.workout_exercises.reduce((sum, ex) => {
    const exerciseVolume = calculateVolume(
      ex.sets.map(s => ({ reps: s.reps || 0, weight: s.weight || 0 }))
    );
    return sum + exerciseVolume;
  }, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backText}>‹ Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Summary</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.workoutTitle}>{workout.name}</Text>
        <Text style={styles.workoutDate}>
          {format(new Date(workout.workout_date), 'MMMM d, yyyy')}
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalExercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>Total Sets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalReps}</Text>
            <Text style={styles.statLabel}>Total Reps</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalVolume.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Volume</Text>
          </View>
        </View>
      </View>

      {/* Exercises */}
      <ScrollView style={styles.content}>
        {workout.workout_exercises
          .sort((a, b) => a.order_index - b.order_index)
          .map((exercise, index) => {
            const completedSets = exercise.sets.filter(s => s.completed);
            const exerciseVolume = calculateVolume(
              completedSets.map(s => ({ reps: s.reps || 0, weight: s.weight || 0 }))
            );
            const best1RM = Math.max(
              ...completedSets.map(s =>
                s.reps && s.weight ? calculate1RM(s.weight, s.reps) : 0
              )
            );

            return (
              <View key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>
                  {exercise.exercise_variations.exercises.name}
                </Text>
                <Text style={styles.exerciseDetails}>
                  {exercise.exercise_variations.equipment} • {completedSets.length} sets •{' '}
                  {exerciseVolume} lbs
                </Text>

                {completedSets.map(set => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={styles.setText}>
                      Set {set.set_number}: {set.reps} reps × {set.weight} lbs
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}

        {workout.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{workout.notes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  loader: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backText: {
    color: '#888888',
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  exerciseCard: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 12,
  },
  setRow: {
    paddingVertical: 4,
  },
  setText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  notesCard: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888888',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});
