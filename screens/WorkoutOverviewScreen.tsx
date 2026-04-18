// @ts-nocheck
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useWorkoutSession, SessionExercise } from '../contexts/WorkoutSessionContext';
import { mmssToSeconds } from '../utils/metricConfig';
import { supabase } from '../lib/supabase';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ITEM_HEIGHT = 82; // approximate height of each exercise row including margins

type NavProp = NativeStackNavigationProp<RootStackParamList, 'WorkoutOverview'>;
type RoutePropType = RouteProp<RootStackParamList, 'WorkoutOverview'>;

export default function WorkoutOverviewScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { session: authSession } = useAuth();
  const {
    session,
    clearSession,
    loadPreviousSets,
    removeExercise,
    reorderExercises,
    updateWorkoutName,
  } = useWorkoutSession();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditNameVisible, setIsEditNameVisible] = useState(false);
  const [editingName, setEditingName] = useState('');

  // Drag-to-reorder state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState(-1);
  const dragOriginIndex = useRef(-1);
  const dragStartPageY = useRef(0);
  const draggingIdRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const { date } = route.params;

  useEffect(() => {
    if (session && authSession?.user) {
      loadPreviousSets(authSession.user.id, session.exercises, session.date);
    }
  }, []);

  const openEditName = () => {
    setEditingName(session?.workoutName ?? '');
    setIsEditNameVisible(true);
  };

  const saveEditName = () => {
    if (editingName.trim()) updateWorkoutName(editingName.trim());
    setIsEditNameVisible(false);
  };

  const isEditMode = !!session?.workoutId;

  const handleCancel = () => {
    Alert.alert(
      isEditMode ? 'Cancel Update' : 'Cancel Workout',
      isEditMode ? 'Are you sure? Your changes will be lost.' : 'Are you sure? Your progress will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: isEditMode ? 'Cancel Update' : 'Cancel Workout',
          style: 'destructive',
          onPress: () => {
            clearSession();
            navigation.navigate('MainTabs');
          },
        },
      ]
    );
  };

  // Whether a single set has valid primary metric data (non-empty, non-zero)
  const setHasValidData = (ex: any, s: any) => {
    const validNum = (v: string) => v !== '' && parseFloat(v) !== 0 && !isNaN(parseFloat(v));
    switch (ex.metric_type) {
      case 'time':            return s.duration !== '';
      case 'distance_weight': return validNum(s.distance);
      case 'cardio':          return validNum(s.distance) || s.duration !== '';
      case 'hybrid':          return validNum(s.reps) || s.duration !== '';
      default:                return validNum(s.reps);
    }
  };

  // Whether an exercise has at least one set with valid primary metric data
  const exerciseHasData = (ex: any) => ex.sets.some((s: any) => setHasValidData(ex, s));

  // Ordered exercises accounting for active drag
  const orderedExercises = useMemo(() => {
    if (!session) return [];
    if (!draggingId || dragOverIndex === -1) return session.exercises;
    const exs = [...session.exercises];
    const fromIdx = exs.findIndex(e => e.localId === draggingId);
    if (fromIdx === -1) return exs;
    const [item] = exs.splice(fromIdx, 1);
    exs.splice(Math.max(0, Math.min(exs.length, dragOverIndex)), 0, item);
    return exs;
  }, [session?.exercises, draggingId, dragOverIndex]);

  const makeDragHandleProps = (localId: string, index: number) => ({
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: any) => {
      dragStartPageY.current = e.nativeEvent.pageY;
      dragOriginIndex.current = index;
      draggingIdRef.current = localId;
      setDraggingId(localId);
      setDragOverIndex(index);
    },
    onResponderMove: (e: any) => {
      const dy = e.nativeEvent.pageY - dragStartPageY.current;
      const slotOffset = Math.round(dy / ITEM_HEIGHT);
      const newIndex = Math.max(
        0,
        Math.min((session?.exercises.length ?? 1) - 1, dragOriginIndex.current + slotOffset)
      );
      setDragOverIndex(newIndex);
    },
    onResponderRelease: () => {
      if (draggingIdRef.current) {
        reorderExercises(orderedExercises);
      }
      draggingIdRef.current = null;
      setDraggingId(null);
      setDragOverIndex(-1);
    },
  });

  const submitWorkout = async (skipIncomplete: boolean) => {
    if (!session || !authSession?.user) return;
    setIsSubmitting(true);

    try {
      const { data: existingWorkouts } = await supabase
        .from('workouts')
        .select('id, status')
        .eq('user_id', authSession.user.id)
        .eq('workout_date', session.date);

      if (existingWorkouts && existingWorkouts.length > 0) {
        const completedWorkout = existingWorkouts.find(w => w.status === 'completed');
        if (completedWorkout && !session.workoutId) {
          setIsSubmitting(false);
          Alert.alert(
            'Workout Already Exists',
            'You already have a completed workout for this date.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Continue Anyway', onPress: () => doSubmit(skipIncomplete) },
            ]
          );
          return;
        }
        const activeWorkout = existingWorkouts.find(w => w.status === 'active' && w.id !== session.workoutId);
        if (activeWorkout) {
          await supabase.from('workouts').delete().eq('id', activeWorkout.id);
        }
      }

      await doSubmit(skipIncomplete);
    } catch (error: any) {
      setIsSubmitting(false);
      Alert.alert('Error', error.message);
    }
  };

  const doSubmit = async (skipIncomplete: boolean) => {
    if (!session || !authSession?.user) return;
    setIsSubmitting(true);

    try {
      const completedAt = new Date().toISOString();
      let workoutId: string;

      if (session.workoutId) {
        const { data: existingWEs } = await supabase
          .from('workout_exercises')
          .select('id')
          .eq('workout_id', session.workoutId);

        if (existingWEs && existingWEs.length > 0) {
          const weIds = existingWEs.map(we => we.id);
          await supabase.from('sets').delete().in('workout_exercise_id', weIds);
          await supabase.from('workout_exercises').delete().eq('workout_id', session.workoutId);
        }

        await supabase
          .from('workouts')
          .update({ name: session.workoutName, status: 'completed', completed_at: completedAt })
          .eq('id', session.workoutId);

        workoutId = session.workoutId;
      } else {
        const { data: workout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: authSession.user.id,
            workout_date: session.date,
            category_id: session.categoryId || null,
            name: session.workoutName,
            status: 'completed',
            completed_at: completedAt,
          })
          .select('id')
          .single();

        if (workoutError) throw workoutError;
        if (!workout) throw new Error('Failed to create workout');
        workoutId = workout.id;
      }

      const exercisesToLog = session.exercises.filter(exerciseHasData);

      const weResults = await Promise.all(
        exercisesToLog.map(ex =>
          supabase
            .from('workout_exercises')
            .insert({
              workout_id: workoutId,
              exercise_id: ex.exerciseId,
              equipment: ex.equipment,
              sort_order: ex.sort_order,
            })
            .select('id')
            .single()
        )
      );

      const setInserts: Promise<any>[] = [];
      exercisesToLog.forEach((ex, i) => {
        const weId = weResults[i]?.data?.id;
        if (!weId) return;
        const setsToLog = skipIncomplete
          ? ex.sets.filter(s => s.is_completed && setHasValidData(ex, s))
          : ex.sets.filter(s => setHasValidData(ex, s));
        setsToLog.forEach(s => {
          setInserts.push(
            supabase.from('sets').insert({
              workout_exercise_id: weId,
              set_number: s.set_number,
              reps: s.reps === '' ? null : parseFloat(s.reps),
              weight: s.weight === '' ? null : parseFloat(s.weight),
              duration: s.duration ? mmssToSeconds(s.duration) : null,
              distance: s.distance === '' ? null : parseFloat(s.distance),
              distance_unit: s.distance_unit || null,
              is_completed: true,
              completed_at: completedAt,
            })
          );
        });
      });
      await Promise.all(setInserts);

      clearSession();
      navigation.reset({
        index: 0,
        routes: [{
          name: 'MainTabs',
          params: { screen: 'Home', params: { initialFocusDate: session.date } },
        }],
      });
    } catch (error: any) {
      setIsSubmitting(false);
      Alert.alert('Error', error.message);
    }
  };

  const proceedToIncompleteCheck = () => {
    if (!session) return;

    // Only count sets that have valid primary metric data but aren't marked complete.
    // Sets with missing primary metric are already handled (and will be dropped at save).
    const incompleteSets = session.exercises.flatMap(ex =>
      ex.sets.filter(s => setHasValidData(ex, s) && !s.is_completed)
    );

    if (incompleteSets.length > 0) {
      Alert.alert(
        'Incomplete Sets',
        `You have ${incompleteSets.length} set${incompleteSets.length > 1 ? 's' : ''} not marked complete. Mark all as complete?`,
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'No — Skip them', onPress: () => submitWorkout(true) },
          { text: isEditMode ? 'Yes — Save Update' : 'Yes — Mark complete', onPress: () => submitWorkout(false) },
        ]
      );
      return;
    }

    submitWorkout(false);
  };

  const handleCompleteWorkout = () => {
    if (!session) return;

    const hasAnySets = session.exercises.some(ex => ex.sets.length > 0);
    if (!hasAnySets) {
      Alert.alert('No Sets Logged', 'Add at least one set before completing.');
      return;
    }

    const exercisesWithMissingSets = session.exercises.filter(ex =>
      ex.sets.some(s => !setHasValidData(ex, s))
    );
    if (exercisesWithMissingSets.length > 0) {
      const names = exercisesWithMissingSets.map(ex => {
        const missingCount = ex.sets.filter(s => !setHasValidData(ex, s)).length;
        return `  • ${ex.exerciseName} (${missingCount} set${missingCount > 1 ? 's' : ''})`;
      }).join('\n');
      Alert.alert(
        'Missing Data',
        `The following exercises have sets missing primary metric data. Those sets will not be stored:\n\n${names}`,
        [
          { text: 'Edit', style: 'cancel' },
          { text: 'Remove & Continue', onPress: proceedToIncompleteCheck },
        ]
      );
      return;
    }

    proceedToIncompleteCheck();
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFF" style={{ flex: 1 }} />
      </View>
    );
  }

  const setsLoggedCount = (ex: SessionExercise) =>
    ex.sets.filter(s => s.is_completed).length;

  const renderDeleteAction = (ex: SessionExercise) => (
    <TouchableOpacity
      style={styles.swipeDeleteAction}
      onPress={() => removeExercise(ex.localId)}
    >
      <Ionicons name="trash-outline" size={20} color="#FFF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.workoutTitle} numberOfLines={1}>{session.workoutName}</Text>
          <TouchableOpacity onPress={openEditName} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil" size={18} color="#888" />
          </TouchableOpacity>
        </View>
        <View style={styles.exercisesRow}>
          <Text style={styles.exercisesLabel}>Exercises</Text>
          <Text style={styles.exercisesCount}>{session.exercises.length}</Text>
        </View>
      </View>

      {/* Exercise list */}
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 20 }}
        scrollEnabled={!draggingId}
      >
        {orderedExercises.map((ex, index) => {
          const logged = setsLoggedCount(ex);
          const total = ex.sets.length;
          const isDragging = draggingId === ex.localId;

          return (
            <Swipeable
              key={ex.localId}
              renderRightActions={() => renderDeleteAction(ex)}
              overshootRight={false}
              friction={2}
              enabled={!draggingId}
            >
              <TouchableOpacity
                style={[styles.exerciseRow, isDragging && styles.exerciseRowDragging]}
                onPress={() => !draggingId && navigation.navigate('ExerciseView', { exerciseLocalId: ex.localId })}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                  <Text style={styles.exerciseSub}>
                    {ex.equipment ? `${ex.muscleGroup} (${ex.equipment})` : ex.muscleGroup}
                  </Text>
                </View>
                <View style={styles.exerciseRight}>
                  {total > 0 && (
                    <Text style={[styles.setsCount, logged === total && styles.setsCountDone]}>
                      {logged}/{total}
                    </Text>
                  )}
                  <View
                    style={styles.dragHandle}
                    {...makeDragHandleProps(ex.localId, index)}
                  >
                    <Ionicons name="reorder-three" size={22} color={isDragging ? '#FFF' : '#555'} />
                  </View>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        })}

        {/* Add Exercise */}
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => navigation.navigate('ExerciseSearch', {
            categoryId: session.categoryId || '',
            categoryName: session.workoutName,
            date: session.date,
            addToSession: true,
          })}
        >
          <Ionicons name="add" size={18} color="#888" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.completeBtn, isSubmitting && styles.completeBtnDisabled]}
          onPress={handleCompleteWorkout}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.completeBtnText}>{isEditMode ? 'Save Update' : 'Complete Workout'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>{isEditMode ? 'Cancel Update' : 'Cancel Workout'}</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Name Modal */}
      <Modal visible={isEditNameVisible} transparent animationType="fade" onRequestClose={() => setIsEditNameVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setIsEditNameVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Workout</Text>
            <TextInput
              style={styles.modalInput}
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
              selectTextOnFocus
              placeholder="Workout name"
              placeholderTextColor="#999"
              returnKeyType="done"
              onSubmitEditing={saveEditName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsEditNameVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveEditName}>
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
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  workoutTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    marginRight: 12,
  },
  exercisesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exercisesLabel: { fontSize: 14, color: '#888' },
  exercisesCount: { fontSize: 14, color: '#888' },
  list: { flex: 1, paddingTop: 8 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#242424',
    borderRadius: 14,
    padding: 18,
    height: ITEM_HEIGHT - 8, // account for marginVertical
  },
  exerciseRowDragging: {
    backgroundColor: '#333333',
    opacity: 0.9,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 3 },
  exerciseSub: { fontSize: 13, color: '#888' },
  exerciseRight: { flexDirection: 'row', alignItems: 'center' },
  setsCount: { fontSize: 13, color: '#888', marginRight: 8 },
  setsCountDone: { color: '#4CAF50' },
  dragHandle: { padding: 4 },
  swipeDeleteAction: {
    backgroundColor: '#CC3333',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginVertical: 4,
    marginRight: 16,
    borderRadius: 14,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 14,
    backgroundColor: '#242424',
    borderRadius: 14,
    gap: 6,
  },
  addExerciseText: { color: '#888', fontSize: 15, fontWeight: '500' },
  footer: {
    backgroundColor: '#F0F0F0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  completeBtn: {
    backgroundColor: '#111111',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  completeBtnDisabled: { opacity: 0.5 },
  completeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 4 },
  cancelBtnText: { color: '#CC3333', fontSize: 15, fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: { backgroundColor: '#2A2A2A', borderRadius: 20, padding: 24, width: '100%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFF',
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
  modalCancelText: { fontSize: 15, color: '#888', fontWeight: '500' },
  modalSaveBtn: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  modalSaveText: { fontSize: 15, color: '#1B1B1B', fontWeight: '700' },
});
