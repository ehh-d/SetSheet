// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { WorkoutHeader } from '../components/WorkoutHeader';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
import { WorkoutExerciseWithDetails, Set as SetType } from '../types';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
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
  const [workoutName, setWorkoutName] = useState('');
  const [isEditNameVisible, setIsEditNameVisible] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [setInputValues, setSetInputValues] = useState<Record<string, { reps: string; weight: string }>>({});

  const navigation = useNavigation<ActiveWorkoutNavigationProp>();
  const route = useRoute<ActiveWorkoutRouteProp>();
  const insets = useSafeAreaInsets();

  const { workoutId } = route.params;

  useEffect(() => {
    loadWorkout();
  }, [workoutId]);

  useFocusEffect(
    useCallback(() => {
      loadWorkout();
    }, [workoutId])
  );

  // Sync new sets into local input state without overwriting in-progress edits
  // Pre-fill from previous best weight if set has no data
  useEffect(() => {
    if (!workout) return;
    setSetInputValues(prev => {
      const next = { ...prev };
      workout.workout_exercises.forEach(ex => {
        const prevSets = ex.previousSets ?? [];
        const maxPrevWeight = prevSets.length
          ? Math.max(...prevSets.map(ps => ps.weight ?? 0)) || null
          : null;
        ex.sets.forEach(set => {
          if (!next[set.id]) {
            const matchingPrev = prevSets.find(ps => ps.set_number === set.set_number);
            const hasTemplateReps = ex.proposed_reps_min != null;
            next[set.id] = {
              reps: set.reps?.toString() ?? matchingPrev?.reps?.toString() ?? '',
              weight: set.weight?.toString() ?? (hasTemplateReps ? '' : (maxPrevWeight ? maxPrevWeight.toString() : '')),
            };
          }
        });
      });
      return next;
    });
  }, [workout]);

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
          exercise_id,
          equipment,
          sort_order,
          proposed_sets,
          proposed_reps_min,
          proposed_reps_max,
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
            completed_at
          )
        )
      `)
      .eq('id', workoutId)
      .single();

    if (!error && data) {
      const workoutWithPrevious = await loadPreviousWorkoutData(data as any);
      setWorkout(workoutWithPrevious);
      setNotes(data.notes || '');
      setWorkoutName(data.name || '');
    }
    setLoading(false);
  };

  const loadPreviousWorkoutData = async (workoutData: WorkoutData) => {
    const exercisesWithPrevious = await Promise.all(
      workoutData.workout_exercises.map(async (exercise) => {
        const { data: previousSets } = await supabase.rpc('get_previous_workout_sets', {
          p_user_id: workoutData.user_id,
          p_exercise_id: exercise.exercise_id,
          p_before_date: workoutData.workout_date
        });

        return {
          ...exercise,
          previousSets: previousSets || [],
        };
      })
    );

    return {
      ...workoutData,
      workout_exercises: exercisesWithPrevious,
    };
  };

  const openEditName = () => {
    setEditingName(workoutName);
    setIsEditNameVisible(true);
  };

  const saveEditName = async () => {
    const trimmed = editingName.trim();
    if (trimmed) {
      await supabase.from('workouts').update({ name: trimmed }).eq('id', workoutId);
      setWorkoutName(trimmed);
    }
    setIsEditNameVisible(false);
  };

  const handleAddSet = async (workoutExerciseId: string) => {
    if (!workout) return;

    const exercise = workout.workout_exercises.find(e => e.id === workoutExerciseId);
    if (!exercise) return;

    const sortedSets = [...exercise.sets].sort((a, b) => a.set_number - b.set_number);
    const lastSet = sortedSets[sortedSets.length - 1];
    const nextSetNumber = sortedSets.length + 1;
    const completedAt = new Date().toISOString();

    // Auto-complete the last set if it isn't already
    if (lastSet && !lastSet.is_completed) {
      supabase.from('sets').update({ is_completed: true, completed_at: completedAt }).eq('id', lastSet.id);
    }

    // Duplicate last set's input values
    const lastRepsStr = lastSet ? (setInputValues[lastSet.id]?.reps ?? '') : '';
    const lastWeightStr = lastSet ? (setInputValues[lastSet.id]?.weight ?? '') : '';
    const newReps = lastRepsStr !== '' ? parseFloat(lastRepsStr) : null;
    const newWeight = lastWeightStr !== '' ? parseFloat(lastWeightStr) : null;

    const { data: newSet, error } = await supabase
      .from('sets')
      .insert({
        workout_exercise_id: workoutExerciseId,
        set_number: nextSetNumber,
        reps: newReps,
        weight: newWeight,
        is_completed: false,
      })
      .select()
      .single();

    if (!error && newSet) {
      setSetInputValues(prev => ({
        ...prev,
        [newSet.id]: { reps: lastRepsStr, weight: lastWeightStr },
      }));
      setWorkout(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          workout_exercises: prev.workout_exercises.map(ex => {
            if (ex.id !== workoutExerciseId) return ex;
            return {
              ...ex,
              sets: [
                ...ex.sets.map(s =>
                  lastSet && !lastSet.is_completed && s.id === lastSet.id
                    ? { ...s, is_completed: true, completed_at: completedAt }
                    : s
                ),
                { id: newSet.id, set_number: nextSetNumber, reps: newReps, weight: newWeight, is_completed: false, completed_at: null },
              ],
            };
          }),
        };
      });
    }
  };

  const handleUpdateSet = async (
    setId: string,
    field: 'reps' | 'weight',
    value: string
  ) => {
    const numValue = value === '' ? null : parseFloat(value);
    await supabase
      .from('sets')
      .update({ [field]: numValue } as any)
      .eq('id', setId);
  };

  const handleToggleSetComplete = async (setId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const newCompletedAt = newStatus ? new Date().toISOString() : null;

    // Optimistic update
    setWorkout(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        workout_exercises: prev.workout_exercises.map(ex => ({
          ...ex,
          sets: ex.sets.map(s =>
            s.id === setId ? { ...s, is_completed: newStatus, completed_at: newCompletedAt } : s
          ),
        })),
      };
    });

    supabase.from('sets').update({ is_completed: newStatus, completed_at: newCompletedAt }).eq('id', setId);
  };

  const handleDeleteExercise = (workoutExerciseId: string) => {
    Alert.alert(
      'Remove Exercise',
      'Remove this exercise from your workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('sets').delete().eq('workout_exercise_id', workoutExerciseId);
            await supabase.from('workout_exercises').delete().eq('id', workoutExerciseId);
            await loadWorkout();
          },
        },
      ]
    );
  };

  const handleDeleteSet = async (setId: string) => {
    const { error } = await supabase.from('sets').delete().eq('id', setId);

    if (!error) {
      setWorkout(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          workout_exercises: prev.workout_exercises.map(ex => ({
            ...ex,
            sets: ex.sets.filter(s => s.id !== setId),
          })),
        };
      });
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    setId: string
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteSet(setId)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={styles.deleteActionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const hasAnySets = workout?.workout_exercises.some(ex => ex.sets.length > 0) || false;

  const completeWorkout = async () => {
    const { error } = await supabase
      .from('workouts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes || null,
      } as any)
      .eq('id', workoutId);

    if (!error) {
      navigation.reset({
        index: 0,
        routes: [{
          name: 'MainTabs',
          params: { screen: 'Home', params: { initialFocusDate: workout?.workout_date } },
        }],
      });
    } else {
      Alert.alert('Error', error.message);
    }
  };

  const handleCompleteWorkout = async () => {
    if (!hasAnySets) {
      Alert.alert(
        'No Sets Added',
        'Please add at least one set before completing the workout.',
        [{ text: 'OK' }]
      );
      return;
    }

    const incompleteSets = workout?.workout_exercises.flatMap(ex =>
      ex.sets.filter(s => !s.is_completed)
    ) ?? [];

    if (incompleteSets.length > 0) {
      Alert.alert(
        'Incomplete Sets',
        `You have ${incompleteSets.length} set${incompleteSets.length > 1 ? 's' : ''} not marked complete. Mark all as complete?`,
        [
          {
            text: 'No',
            onPress: completeWorkout,
          },
          {
            text: 'Yes',
            onPress: async () => {
              const completedAt = new Date().toISOString();
              await Promise.all(
                incompleteSets.map(s =>
                  supabase.from('sets').update({ is_completed: true, completed_at: completedAt }).eq('id', s.id)
                )
              );
              await completeWorkout();
            },
          },
        ]
      );
      return;
    }

    await completeWorkout();
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
            navigation.navigate('MainTabs');
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

  const sortedExercises = [...workout.workout_exercises].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  const [year, month, day] = workout.workout_date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedDate = `${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}`;
  const ordinalDay = dateObj.getDate();

  return (
    <View style={styles.container}>
      <WorkoutHeader
        date={formattedDate}
        ordinalDay={ordinalDay}
        workoutName={workoutName}
        subtitle={`${workout.workout_exercises.length} Exercises`}
        onCancel={handleCancelWorkout}
        onEditName={openEditName}
      />

      {/* Exercise List */}
      <ScrollView style={styles.content}>
        {sortedExercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseBlock}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseHeaderRow}>
                <View style={styles.exerciseHeaderInfo}>
                  <Text style={styles.exerciseName}>
                    {exercise.exercises.name}
                  </Text>
                  <Text style={styles.exerciseDetails}>
                    {exercise.equipment} •{' '}
                    {exercise.exercises.muscle_group}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteExercise(exercise.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#666666" />
                </TouchableOpacity>
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
                const previousSet = exercise.previousSets?.find(
                  ps => ps.set_number === set.set_number
                );
                const previousText = previousSet
                  ? `${previousSet.reps} x ${previousSet.weight} lbs`
                  : '-';

                return (
                  <Swipeable
                    key={set.id}
                    renderRightActions={(progress, dragX) =>
                      renderRightActions(progress, dragX, set.id)
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
                        value={setInputValues[set.id]?.reps ?? ''}
                        onChangeText={(value) =>
                          setSetInputValues(prev => ({
                            ...prev,
                            [set.id]: { ...prev[set.id], reps: value },
                          }))
                        }
                        onBlur={() => handleUpdateSet(set.id, 'reps', setInputValues[set.id]?.reps ?? '')}
                        keyboardType="numeric"
                        placeholder="-"
                        placeholderTextColor="#888"
                      />
                      <TextInput
                        style={[styles.input, styles.weightCol]}
                        value={setInputValues[set.id]?.weight ?? ''}
                        onChangeText={(value) =>
                          setSetInputValues(prev => ({
                            ...prev,
                            [set.id]: { ...prev[set.id], weight: value },
                          }))
                        }
                        onBlur={() => handleUpdateSet(set.id, 'weight', setInputValues[set.id]?.weight ?? '')}
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

        {/* Add Exercise */}
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => navigation.navigate('ExerciseSearch', {
            categoryId: '',
            categoryName: workoutName,
            date: workout.workout_date,
            existingWorkoutId: workoutId,
          })}
        >
          <Ionicons name="add" size={18} color="#888888" />
          <Text style={styles.addExerciseText}>Add/Edit Exercise</Text>
        </TouchableOpacity>

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
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.completeButton, !hasAnySets && styles.completeButtonDisabled]}
          onPress={handleCompleteWorkout}
          disabled={!hasAnySets}
        >
          <Text style={[styles.completeButtonText, !hasAnySets && styles.completeButtonTextDisabled]}>
            Complete Workout
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit Name Modal */}
      <Modal
        visible={isEditNameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditNameVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setIsEditNameVisible(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Workout</Text>
            <TextInput
              style={styles.modalInput}
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
              selectTextOnFocus
              placeholder="Workout name"
              placeholderTextColor="#999999"
              returnKeyType="done"
              onSubmitEditing={saveEditName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsEditNameVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveEditName}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  content: {
    flex: 1,
  },
  exerciseBlock: {
    marginVertical: 8,
    marginHorizontal: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  exerciseHeader: {
    marginBottom: 16,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  exerciseHeaderInfo: {
    flex: 1,
    marginRight: 12,
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
    flex: 1,
    textAlign: 'center',
  },
  prevCol: {
    flex: 2.5,
    textAlign: 'center',
  },
  repsCol: {
    flex: 2,
  },
  weightCol: {
    flex: 2,
  },
  checkCol: {
    flex: 1,
    alignItems: 'center',
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
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 14,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    gap: 6,
  },
  addExerciseText: {
    color: '#888888',
    fontSize: 15,
    fontWeight: '500',
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
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  completeButton: {
    backgroundColor: '#33CC33',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  completeButtonDisabled: {
    backgroundColor: '#2A2A2A',
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  completeButtonTextDisabled: {
    color: '#888888',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#888888',
    fontWeight: '500',
  },
  modalSaveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalSaveText: {
    fontSize: 15,
    color: '#1B1B1B',
    fontWeight: '700',
  },
});
