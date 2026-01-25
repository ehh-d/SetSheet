import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Workout } from '../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type ViewMode = 'week' | 'month' | 'list';

export default function HomeScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const { session, signOut } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadWorkouts();
  }, [selectedDate, viewMode]);

  const loadWorkouts = async () => {
    if (!session?.user) return;

    let startDate: string;
    let endDate: string;

    if (viewMode === 'week') {
      startDate = format(weekDays[0], 'yyyy-MM-dd');
      endDate = format(weekDays[6], 'yyyy-MM-dd');
    } else if (viewMode === 'month') {
      // Load 3 months of data for the calendar
      const prevMonth = subMonths(selectedDate, 1);
      const nextMonth = addMonths(selectedDate, 1);
      startDate = format(startOfMonth(prevMonth), 'yyyy-MM-dd');
      endDate = format(endOfMonth(nextMonth), 'yyyy-MM-dd');
    } else {
      // List view - load last 3 months
      const threeMonthsAgo = subMonths(new Date(), 3);
      startDate = format(threeMonthsAgo, 'yyyy-MM-dd');
      endDate = format(new Date(), 'yyyy-MM-dd');
    }

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

  const renderMonthView = () => {
    const monthsToShow = [subMonths(selectedDate, 1), selectedDate, addMonths(selectedDate, 1)];

    return (
      <ScrollView style={styles.monthScrollContainer}>
        {monthsToShow.map((monthDate, monthIndex) => {
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const firstDayOfWeek = getDay(monthStart);

          // Add empty cells for days before the first day of the month
          const emptyCells = Array(firstDayOfWeek).fill(null);
          const allCells = [...emptyCells, ...daysInMonth];

          return (
            <View key={monthIndex} style={styles.monthContainer}>
              <Text style={styles.monthLabel}>{format(monthDate, 'MMMM yyyy')}</Text>
              <View style={styles.monthGrid}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <View key={day} style={styles.monthDayHeader}>
                    <Text style={styles.monthDayHeaderText}>{day}</Text>
                  </View>
                ))}
                {allCells.map((day, index) => {
                  if (!day) {
                    return <View key={`empty-${index}`} style={styles.monthDayCell} />;
                  }

                  const isSelected = isSameDay(day, selectedDate);
                  const hasWorkout = hasCompletedWorkout(day);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.monthDayCell, isSelected && styles.monthDayCellSelected]}
                      onPress={() => {
                        setSelectedDate(day);
                        setViewMode('week');
                      }}
                    >
                      <Text style={[styles.monthDayText, isSelected && styles.monthDayTextSelected]}>
                        {format(day, 'd')}
                      </Text>
                      {hasWorkout && <View style={styles.monthWorkoutDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderListView = () => {
    const groupedWorkouts: { [key: string]: Workout[] } = {};

    workouts.forEach((workout) => {
      const monthKey = format(new Date(workout.workout_date), 'MMMM yyyy');
      if (!groupedWorkouts[monthKey]) {
        groupedWorkouts[monthKey] = [];
      }
      groupedWorkouts[monthKey].push(workout);
    });

    return (
      <ScrollView style={styles.listContainer}>
        {Object.entries(groupedWorkouts).map(([month, monthWorkouts]) => (
          <View key={month}>
            <Text style={styles.listMonthHeader}>{month}</Text>
            {monthWorkouts.map((workout) => {
              const workoutDate = new Date(workout.workout_date);
              const dayOfMonth = format(workoutDate, 'd');
              const ordinalSuffix =
                dayOfMonth.endsWith('1') && dayOfMonth !== '11' ? 'st' :
                dayOfMonth.endsWith('2') && dayOfMonth !== '12' ? 'nd' :
                dayOfMonth.endsWith('3') && dayOfMonth !== '13' ? 'rd' : 'th';

              return (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.listItem}
                  onPress={() => {
                    if (workout.status === 'completed') {
                      navigation.navigate('WorkoutSummary', { workoutId: workout.id });
                    } else {
                      navigation.navigate('ActiveWorkout', { workoutId: workout.id });
                    }
                  }}
                >
                  <View style={styles.listItemLeft}>
                    <Text style={styles.listItemDate}>
                      {dayOfMonth}
                      <Text style={styles.listItemOrdinal}>{ordinalSuffix}</Text>
                    </Text>
                  </View>
                  <View style={styles.listItemRight}>
                    <Text style={styles.listItemTitle}>
                      {workout.name || 'Workout'}
                    </Text>
                    {workout.status === 'completed' && (
                      <View style={styles.listItemDot} />
                    )}
                  </View>
                  <Text style={styles.listItemChevron}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {viewMode === 'month' ? format(selectedDate, 'MMMM') : viewMode === 'week' ? format(selectedDate, 'MMMM') : 'History'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeToggle}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.viewModeText, viewMode === 'week' && styles.viewModeTextActive]}>—</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.viewModeText, viewMode === 'month' && styles.viewModeTextActive]}>▦</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Week View */}
      {viewMode === 'week' && (
        <View style={styles.weekContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {weekDays.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              const hasWorkout = hasCompletedWorkout(day);

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                    {format(day, 'EEE')}
                  </Text>
                  <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                    {format(day, 'd')}
                  </Text>
                  {hasWorkout && <View style={styles.workoutDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Month View */}
      {viewMode === 'month' && renderMonthView()}

      {/* List View */}
      {viewMode === 'list' && renderListView()}

      {/* Content Area - Only in Week View */}
      {viewMode === 'week' && (
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : selectedWorkout ? (
            <View style={styles.workoutSummary}>
              <Text style={styles.workoutName}>
                {selectedWorkout.name || 'Workout Completed'}
              </Text>
              <Text style={styles.workoutDate}>
                {format(selectedDate, 'MMMM d, yyyy')}
              </Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation.navigate('WorkoutSummary', {
                  workoutId: selectedWorkout.id,
                })}
              >
                <Text style={styles.viewButtonText}>View Workout</Text>
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
      )}

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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutText: {
    color: '#888888',
    fontSize: 14,
  },
  viewModeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  viewModeButton: {
    padding: 8,
  },
  viewModeButtonActive: {
    opacity: 1,
  },
  viewModeText: {
    fontSize: 20,
    color: '#888888',
  },
  viewModeTextActive: {
    color: '#FFFFFF',
  },
  weekContainer: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  dayCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    minWidth: 60,
  },
  dayCardSelected: {
    backgroundColor: '#FFFFFF',
  },
  dayName: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: '#1A1A1A',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dayNumberSelected: {
    color: '#1A1A1A',
  },
  workoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#33CC33',
    marginTop: 4,
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
  // Month View Styles
  monthScrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  monthContainer: {
    marginBottom: 30,
  },
  monthLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthDayHeader: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthDayHeaderText: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '600',
  },
  monthDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  monthDayCellSelected: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  monthDayText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  monthDayTextSelected: {
    color: '#1A1A1A',
    fontWeight: 'bold',
  },
  monthWorkoutDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#33CC33',
  },
  // List View Styles
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listMonthHeader: {
    fontSize: 14,
    color: '#888888',
    marginTop: 20,
    marginBottom: 12,
    marginLeft: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  listItemLeft: {
    marginRight: 16,
  },
  listItemDate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listItemOrdinal: {
    fontSize: 12,
    color: '#888888',
  },
  listItemRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  listItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#33CC33',
    marginLeft: 8,
  },
  listItemChevron: {
    fontSize: 24,
    color: '#888888',
    marginLeft: 12,
  },
});
