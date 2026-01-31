import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Workout, WorkoutExerciseWithDetails } from '../types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { CalendarPanel } from '../components/CalendarPanel';
import { calculateVolume } from '../utils/calculations';

interface WorkoutWithExercises extends Workout {
  workout_exercises?: WorkoutExerciseWithDetails[];
}

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const [focusDate, setFocusDate] = useState(new Date());
  const [sheet, setSheet] = useState<WorkoutWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // Load sheet for focus date
  const loadSheetForDate = useCallback(async (date: Date) => {
    if (!session?.user) return;

    setLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');

    // First get the basic workout data
    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('workout_date', dateStr)
      .single();

    if (workoutError || !workoutData) {
      setSheet(null);
      setLoading(false);
      return;
    }

    // For completed workouts, fetch exercise details
    if (workoutData.status === 'completed') {
      const { data: detailedData } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            id,
            exercise_variation_id,
            sort_order,
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
              is_completed
            )
          )
        `)
        .eq('id', workoutData.id)
        .single();

      if (detailedData) {
        setSheet(detailedData as WorkoutWithExercises);
      } else {
        setSheet(workoutData);
      }
    } else {
      setSheet(workoutData);
    }
    setLoading(false);
  }, [session?.user]);

  // Load sheet when focus date changes or screen focuses
  useFocusEffect(
    useCallback(() => {
      loadSheetForDate(focusDate);
    }, [focusDate, loadSheetForDate])
  );

  const handleDateSelect = (date: Date) => {
    setFocusDate(date);
  };

  return (
    <View style={styles.container}>
      {/* Calendar Panel */}
      <CalendarPanel onDateSelect={handleDateSelect} focusDate={focusDate} />

      {/* Sheet View Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : sheet ? (
          sheet.status === 'completed' && sheet.workout_exercises ? (
            // Completed workout - show details inline
            <ScrollView style={styles.completedWorkout} showsVerticalScrollIndicator={false}>
              <View style={styles.completedHeader}>
                <Text style={styles.sheetName}>{sheet.name || 'Workout Completed'}</Text>
                <Text style={styles.sheetDate}>{format(focusDate, 'MMMM d, yyyy')}</Text>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{sheet.workout_exercises.length}</Text>
                  <Text style={styles.statLabel}>Exercises</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {sheet.workout_exercises.reduce(
                      (sum, ex) => sum + ex.sets.filter(s => s.is_completed).length,
                      0
                    )}
                  </Text>
                  <Text style={styles.statLabel}>Total Sets</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {sheet.workout_exercises.reduce(
                      (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0),
                      0
                    )}
                  </Text>
                  <Text style={styles.statLabel}>Total Reps</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {sheet.workout_exercises
                      .reduce((sum, ex) => {
                        const exerciseVolume = calculateVolume(
                          ex.sets.map(s => ({ reps: s.reps || 0, weight: s.weight || 0 }))
                        );
                        return sum + exerciseVolume;
                      }, 0)
                      .toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>Total Volume</Text>
                </View>
              </View>

              {/* Exercise Cards */}
              {sheet.workout_exercises
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                .map(exercise => {
                  const completedSets = exercise.sets.filter(s => s.is_completed);
                  const exerciseVolume = calculateVolume(
                    completedSets.map(s => ({ reps: s.reps || 0, weight: s.weight || 0 }))
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
            </ScrollView>
          ) : (
            // In-progress workout - show summary with continue button
            <View style={styles.sheetSummary}>
              <Text style={styles.sheetName}>
                {sheet.name || 'Workout in Progress'}
              </Text>
              <Text style={styles.sheetDate}>
                {format(focusDate, 'MMMM d, yyyy')}
              </Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation.navigate('ActiveWorkout', { workoutId: sheet.id })}
              >
                <Text style={styles.viewButtonText}>Continue Sheet</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View style={styles.noSheet}>
            <Text style={styles.noSheetDate}>
              {format(focusDate, 'MMMM d, yyyy')}
            </Text>
            <Text style={styles.noSheetText}>No sheet started</Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate('CategorySelection', { date: format(focusDate, 'yyyy-MM-dd') })}
            >
              <Text style={styles.startButtonText}>Start a Sheet</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSheet: {
    alignItems: 'center',
  },
  noSheetDate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  noSheetText: {
    fontSize: 18,
    color: '#888888',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sheetSummary: {
    alignItems: 'center',
  },
  sheetName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sheetDate: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 20,
  },
  viewButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Completed workout styles
  completedWorkout: {
    flex: 1,
    width: '100%',
  },
  completedHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
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
});
