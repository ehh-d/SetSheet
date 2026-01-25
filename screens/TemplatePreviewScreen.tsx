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
    // Get all exercise names from the template
    const exerciseNames = parsedTemplate.stages.flatMap((stage: any) =>
      stage.exercises.map((ex: any) => ex.name)
    );

    // Fetch exercise and variation data
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*, exercise_variations(*)')
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
      let categoryId: string;

      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const { data: newCategory } = await supabase
          .from('categories')
          .insert({ name: categoryName, description: `Created from template` })
          .select('id')
          .single();
        categoryId = newCategory.id;
      }

      // 2. Create workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: session?.user.id,
          category_id: categoryId,
          workout_date: date,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (workoutError) throw workoutError;

      // 3. Create stages and exercises
      let stageOrderIndex = 0;
      for (const stage of parsedTemplate.stages) {
        // Create stage
        const { data: workoutStage } = await supabase
          .from('workout_stages')
          .insert({
            workout_id: workout.id,
            name: stage.name,
            order_index: stageOrderIndex++,
          })
          .select('id')
          .single();

        // Create exercises for this stage
        let exerciseOrderIndex = 0;
        for (const exercise of stage.exercises) {
          const exerciseInfo = exerciseData[exercise.name];

          // Use the first available variation (or default to first)
          const variationId = exerciseInfo?.exercise_variations?.[0]?.id;

          if (!variationId) {
            console.warn(`No variation found for ${exercise.name}`);
            continue;
          }

          // Create workout exercise
          const { data: workoutExercise } = await supabase
            .from('workout_exercises')
            .insert({
              workout_id: workout.id,
              stage_id: workoutStage.id,
              exercise_variation_id: variationId,
              order_index: exerciseOrderIndex++,
              target_sets: exercise.sets,
              target_reps_min: exercise.repsMin,
              target_reps_max: exercise.repsMax,
            })
            .select('id')
            .single();

          // Create placeholder sets
          for (let i = 0; i < exercise.sets; i++) {
            await supabase.from('sets').insert({
              workout_exercise_id: workoutExercise.id,
              set_number: i + 1,
              reps: null,
              weight: null,
              completed: false,
            });
          }
        }
      }

      // 4. Navigate to active workout
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Home' },
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

  const totalExercises = parsedTemplate.stages.reduce(
    (sum: number, stage: any) => sum + stage.exercises.length,
    0
  );

  const totalSets = parsedTemplate.stages.reduce(
    (sum: number, stage: any) =>
      sum + stage.exercises.reduce((s: number, ex: any) => s + ex.sets, 0),
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
              <Text style={styles.statValue}>{parsedTemplate.stages.length}</Text>
              <Text style={styles.statLabel}>Stages</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalExercises}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalSets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
          </View>
        </View>

        {parsedTemplate.stages.map((stage: any, stageIndex: number) => (
          <View key={stageIndex} style={styles.stageCard}>
            <Text style={styles.stageName}>{stage.name}</Text>
            {stage.exercises.map((exercise: any, exIndex: number) => {
              const hasVariation = exerciseData[exercise.name];
              const equipment = hasVariation?.exercise_variations?.[0]?.equipment;

              return (
                <View key={exIndex} style={styles.exerciseRow}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {equipment && (
                      <Text style={styles.equipment}>{equipment}</Text>
                    )}
                  </View>
                  <Text style={styles.sets}>
                    {exercise.sets}×{exercise.repsMin}
                    {exercise.repsMax ? `-${exercise.repsMax}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
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
  stageCard: {
    backgroundColor: '#252525',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  stageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
