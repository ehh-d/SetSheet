// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { ParsedTemplate } from '../utils/templateParser';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type TemplatePreviewScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TemplatePreview'
>;
type TemplatePreviewScreenRouteProp = RouteProp<RootStackParamList, 'TemplatePreview'>;

export default function TemplatePreviewScreen() {
  const navigation = useNavigation<TemplatePreviewScreenNavigationProp>();
  const route = useRoute<TemplatePreviewScreenRouteProp>();
  const { parsedTemplate, date } = route.params;
  const { session } = useAuth();

  const [loading, setLoading] = useState(false);
  const [exerciseData, setExerciseData] = useState<any>({});

  useEffect(() => {
    loadExerciseData();
  }, []);

  const loadExerciseData = async () => {
    const exerciseNames = parsedTemplate.exercises.map((ex: any) => ex.name);

    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .in('name', exerciseNames);

    const dataMap: any = {};
    exercises?.forEach((ex: any) => {
      dataMap[ex.name] = ex;
    });
    setExerciseData(dataMap);
  };

  const handleStartWorkout = async () => {
    setLoading(true);
    try {
      // 1. Find or create category
      const categoryName = parsedTemplate.category;
      let categoryId: string | null;

      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', categoryName)
        .maybeSingle();

      categoryId = existingCategory?.id ?? null;

      // 2. Create workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: session?.user.id,
          category_id: categoryId,
          workout_date: date,
          name: categoryName,
          status: 'active',
        })
        .select('id')
        .single();

      if (workoutError) throw workoutError;
      if (!workout) throw new Error('Failed to create workout');

      // 3. Create a default stage (required for FK constraints)
      const { data: workoutStage, error: stageError } = await supabase
        .from('workout_stages')
        .insert({
          workout_id: workout.id,
          name: 'General Workout',
          sort_order: 0,
        })
        .select('id')
        .single();

      if (stageError) throw stageError;
      if (!workoutStage) throw new Error('Failed to create workout stage');

      // 4. Insert exercises
      for (let i = 0; i < parsedTemplate.exercises.length; i++) {
        const exercise = parsedTemplate.exercises[i];
        const exerciseInfo = exerciseData[exercise.name];
        const availableEquipment: string[] = exerciseInfo?.equipment ?? [];

        // Match by equipment name if specified, otherwise use first available
        const resolvedEquipment = exercise.equipment
          ? availableEquipment.find((eq: string) => eq.toLowerCase() === exercise.equipment.toLowerCase())
            ?? availableEquipment[0]
          : availableEquipment[0];

        if (!exerciseInfo) {
          console.warn(`No exercise found for ${exercise.name}`);
          continue;
        }

        await supabase.from('workout_exercises').insert({
          workout_id: workout.id,
          stage_id: workoutStage.id,
          exercise_id: exerciseInfo.id,
          equipment: resolvedEquipment ?? null,
          sort_order: i,
          proposed_sets: exercise.sets,
          proposed_reps_min: exercise.repsMin,
          proposed_reps_max: exercise.repsMax,
        });
      }

      // 5. Navigate to active workout
      navigation.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          { name: 'ActiveWorkout', params: { workoutId: workout.id } },
        ],
      });
    } catch (error) {
      console.error('Error creating workout from template:', error);
      Alert.alert('Error', 'Failed to create workout from template');
    } finally {
      setLoading(false);
    }
  };

  const totalSets = parsedTemplate.exercises.reduce(
    (sum: number, ex: any) => sum + ex.sets,
    0
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Template Preview</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.categoryCard}>
          <Text style={styles.categoryName}>{parsedTemplate.category}</Text>
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{parsedTemplate.exercises.length}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalSets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
          </View>
        </View>

        <View style={styles.exerciseList}>
          {parsedTemplate.exercises.map((exercise: any, index: number) => {
            const availableEquipment: string[] = exerciseData[exercise.name]?.equipment ?? [];
            const equipment = exercise.equipment
              ? availableEquipment.find((eq: string) => eq.toLowerCase() === exercise.equipment.toLowerCase())
                ?? availableEquipment[0]
              : availableEquipment[0];
            return (
              <View key={index} style={styles.exerciseRow}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {equipment && <Text style={styles.equipment}>{equipment}</Text>}
                </View>
                <Text style={styles.sets}>
                  {exercise.sets}×{exercise.repsMin}
                  {exercise.repsMax ? `-${exercise.repsMax}` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, loading && styles.startButtonDisabled]}
          onPress={handleStartWorkout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.startButtonText}>Start Workout</Text>
          )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backText: {
    color: '#888888',
    fontSize: 18,
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  categoryCard: {
    backgroundColor: '#252525',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A9EFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  exerciseList: {
    backgroundColor: '#252525',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  equipment: {
    fontSize: 13,
    color: '#888888',
  },
  sets: {
    fontSize: 16,
    color: '#4A9EFF',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  startButton: {
    backgroundColor: '#4A9EFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
