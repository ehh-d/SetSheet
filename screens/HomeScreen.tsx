import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, subDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Workout } from '../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type DrawerState = 'collapsed' | 'expanded';

export default function HomeScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerState, setDrawerState] = useState<DrawerState>('collapsed');
  const { session, signOut } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // Drawer animation
  const [viewportHeight, setViewportHeight] = useState(800); // Will be set dynamically
  const drawerHeight = useRef(new Animated.Value(120)).current;

  const COLLAPSED_HEIGHT = 120; // 1 day + controls
  const EXPANDED_HEIGHT = 600; // Full list

  // Generate weeks (each week is an array of 7 days)
  const generateWeeks = (numWeeks: number = 8) => {
    const weeks = [];
    const today = new Date();
    const startDate = startOfWeek(subDays(today, numWeeks * 7), { weekStartsOn: 0 });

    for (let i = 0; i < numWeeks * 2 + 1; i++) {
      const weekStart = addDays(startDate, i * 7);
      const week = Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex));
      weeks.push(week);
    }
    return weeks;
  };

  const [currentWeekIndex, setCurrentWeekIndex] = useState(8); // Start at middle week (today)
  const allWeeks = generateWeeks(8);

  useEffect(() => {
    loadWorkouts();
  }, [selectedDate, drawerState]);

  const loadWorkouts = async () => {
    if (!session?.user) return;

    // Load last 3 months for list view
    const threeMonthsAgo = subMonths(new Date(), 3);
    const startDate = format(threeMonthsAgo, 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('workout_date', startDate)
      .lte('workout_date', endDate)
      .order('workout_date', { ascending: false });

    if (!error && data) {
      setWorkouts(data);
    }
    setLoading(false);
  };

  const getWorkoutForDate = (date: Date) => {
    return workouts.find(w => isSameDay(new Date(w.workout_date), date));
  };

  const hasCompletedWorkout = (date: Date) => {
    const workout = getWorkoutForDate(date);
    return workout?.status === 'completed';
  };

  const hasWorkout = (date: Date) => {
    return !!getWorkoutForDate(date);
  };

  const selectedWorkout = getWorkoutForDate(selectedDate);

  const handleStartSheet = () => {
    navigation.navigate('CategorySelection', {
      date: format(selectedDate, 'yyyy-MM-dd'),
    });
  };

  const handleUploadTemplate = () => {
    navigation.navigate('UploadTemplate', {
      date: format(selectedDate, 'yyyy-MM-dd'),
    });
  };

  const handleExerciseLibrary = () => {
    navigation.navigate('ExerciseLibrary');
  };

  // Pan responder for drawer drag
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down (positive dy)
        if (gestureState.dy > 0) {
          const currentHeight = drawerState === 'collapsed' ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
          const newHeight = currentHeight + gestureState.dy;
          const maxHeight = EXPANDED_HEIGHT;

          drawerHeight.setValue(Math.min(newHeight, maxHeight));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Determine next state based on drag distance
        if (gestureState.dy > 50) {
          // Dragged down enough to toggle
          toggleDrawer();
        } else {
          // Snap back to current state
          animateToState(drawerState);
        }
      },
    })
  ).current;

  const animateToState = (state: DrawerState) => {
    const targetHeight = state === 'collapsed' ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;

    Animated.spring(drawerHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const toggleDrawer = () => {
    const newState = drawerState === 'collapsed' ? 'expanded' : 'collapsed';
    setDrawerState(newState);
    animateToState(newState);
  };

  // Render list mode (each day is a full row)
  const renderListView = () => {
    // Get all days from weeks up to current
    const weeksToShow = allWeeks.slice(0, currentWeekIndex + 1);
    const allDays = weeksToShow.flat();

    // Show different number of days based on drawer state
    let daysToShow: Date[] = [];

    if (drawerState === 'collapsed') {
      // Show only most recent day (today)
      daysToShow = [allDays[allDays.length - 1]];
    } else {
      // Show all days
      daysToShow = allDays;
    }

    const isScrollable = drawerState === 'expanded';

    return (
      <View style={styles.listContainer}>
        <ScrollView
          scrollEnabled={isScrollable}
          showsVerticalScrollIndicator={isScrollable}
          contentContainerStyle={[
            styles.listContent,
            !isScrollable && { flexGrow: 1, justifyContent: 'flex-end' }
          ]}
        >
          {daysToShow.map((day, index) => {
          const workout = getWorkoutForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <TouchableOpacity
              key={index}
              style={styles.listDayRow}
              onPress={() => {
                if (workout) {
                  if (workout.status === 'completed') {
                    navigation.navigate('WorkoutSummary', { workoutId: workout.id });
                  } else {
                    navigation.navigate('ActiveWorkout', { workoutId: workout.id });
                  }
                } else {
                  setSelectedDate(day);
                }
              }}
            >
              <View style={styles.listDayLeft}>
                <Text style={styles.listDayName}>{format(day, 'EEE')}</Text>
                <Text style={styles.listDayDate}>{format(day, 'MMM d')}</Text>
                {isToday && <Text style={styles.listTodayBadge}>Today</Text>}
              </View>
              <View style={styles.listDayRight}>
                {workout ? (
                  <>
                    <Text style={styles.listWorkoutName}>
                      {workout.name || 'Workout'}
                    </Text>
                    {workout.status === 'completed' && (
                      <View style={styles.listWorkoutDot} />
                    )}
                  </>
                ) : (
                  <Text style={styles.listNoWorkout}>No workout</Text>
                )}
              </View>
              <Text style={styles.listChevron}>›</Text>
            </TouchableOpacity>
          );
        })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sliding Drawer - List View */}
      <View style={styles.drawerWrapper}>
        <Animated.View
          style={[styles.drawerContainer, { height: drawerHeight }]}
          {...panResponder.panHandlers}
        >
          {/* List Content */}
          <View style={styles.drawerContent}>
            {renderListView()}
          </View>

          {/* Pull Handle - Fixed at bottom */}
          <View style={styles.drawerControls}>
            <View style={styles.pullHandle} />
          </View>
        </Animated.View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : selectedWorkout ? (
          <View style={styles.workoutSummary}>
            <Text style={styles.workoutName}>
              {selectedWorkout.name || (selectedWorkout.status === 'completed' ? 'Workout Completed' : 'Workout in Progress')}
            </Text>
            <Text style={styles.workoutDate}>
              {format(selectedDate, 'MMMM d, yyyy')}
            </Text>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => {
                if (selectedWorkout.status === 'completed') {
                  navigation.navigate('WorkoutSummary', { workoutId: selectedWorkout.id });
                } else {
                  navigation.navigate('ActiveWorkout', { workoutId: selectedWorkout.id });
                }
              }}
            >
              <Text style={styles.viewButtonText}>
                {selectedWorkout.status === 'completed' ? 'View Workout' : 'Continue Workout'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noWorkout}>
            <Text style={styles.noWorkoutText}>No sheet started</Text>
            <TouchableOpacity style={styles.startButton} onPress={handleStartSheet}>
              <Text style={styles.startButtonText}>Start a Sheet</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* FAB Stack */}
      <View style={styles.fabStack}>
        <TouchableOpacity style={styles.fab} onPress={handleExerciseLibrary}>
          <Text style={styles.fabText}>📚</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={handleStartSheet}>
          <Text style={styles.fabText}>➕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={handleUploadTemplate}>
          <Text style={styles.fabText}>📤</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutText: {
    color: '#888888',
    fontSize: 14,
  },
  // Drawer Styles
  drawerWrapper: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    padding: 8,
    zIndex: 10,
  },
  drawerContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  drawerContent: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  drawerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  pullHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444444',
    position: 'absolute',
    left: '50%',
    marginLeft: -20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noWorkout: {
    alignItems: 'center',
  },
  noWorkoutText: {
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
  workoutSummary: {
    alignItems: 'center',
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  workoutDate: {
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
  fabStack: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 24,
  },
  // List View Styles
  listContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    flexGrow: 0,
  },
  listDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  listDayLeft: {
    marginRight: 16,
    minWidth: 80,
  },
  listDayName: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 2,
  },
  listDayDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listTodayBadge: {
    fontSize: 10,
    color: '#33CC33',
    marginTop: 2,
  },
  listDayRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listWorkoutName: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  listNoWorkout: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  listWorkoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#33CC33',
    marginLeft: 8,
  },
  listChevron: {
    fontSize: 24,
    color: '#888888',
    marginLeft: 12,
  },
});
