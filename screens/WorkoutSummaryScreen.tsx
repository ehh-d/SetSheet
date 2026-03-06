import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { WorkoutExerciseWithDetails } from '../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { calculateVolume } from '../utils/calculations';
import { StatRow } from '../components/stats/StatRow';
import { ExerciseSummaryCard } from '../components/exercise/ExerciseSummaryCard';

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
          exercise_id,
          equipment,
          sort_order,
          exercises (
            id,
            name,
            muscle_group
          ),
          sets (
            id,
            set_number,
            reps,
            weight,
            is_completed,
            is_pr
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

  // Calculate stats
  const totalExercises = workout.workout_exercises.length;
  const totalSets = workout.workout_exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.is_completed).length,
    0
  );
  const totalReps = workout.workout_exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.is_completed).reduce((s, set) => s + (set.reps || 0), 0),
    0
  );
  const totalVolume = workout.workout_exercises.reduce((sum, ex) => {
    const completedSets = ex.sets.filter(s => s.is_completed);
    const exerciseVolume = calculateVolume(
      completedSets.map(s => ({ reps: s.reps || 0, weight: s.weight || 0 }))
    );
    return sum + exerciseVolume;
  }, 0);

  const sortedExercises = [...workout.workout_exercises].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  // Format date for header
  const formattedDate = format(parseISO(workout.workout_date), 'MMMM do');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.workoutTitle}>{workout.name || 'Workout'}</Text>
        <Text style={styles.dateSubtitle}>{formattedDate}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Workout Summary</Text>
          <View style={styles.statsCard}>
            <StatRow label="Exercises" value={totalExercises} />
            <StatRow label="Total Sets" value={totalSets} />
            <StatRow label="Total Reps" value={totalReps} />
            <StatRow label="Total Volume" value={totalVolume.toLocaleString()} unit="lbs" />
          </View>
        </View>

        {/* Notes Section */}
        {workout.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Workout Notes</Text>
            <Text style={styles.notesText}>{workout.notes}</Text>
          </View>
        )}

        {/* Exercise List */}
        <View style={styles.exercisesSection}>
          {sortedExercises.map((exercise) => (
            <ExerciseSummaryCard
              key={exercise.id}
              exercise={exercise}
            />
          ))}
        </View>
      </ScrollView>

      {/* Fixed Close Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Text style={styles.closeButtonText}>Close Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loader: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dateSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  statsCard: {},
  notesSection: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D5D5D5',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20,
  },
  exercisesSection: {
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  closeButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
