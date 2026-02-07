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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { WorkoutExerciseWithDetails, WorkoutStage } from '../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { calculateVolume } from '../utils/calculations';
import { StatRow } from '../components/stats/StatRow';
import { StageHeader } from '../components/timeline/StageHeader';
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
  workout_stages: WorkoutStage[];
  workout_exercises: WorkoutExerciseWithDetails[];
}

// Group exercises by stage
interface StageGroup {
  stage: WorkoutStage | null;
  exercises: WorkoutExerciseWithDetails[];
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
        workout_stages (
          id,
          name,
          sort_order
        ),
        workout_exercises (
          id,
          exercise_variation_id,
          sort_order,
          stage_id,
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

  // Group exercises by stage
  const stageGroups: StageGroup[] = [];
  const sortedStages = [...(workout.workout_stages || [])].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  // Create groups for each stage
  sortedStages.forEach(stage => {
    const stageExercises = workout.workout_exercises
      .filter(ex => ex.stage_id === stage.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    if (stageExercises.length > 0) {
      stageGroups.push({ stage, exercises: stageExercises });
    }
  });

  // Add exercises without a stage
  const unstaged = workout.workout_exercises
    .filter(ex => !ex.stage_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (unstaged.length > 0) {
    stageGroups.push({ stage: null, exercises: unstaged });
  }

  // Format date for header
  const formattedDate = format(parseISO(workout.workout_date), 'MMMM do');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.dateTitleRow}>
            <Text style={styles.dateTitle}>{formattedDate}</Text>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="pencil" size={16} color="#757575" />
            </TouchableOpacity>
          </View>
          <Text style={styles.workoutSubtitle}>{workout.name || 'Workout'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Exercises</Text>
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
            <View style={styles.notesTitleRow}>
              <Text style={styles.notesLabel}>Workout Notes</Text>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#757575" />
              </TouchableOpacity>
            </View>
            <Text style={styles.notesText}>{workout.notes}</Text>
          </View>
        )}

        {/* Exercise List by Stage */}
        <View style={styles.exercisesSection}>
          {stageGroups.map((group, groupIndex) => (
            <View key={group.stage?.id || 'unstaged'}>
              {/* Stage Header */}
              {group.stage && (
                <StageHeader
                  title={group.stage.name || 'Stage'}
                />
              )}

              {/* Exercise Cards */}
              {group.exercises.map((exercise) => (
                <ExerciseSummaryCard
                  key={exercise.id}
                  exercise={exercise}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  workoutSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  statsCard: {
    backgroundColor: '#1B1B1B',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  notesSection: {
    marginBottom: 24,
  },
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D5D5D5',
  },
  notesText: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20,
  },
  exercisesSection: {
    marginTop: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
