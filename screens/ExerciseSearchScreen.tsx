// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { ExerciseWithVariations } from '../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';

type ExerciseSearchNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ExerciseSearch'
>;
type ExerciseSearchRouteProp = RouteProp<RootStackParamList, 'ExerciseSearch'>;

interface SelectedExercise {
  variationId: string;
  exerciseName: string;
  equipment: string;
}

export default function ExerciseSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<ExerciseWithVariations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string>('All');

  const navigation = useNavigation<ExerciseSearchNavigationProp>();
  const route = useRoute<ExerciseSearchRouteProp>();
  const { session } = useAuth();

  const { categoryId, categoryName, date } = route.params;

  // Get unique muscle groups from exercises
  const muscleGroups = ['All', ...Array.from(new Set(exercises.map(ex => ex.muscle_group))).sort()];

  useEffect(() => {
    loadExercises();
  }, [categoryId]);

  const loadExercises = async () => {
    const { data, error } = await supabase
      .from('exercises')
      .select(`
        *,
        exercise_variations (*)
      `)
      .contains('category_ids', [categoryId])
      .order('name');

    if (!error && data) {
      setExercises(data as ExerciseWithVariations[]);
    }
    setLoading(false);
  };

  const getFilteredExercises = () => {
    let filtered = exercises;

    // Apply muscle group filter
    if (muscleGroupFilter !== 'All') {
      filtered = filtered.filter(ex => ex.muscle_group === muscleGroupFilter);
    }

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const toggleExpanded = (exerciseId: string) => {
    setExpandedExerciseId(expandedExerciseId === exerciseId ? null : exerciseId);
  };

  const handleAddExercise = (exercise: ExerciseWithVariations, variationId?: string) => {
    // If no variation specified, use the first one or let user choose
    const variation = variationId
      ? exercise.exercise_variations.find(v => v.id === variationId)
      : exercise.exercise_variations[0];

    if (!variation) return;

    // Check if this variation is already selected (prevent duplicates)
    if (selectedExercises.some(ex => ex.variationId === variation.id)) {
      return;
    }

    const newSelection: SelectedExercise = {
      variationId: variation.id,
      exerciseName: exercise.name,
      equipment: variation.equipment,
    };

    setSelectedExercises([...selectedExercises, newSelection]);
  };

  const handleRemoveExercise = (variationId: string) => {
    setSelectedExercises(selectedExercises.filter(ex => ex.variationId !== variationId));
  };

  const handleStartWorkout = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('No Exercises', 'Please select at least one exercise');
      return;
    }

    if (!session?.user) return;

    try {
      // Create workout (started_at will be set by database trigger or default)
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: session.user.id,
          workout_date: date,
          category_id: categoryId,
          name: categoryName,
          status: 'active',
        })
        .select()
        .single();

      if (workoutError) {
        console.error('Workout creation error:', workoutError);
        throw workoutError;
      }

      if (!workout) throw new Error('Workout creation failed');

      // Update started_at timestamp
      const { error: updateError } = await supabase
        .from('workouts')
        .update({ started_at: new Date().toISOString() })
        .eq('id', workout.id);

      if (updateError) {
        console.error('Error updating started_at:', updateError);
      }

      // Create default stage
      const { data: stage, error: stageError } = await supabase
        .from('workout_stages')
        .insert({
          workout_id: workout.id,
          name: 'General Workout',
          order_index: 0,
        })
        .select()
        .single();

      if (stageError) {
        console.error('Stage creation error:', stageError);
        throw stageError;
      }

      if (!stage) throw new Error('Stage creation failed');

      // Add exercises to workout
      const workoutExercises = selectedExercises.map((ex, index) => ({
        workout_id: workout.id,
        stage_id: stage.id,
        exercise_variation_id: ex.variationId,
        order_index: index,
        target_sets: 3,
        target_reps_min: 8,
        target_reps_max: 12,
      }));

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(workoutExercises);

      if (exercisesError) {
        console.error('Exercises creation error:', exercisesError);
        throw exercisesError;
      }

      // Navigate to active workout
      navigation.navigate('ActiveWorkout', { workoutId: workout.id });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const groupedExercises = getFilteredExercises().reduce((acc, exercise) => {
    const firstLetter = exercise.name[0].toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(exercise);
    return acc;
  }, {} as Record<string, ExerciseWithVariations[]>);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName}</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Muscle Group Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {muscleGroups.map((group) => (
            <TouchableOpacity
              key={group}
              style={[
                styles.filterChip,
                muscleGroupFilter === group && styles.filterChipActive,
              ]}
              onPress={() => setMuscleGroupFilter(group)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  muscleGroupFilter === group && styles.filterChipTextActive,
                ]}
              >
                {group}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Selected Exercises */}
      {selectedExercises.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>Selected ({selectedExercises.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedExercises.map((ex, index) => (
              <TouchableOpacity
                key={index}
                style={styles.selectedChip}
                onPress={() => handleRemoveExercise(ex.variationId)}
              >
                <Text style={styles.selectedChipText}>
                  {ex.exerciseName} ({ex.equipment})
                </Text>
                <Text style={styles.selectedChipRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Exercise List */}
      <ScrollView style={styles.exerciseList}>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
        ) : (
          Object.keys(groupedExercises)
            .sort()
            .map(letter => (
              <View key={letter}>
                <Text style={styles.sectionHeader}>{letter}</Text>
                {groupedExercises[letter].map(exercise => {
                  const isExpanded = expandedExerciseId === exercise.id;
                  const hasMultipleVariations = exercise.exercise_variations.length > 1;
                  const isSingleExerciseSelected = !hasMultipleVariations && selectedExercises.some(ex =>
                    exercise.exercise_variations.some(v => v.id === ex.variationId)
                  );

                  return (
                    <View key={exercise.id} style={[
                      styles.exerciseCard,
                      isSingleExerciseSelected && styles.exerciseCardSelected
                    ]}>
                      <TouchableOpacity
                        style={styles.exerciseMain}
                        onPress={() => toggleExpanded(exercise.id)}
                      >
                        <View style={styles.exerciseInfo}>
                          <Text style={[
                            styles.exerciseName,
                            isSingleExerciseSelected && styles.exerciseNameSelected
                          ]}>{exercise.name}</Text>
                          <Text style={[
                            styles.muscleGroup,
                            isSingleExerciseSelected && styles.muscleGroupSelected
                          ]}>{exercise.muscle_group}</Text>
                        </View>
                        {/* Only show +/X button for single-variation exercises */}
                        {!hasMultipleVariations && (
                          <TouchableOpacity
                            style={[
                              styles.addButton,
                              isSingleExerciseSelected && styles.removeButton
                            ]}
                            onPress={() => {
                              if (isSingleExerciseSelected) {
                                handleRemoveExercise(exercise.exercise_variations[0].id);
                              } else {
                                handleAddExercise(exercise);
                              }
                            }}
                          >
                            <Text style={[
                              styles.addButtonText,
                              isSingleExerciseSelected && styles.removeButtonText
                            ]}>
                              {isSingleExerciseSelected ? '×' : '+'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.variationsContainer}>
                          <Text style={styles.variationsTitle}>Equipment:</Text>
                          {exercise.exercise_variations.map(variation => {
                            const isVariationSelected = selectedExercises.some(ex => ex.variationId === variation.id);
                            return (
                              <TouchableOpacity
                                key={variation.id}
                                style={[
                                  styles.variationRow,
                                  isVariationSelected && styles.variationRowSelected
                                ]}
                                onPress={() => {
                                  if (isVariationSelected) {
                                    handleRemoveExercise(variation.id);
                                  } else {
                                    handleAddExercise(exercise, variation.id);
                                  }
                                }}
                              >
                                <Text style={[
                                  styles.variationText,
                                  isVariationSelected && styles.variationTextSelected
                                ]}>{variation.equipment}</Text>
                                <Text style={[
                                  styles.addButtonText,
                                  isVariationSelected && styles.removeButtonText
                                ]}>
                                  {isVariationSelected ? '×' : '+'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
        )}
      </ScrollView>

      {/* Start Workout Button */}
      {selectedExercises.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.startButton} onPress={handleStartWorkout}>
            <Text style={styles.startButtonText}>
              Start Workout ({selectedExercises.length} exercises)
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  backText: {
    color: '#888888',
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchContainer: {
    padding: 20,
    paddingTop: 0,
  },
  searchInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#888888',
  },
  filterChipTextActive: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  selectedContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  selectedTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedChipText: {
    color: '#1A1A1A',
    fontSize: 12,
    marginRight: 6,
  },
  selectedChipRemove: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseList: {
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#1A1A1A',
  },
  exerciseCard: {
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  exerciseCardSelected: {
    backgroundColor: '#FFFFFF',
  },
  exerciseMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  exerciseNameSelected: {
    color: '#1A1A1A',
  },
  muscleGroup: {
    fontSize: 12,
    color: '#888888',
  },
  muscleGroupSelected: {
    color: '#666666',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#1A1A1A',
  },
  addButtonText: {
    color: '#1A1A1A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  removeButtonText: {
    color: '#FFFFFF',
  },
  variationsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    padding: 16,
    paddingTop: 12,
  },
  variationsTitle: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
  },
  variationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  variationRowSelected: {
    backgroundColor: '#FFFFFF',
  },
  variationText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  variationTextSelected: {
    color: '#1A1A1A',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  startButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
