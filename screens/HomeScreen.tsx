import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { format, parseISO, isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Workout, WorkoutExerciseWithDetails, WorkoutStage } from '../types';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../types';
import { CalendarPanel, getCollapsedHeight } from '../components/CalendarPanel';
import { calculateVolume } from '../utils/calculations';
import { StatRow } from '../components/stats/StatRow';
import { ExerciseSummaryCard } from '../components/exercise/ExerciseSummaryCard';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface WorkoutWithDetails extends Workout {
  workout_stages?: WorkoutStage[];
  workout_exercises?: WorkoutExerciseWithDetails[];
}


export default function HomeScreen() {
  const route = useRoute<RouteProp<MainTabParamList, 'Home'>>();
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [focusDate, setFocusDate] = useState(() => {
    const dateStr = route.params?.initialFocusDate;
    return dateStr ? parseISO(dateStr) : new Date();
  });
  const [sheet, setSheet] = useState<WorkoutWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const collapsedHeight = getCollapsedHeight(insets.top);

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

    // For completed workouts, fetch full details
    if (workoutData.status === 'completed') {
      const { data: detailedData } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_stages (
            id,
            name,
            sort_order
          ),
          workout_exercises (
            id,
            exercise_id,
            equipment,
            sort_order,
            stage_id,
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
        .eq('id', workoutData.id)
        .single();

      if (detailedData) {
        setSheet(detailedData as WorkoutWithDetails);
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

  const isPastDate = !isSameDay(focusDate, new Date()) && focusDate < new Date();
  const isToday = isSameDay(focusDate, new Date());

  // Duplicate the current sheet's exercises onto today
  const handleDuplicateSheet = async () => {
    if (!session?.user || !sheet || !sheet.workout_exercises) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    try {
      // Check if a workout already exists today
      const { data: existing } = await supabase
        .from('workouts')
        .select('id, status')
        .eq('user_id', session.user.id)
        .eq('workout_date', todayStr)
        .maybeSingle();

      if (existing) {
        Alert.alert('Workout Exists', 'You already have a workout for today.');
        return;
      }

      // Create new workout
      const { data: newWorkout, error: workoutErr } = await supabase
        .from('workouts')
        .insert({
          user_id: session.user.id,
          workout_date: todayStr,
          name: sheet.name,
          category_id: sheet.category_id,
          status: 'active',
        })
        .select()
        .single();

      if (workoutErr || !newWorkout) throw workoutErr || new Error('Failed to create workout');

      // Recreate stages
      const stages = sheet.workout_stages || [];
      const stageIdMap: Record<string, string> = {};

      for (const stage of stages) {
        const { data: newStage, error: stageErr } = await supabase
          .from('workout_stages')
          .insert({
            workout_id: newWorkout.id,
            name: stage.name,
            sort_order: stage.sort_order,
          })
          .select()
          .single();

        if (stageErr || !newStage) throw stageErr || new Error('Failed to create stage');
        stageIdMap[stage.id] = newStage.id;
      }

      // Recreate exercises (no sets)
      const exerciseInserts = sheet.workout_exercises.map((ex) => ({
        workout_id: newWorkout.id,
        stage_id: ex.stage_id ? stageIdMap[ex.stage_id] : null,
        exercise_id: ex.exercise_id,
        equipment: ex.equipment,
        sort_order: ex.sort_order,
        proposed_sets: 3,
        proposed_reps_min: 8,
        proposed_reps_max: 12,
      }));

      const { error: exErr } = await supabase
        .from('workout_exercises')
        .insert(exerciseInserts);

      if (exErr) throw exErr;

      navigation.navigate('ActiveWorkout', { workoutId: newWorkout.id });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to duplicate sheet');
    }
  };

  const handleDeleteWorkout = async () => {
    if (!sheet) return;
    Alert.alert(
      'Delete Workout',
      'This will permanently remove this workout from your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const exerciseIds = sheet.workout_exercises?.map(ex => ex.id) ?? [];
              if (exerciseIds.length > 0) {
                await supabase.from('sets').delete().in('workout_exercise_id', exerciseIds);
                await supabase.from('workout_exercises').delete().eq('workout_id', sheet.id);
              }
              await supabase.from('workout_stages').delete().eq('workout_id', sheet.id);
              await supabase.from('workouts').delete().eq('id', sheet.id);
              setSheet(null);
              setCalendarRefreshKey(k => k + 1);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete workout');
            }
          },
        },
      ]
    );
  };

  const handleEditWorkout = async () => {
    if (!sheet) return;
    try {
      await supabase.from('workouts').update({ status: 'active' } as any).eq('id', sheet.id);
      navigation.navigate('ActiveWorkout', { workoutId: sheet.id });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reopen workout');
    }
  };

  // Render completed workout summary
  const renderCompletedWorkout = () => {
    if (!sheet || !sheet.workout_exercises) return null;

    const exercises = sheet.workout_exercises;

    // Calculate stats
    const totalExercises = exercises.length;
    const totalSets = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.is_completed).length,
      0
    );
    const totalReps = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.is_completed).reduce((s, set) => s + (set.reps || 0), 0),
      0
    );
    const totalVolume = exercises.reduce((sum, ex) => {
      const completedSets = ex.sets.filter(s => s.is_completed);
      const exerciseVolume = calculateVolume(
        completedSets.map(s => ({ reps: s.reps || 0, weight: s.weight || 0 }))
      );
      return sum + exerciseVolume;
    }, 0);

    const sortedExercises = [...exercises].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );

    const workoutDate = parseISO(sheet.workout_date);
    const dateBase = format(workoutDate, 'MMMM d');
    const daySuffix = format(workoutDate, 'do').replace(/\d+/, '');

    return (
      <ScrollView
        style={styles.completedWorkout}
        contentContainerStyle={[styles.completedWorkoutContent, { paddingTop: collapsedHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.summaryHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.workoutTitle}>{sheet.name || 'Workout'}</Text>
              {isToday && <Text style={styles.todayIndicator}>Today</Text>}
              <View style={styles.dateTitleGroup}>
                <Text style={styles.dateTitle}>{dateBase}</Text>
                <Text style={styles.dateSuffix}>{daySuffix}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleEditWorkout}>
                <Ionicons name="create-outline" size={22} color="#757575" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleDeleteWorkout}>
                <Ionicons name="trash-outline" size={22} color="#757575" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Workout Summary header */}
        <View style={styles.exercisesSummaryHeader}>
          <Text style={styles.exercisesSummaryTitle}>Workout Summary</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <StatRow label="Exercises" value={totalExercises} />
          <StatRow label="Total Sets" value={totalSets} />
          <StatRow label="Total Reps" value={totalReps} />
          <StatRow label="Total Volume" value={totalVolume.toLocaleString()} unit="lbs" />

          {sheet.notes && (
            <>
              <View style={styles.notesLabelRow}>
                <Text style={styles.notesLabel}>Workout Notes:</Text>
              </View>
              <Text style={styles.notesText}>{sheet.notes}</Text>
            </>
          )}
        </View>

        {/* Exercise List */}
        <View style={styles.exercisesSection}>
          {sortedExercises.map((exercise) => (
            <ExerciseSummaryCard key={exercise.id} exercise={exercise} />
          ))}
        </View>

        {/* Duplicate button — only for past completed workouts */}
        {isPastDate && (
          <View style={styles.duplicateSection}>
            <TouchableOpacity
              style={styles.duplicateButton}
              onPress={handleDuplicateSheet}
              activeOpacity={0.7}
            >
              <Text style={styles.duplicateButtonText}>Duplicate Sheet on Current Day</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Calendar Panel */}
      <CalendarPanel onDateSelect={handleDateSelect} focusDate={focusDate} refreshKey={calendarRefreshKey} />

      {/* Sheet View Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : sheet ? (
          sheet.status === 'completed' && sheet.workout_exercises ? (
            renderCompletedWorkout()
          ) : (
            // In-progress workout
            <View style={styles.sheetSummary}>
              <Text style={styles.sheetName}>
                {sheet.name || 'Workout in Progress'}
              </Text>
              {isToday && <Text style={styles.todayIndicator}>Today</Text>}
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
            {isToday && <Text style={styles.todayIndicator}>Today</Text>}
            <Text style={styles.noSheetDate}>
              {format(focusDate, 'MMMM d, yyyy')}
            </Text>
            <Text style={styles.noSheetText}>No workout</Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate('StartWorkout', { date: format(focusDate, 'yyyy-MM-dd') })}
            >
              <Text style={styles.startButtonText}>
                {format(focusDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  ? 'Start Workout'
                  : 'Add a Workout'}
              </Text>
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
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  completedWorkoutContent: {
    paddingBottom: 40,
  },
  summaryHeader: {
    padding: 16,
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flex: 1,
    gap: 4,
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  dateTitleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
    lineHeight: 20,
  },
  dateSuffix: {
    fontSize: 10,
    fontWeight: '600',
    color: '#757575',
    marginTop: 2,
  },
  todayIndicator: {
    fontSize: 12,
    fontWeight: '500',
    color: '#757575',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
  },
  exercisesSummaryHeader: {
    padding: 16,
  },
  exercisesSummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  statsSection: {
    paddingHorizontal: 16,
  },
  notesLabelRow: {
    paddingBottom: 16,
    paddingLeft: 8,
  },
  notesLabel: {
    fontSize: 16,
    color: '#D5D5D5',
    lineHeight: 20,
  },
  notesText: {
    flex: 1,
    fontSize: 16,
    color: '#D5D5D5',
    lineHeight: 20,
  },
  exercisesSection: {
    paddingHorizontal: 8,
  },
  duplicateSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  duplicateButton: {
    borderWidth: 1,
    borderColor: '#505050',
    borderRadius: 7,
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duplicateButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#313131',
    lineHeight: 24,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});
