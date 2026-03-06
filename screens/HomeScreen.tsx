import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { format, parseISO, isSameDay, addDays, subDays } from 'date-fns';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { ExerciseSummaryCard } from '../components/exercise/ExerciseSummaryCard';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface WorkoutWithDetails extends Workout {
  workout_stages?: WorkoutStage[];
  workout_exercises?: WorkoutExerciseWithDetails[];
}


// Individual date page component
function DatePage({
  date,
  session,
  navigation,
  collapsedHeight,
  calendarRefreshKey,
  onCalendarRefresh,
}: {
  date: Date;
  session: any;
  navigation: any;
  collapsedHeight: number;
  calendarRefreshKey: number;
  onCalendarRefresh: () => void;
}) {
  const [sheet, setSheet] = useState<WorkoutWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const isPastDate = !isSameDay(date, new Date()) && date < new Date();
  const isToday = isSameDay(date, new Date());

  const loadSheet = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');

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

    if (workoutData.status === 'completed') {
      const { data: detailedData } = await supabase
        .from('workouts')
        .select(`
          *,
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
  }, [session?.user, date]);

  useFocusEffect(
    useCallback(() => {
      loadSheet();
    }, [loadSheet, calendarRefreshKey])
  );

  const handleDeleteWorkout = () => {
    if (!sheet) return;
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const ex of (sheet.workout_exercises || [])) {
                await supabase.from('sets').delete().eq('workout_exercise_id', ex.id);
              }
              await supabase.from('workout_exercises').delete().eq('workout_id', sheet.id);
              await supabase.from('workouts').delete().eq('id', sheet.id);
              setSheet(null);
              onCalendarRefresh();
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

  if (loading) {
    return (
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!sheet) {
    return (
      <View style={styles.noSheet}>
        {isToday && <Text style={styles.todayIndicator}>(Today)</Text>}
        <Text style={styles.noSheetDate}>
          {format(date, 'MMMM d, yyyy')}
        </Text>
        <Text style={styles.noSheetText}>No workout</Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('StartWorkout', { date: format(date, 'yyyy-MM-dd') })}
        >
          <Text style={styles.startButtonText}>
            {isToday ? 'Start Workout' : 'Add a Workout'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (sheet.status !== 'completed' || !sheet.workout_exercises) {
    return (
      <View style={styles.sheetSummary}>
        {isToday && <Text style={styles.todayIndicator}>(Today)</Text>}
        <Text style={styles.sheetName}>
          {sheet.name || 'Workout in Progress'}
        </Text>
        <Text style={styles.sheetDate}>
          {format(date, 'MMMM d, yyyy')}
        </Text>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate('ActiveWorkout', { workoutId: sheet.id })}
        >
          <Text style={styles.viewButtonText}>Continue Sheet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Completed workout
  const exercises = sheet.workout_exercises;
  const totalExercises = exercises.length;
  const totalSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.is_completed).length, 0
  );
  const totalReps = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.is_completed).reduce((s, set) => s + (set.reps || 0), 0), 0
  );
  const totalVolume = exercises.reduce((sum, ex) => {
    const completedSets = ex.sets.filter(s => s.is_completed);
    return sum + calculateVolume(completedSets.map(s => ({ reps: s.reps || 0, weight: s.weight || 0 })));
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
      <View style={styles.summaryHeader}>
        <View style={styles.dateTitleGroup}>
          <Text style={styles.dateTitle}>{dateBase}</Text>
          <Text style={styles.dateSuffix}>{daySuffix}</Text>
          {isToday && <Text style={styles.todayIndicator}> (Today)</Text>}
        </View>
        <View style={styles.headerTitleRow}>
          <Text style={styles.workoutTitle}>{sheet.name || 'Workout'}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEditWorkout}>
              <Ionicons name="create-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleDeleteWorkout}>
              <Ionicons name="trash-outline" size={22} color="#CC3333" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.exercisesSummaryHeader}>
        <Text style={styles.exercisesSummaryTitle}>Workout Summary</Text>
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statsColumns}>
          <View style={[styles.statColumn, styles.statColumnFirst]}>
            <Text style={styles.statColumnLabel}>Exercises</Text>
            <Text style={styles.statColumnValue}>{totalExercises}</Text>
          </View>
          <View style={styles.statColumn}>
            <Text style={styles.statColumnLabel}>Sets</Text>
            <Text style={styles.statColumnValue}>{totalSets}</Text>
          </View>
          <View style={styles.statColumn}>
            <Text style={styles.statColumnLabel}>Reps</Text>
            <Text style={styles.statColumnValue}>{totalReps}</Text>
          </View>
          <View style={[styles.statColumn, styles.statColumnLast]}>
            <Text style={styles.statColumnLabel}>Volume</Text>
            <Text style={styles.statColumnValue}>{totalVolume.toLocaleString()}</Text>
          </View>
        </View>

        {sheet.notes && (
          <>
            <View style={styles.notesLabelRow}>
              <Text style={styles.notesLabel}>Workout Notes:</Text>
            </View>
            <Text style={styles.notesText}>{sheet.notes}</Text>
          </>
        )}
      </View>

      <View style={styles.exercisesSection}>
        {sortedExercises.map((exercise) => (
          <ExerciseSummaryCard key={exercise.id} exercise={exercise} />
        ))}
      </View>

      {isPastDate && (
        <View style={styles.duplicateSection}>
          <TouchableOpacity
            style={styles.duplicateButton}
            onPress={async () => {
              if (!session?.user || !sheet.workout_exercises) return;
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              try {
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
                for (const ex of sheet.workout_exercises) {
                  const { data: newEx } = await supabase
                    .from('workout_exercises')
                    .insert({
                      workout_id: newWorkout.id,
                      exercise_id: ex.exercise_id,
                      equipment: ex.equipment,
                      sort_order: ex.sort_order,
                    })
                    .select()
                    .single();
                  if (newEx) {
                    const completedSets = ex.sets.filter(s => s.is_completed);
                    for (let i = 0; i < (completedSets.length || 1); i++) {
                      await supabase.from('sets').insert({
                        workout_exercise_id: newEx.id,
                        set_number: i + 1,
                        is_completed: false,
                      });
                    }
                  }
                }
                Alert.alert('Success', 'Workout duplicated to today!');
                onCalendarRefresh();
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to duplicate');
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.duplicateButtonText}>Duplicate Sheet on Current Day</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

export default function HomeScreen() {
  const route = useRoute<RouteProp<MainTabParamList, 'Home'>>();
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [focusDate, setFocusDate] = useState(() => {
    const dateStr = route.params?.initialFocusDate;
    return dateStr ? parseISO(dateStr) : new Date();
  });
  const { session } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const collapsedHeight = getCollapsedHeight(insets.top);

  const handleDateSelect = useCallback((date: Date) => {
    setFocusDate(date);
  }, []);

  const handleCalendarRefresh = useCallback(() => {
    setCalendarRefreshKey(k => k + 1);
  }, []);

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
  const translateX = useRef(new Animated.Value(0)).current;

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-20, 20])
      .failOffsetY([-10, 10])
      .onUpdate((e) => {
        // Dampen the drag to feel like resistance
        const damped = e.translationX * 0.4;
        translateX.setValue(damped);
      })
      .onEnd((e) => {
        const projected = e.translationX + e.velocityX * 0.15;
        if (projected < -SWIPE_THRESHOLD) {
          // Swipe left — next day
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setFocusDate(prev => addDays(prev, 1));
            translateX.setValue(0);
          });
        } else if (projected > SWIPE_THRESHOLD) {
          // Swipe right — previous day
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setFocusDate(prev => subDays(prev, 1));
            translateX.setValue(0);
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 20,
          }).start();
        }
      })
      .runOnJS(true),
    []
  );

  return (
    <View style={styles.container}>
      {/* Calendar Panel */}
      <CalendarPanel onDateSelect={handleDateSelect} focusDate={focusDate} refreshKey={calendarRefreshKey} />

      {/* Sheet View Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
          <DatePage
            date={focusDate}
            session={session}
            navigation={navigation}
            collapsedHeight={collapsedHeight}
            calendarRefreshKey={calendarRefreshKey}
            onCalendarRefresh={handleCalendarRefresh}
          />
        </Animated.View>
      </GestureDetector>
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
  },
  noSheet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
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
    flex: 1,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 6,
    paddingRight: 0,
  },
  exercisesSummaryHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  exercisesSummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  statsSection: {
    paddingHorizontal: 20,
  },
  statsColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statColumn: {
    flex: 1,
    alignItems: 'flex-start',
    borderRightWidth: 1,
    borderRightColor: '#2A2A2A',
    paddingLeft: 12,
  },
  statColumnLast: {
    borderRightWidth: 0,
  },
  statColumnFirst: {
    paddingLeft: 0,
  },
  statColumnValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 24,
    marginTop: 4,
  },
  statColumnLabel: {
    fontSize: 14,
    color: '#757575',
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
