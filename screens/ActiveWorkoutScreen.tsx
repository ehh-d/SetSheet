// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { WorkoutExerciseWithDetails, Set as SetType } from '../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type ActiveWorkoutNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ActiveWorkout'
>;
type ActiveWorkoutRouteProp = RouteProp<RootStackParamList, 'ActiveWorkout'>;

interface WorkoutData {
  id: string;
  workout_date: string;
  name: string | null;
  notes?: string | null;
  user_id?: string;
  workout_exercises: WorkoutExerciseWithDetails[];
}

export default function ActiveWorkoutScreen() {
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');

  const navigation = useNavigation<ActiveWorkoutNavigationProp>();
  const route = useRoute<ActiveWorkoutRouteProp>();

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
        user_id,
        workout_exercises (
          id,
          exercise_variation_id,
          sort_order,
          proposed_sets,
          proposed_reps_min,
          proposed_reps_max,
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
            is_completed,
            completed_at
          )
        )
      `)
      .eq('id', workoutId)
      .single();

    if (!error && data) {
      // Load previous workout data for each exercise
      const workoutWithPrevious = await loadPreviousWorkoutData(data as any);
      setWorkout(workoutWithPrevious);
      setNotes(data.notes || '');
    }
    setLoading(false);
  };

  const loadPreviousWorkoutData = async (workoutData: WorkoutData) => {
    // For each exercise, find the most recent completed workout with the same exercise
    const exercisesWithPrevious = await Promise.all(
      workoutData.workout_exercises.map(async (exercise) => {
        const exerciseVariationId = exercise.exercise_variation_id;

        // Query for the most recent completed workout with this exercise variation
        const { data: previousWorkout } = await supabase
          .from('workout_exercises')
          .select(`
            sets (
              set_number,
              reps,
              weight,
              is_completed
            ),
            workouts!inner (
              id,
              workout_date,
              status
            )
          `)
          .eq('exercise_variation_id', exerciseVariationId)
          .eq('workouts.user_id', workoutData.user_id)
          .eq('workouts.status', 'completed')
          .lt('workouts.workout_date', workoutData.workout_date)
          .order('workouts.workout_date', { ascending: false })
          .limit(1)
          .single();

        // Add previous sets data to the exercise
        return {
          ...exercise,
          previousSets: previousWorkout?.sets || [],
        };
      })
    );

    return {
      ...workoutData,
      workout_exercises: exercisesWithPrevious,
    };
  };

  const handleAddSet = async (workoutExerciseId: string) => {
    if (!workout) return;

    const exercise = workout.workout_exercises.find(e => e.id === workoutExerciseId);
    if (!exercise) return;

    const nextSetNumber = exercise.sets.length + 1;

    const { error } = await supabase
      .from('sets')
      .insert({
        workout_exercise_id: workoutExerciseId,
        set_number: nextSetNumber,
        reps: null,
        weight: null,
        is_completed: false,
      });

    if (!error) {
      await loadWorkout();
    }
  };

  const handleUpdateSet = async (
    setId: string,
    field: 'reps' | 'weight',
    value: string
  ) => {
    const numValue = value === '' ? null : parseFloat(value);

    const { error } = await supabase
      .from('sets')
      .update({ [field]: numValue } as any)
      .eq('id', setId);

    if (!error) {
      await loadWorkout();
    }
  };

  const handleToggleSetComplete = async (setId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('sets')
      .update({
        is_completed: !currentStatus,
        completed_at: !currentStatus ? new Date().toISOString() : null,
      })
      .eq('id', setId);

    if (!error) {
      await loadWorkout();
    }
  };

  const handleDeleteSet = async (setId: string, swipeableRef?: React.RefObject<Swipeable | null>) => {
    // Close the swipeable first for better UX
    if (swipeableRef?.current) {
      swipeableRef.current.close();
    }

    const { error } = await supabase
      .from('sets')
      .delete()
      .eq('id', setId);

    if (!error) {
      await loadWorkout();
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    setId: string,
    swipeableRef: React.RefObject<Swipeable | null>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteSet(setId, swipeableRef)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={styles.deleteActionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const handleCompleteWorkout = async () => {
    const { error } = await supabase
      .from('workouts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes || null,
      } as any)
      .eq('id', workoutId);

    if (!error) {
      navigation.navigate('WorkoutSummary', { workoutId });
    } else {
      Alert.alert('Error', error.message);
    }
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure? This will delete the workout.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('workouts').delete().eq('id', workoutId);
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  if (loading || !workout) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {format(new Date(workout.workout_date), 'MMM d')} • {workout.name}
        </Text>
        <Text style={styles.exerciseCount}>
          {workout.workout_exercises.length} exercises
        </Text>
      </View>

      {/* Exercises */}
      <ScrollView style={styles.content}>
        {workout.workout_exercises
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseBlock}>
              <View style={styles.exerciseHeader}>
                <View>
                  <Text style={styles.exerciseName}>
                    {exercise.exercise_variations.exercises.name}
                  </Text>
                  <Text style={styles.exerciseDetails}>
                    {exercise.exercise_variations.equipment} •{' '}
                    {exercise.exercise_variations.exercises.muscle_group}
                  </Text>
                </View>
              </View>

              {/* Set Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.setNumCol]}>Set</Text>
                <Text style={[styles.tableHeaderText, styles.prevCol]}>Previous</Text>
                <Text style={[styles.tableHeaderText, styles.repsCol]}>Reps</Text>
                <Text style={[styles.tableHeaderText, styles.weightCol]}>Lbs</Text>
                <Text style={[styles.tableHeaderText, styles.checkCol]}>✓</Text>
              </View>

              {/* Sets */}
              {exercise.sets
                .sort((a, b) => a.set_number - b.set_number)
                .map(set => {
                  // Find matching previous set by set number
                  const previousSet = exercise.previousSets?.find(
                    ps => ps.set_number === set.set_number
                  );
                  const previousText = previousSet
                    ? `${previousSet.reps} x ${previousSet.weight} lbs`
                    : '-';

                  const swipeableRef = useRef<Swipeable>(null);

                  return (
                    <Swipeable
                      key={set.id}
                      ref={swipeableRef}
                      renderRightActions={(progress, dragX) =>
                        renderRightActions(progress, dragX, set.id, swipeableRef)
                      }
                      overshootRight={false}
                      friction={2}
                    >
                      <View style={styles.setRow}>
                        <Text style={[styles.setNumber, styles.setNumCol]}>
                          {set.set_number}
                        </Text>
                        <Text style={[styles.previousValue, styles.prevCol]}>
                          {previousText}
                        </Text>
                        <TextInput
                          style={[styles.input, styles.repsCol]}
                          value={set.reps?.toString() || ''}
                          onChangeText={(value) => handleUpdateSet(set.id, 'reps', value)}
                          keyboardType="numeric"
                          placeholder="-"
                          placeholderTextColor="#888"
                        />
                        <TextInput
                          style={[styles.input, styles.weightCol]}
                          value={set.weight?.toString() || ''}
                          onChangeText={(value) => handleUpdateSet(set.id, 'weight', value)}
                          keyboardType="numeric"
                          placeholder="-"
                          placeholderTextColor="#888"
                        />
                        <TouchableOpacity
                          style={[styles.checkButton, styles.checkCol]}
                          onPress={() => handleToggleSetComplete(set.id, set.is_completed || false)}
                        >
                          <Text style={styles.checkText}>
                            {set.is_completed ? '✓' : '○'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </Swipeable>
                  );
                })}

              {/* Add Set Button */}
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => handleAddSet(exercise.id)}
              >
                <Text style={styles.addSetText}>+ Add Set</Text>
              </TouchableOpacity>
            </View>
          ))}

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Add workout notes..."
            placeholderTextColor="#888"
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.completeButton} onPress={handleCompleteWorkout}>
          <Text style={styles.completeButtonText}>Complete Workout</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCancelWorkout}>
          <Text style={styles.cancelText}>Cancel Workout</Text>
        </TouchableOpacity>
      </View>
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
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#888888',
  },
  content: {
    flex: 1,
  },
  exerciseBlock: {
    marginVertical: 12,
    marginHorizontal: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  exerciseHeader: {
    marginBottom: 16,
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
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888888',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  setNumCol: {
    width: 40,
  },
  prevCol: {
    width: 70,
  },
  repsCol: {
    width: 60,
  },
  weightCol: {
    width: 60,
  },
  checkCol: {
    width: 40,
  },
  setNumber: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  previousValue: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    fontSize: 14,
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  checkButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 20,
    color: '#33CC33',
  },
  addSetButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addSetText: {
    color: '#888888',
    fontSize: 14,
  },
  notesSection: {
    margin: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  notesLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    fontSize: 14,
    padding: 12,
    borderRadius: 6,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  completeButton: {
    backgroundColor: '#33CC33',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelText: {
    color: '#CC3333',
    fontSize: 14,
    textAlign: 'center',
  },
  deleteAction: {
    backgroundColor: '#CC3333',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
