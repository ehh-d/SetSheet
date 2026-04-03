// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useWorkoutSession } from '../contexts/WorkoutSessionContext';
import { supabase } from '../lib/supabase';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'ExerciseView'>;
type RoutePropType = RouteProp<RootStackParamList, 'ExerciseView'>;

export default function ExerciseViewScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { exerciseLocalId } = route.params;
  const {
    session,
    addSet,
    updateSetField,
    toggleSetComplete,
    markAllSetsComplete,
    deleteSet,
    removeExercise,
    updateExerciseEquipment,
  } = useWorkoutSession();

  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);

  if (!session) return null;

  const exerciseIndex = session.exercises.findIndex(ex => ex.localId === exerciseLocalId);
  const exercise = session.exercises[exerciseIndex];

  if (!exercise) return null;

  const sortedSets = [...exercise.sets].sort((a, b) => a.set_number - b.set_number);
  const hasNextExercise = exerciseIndex < session.exercises.length - 1;
  const hasPrevExercise = exerciseIndex > 0;

  useEffect(() => {
    supabase
      .from('exercises')
      .select('equipment')
      .eq('id', exercise.exerciseId)
      .single()
      .then(({ data }) => {
        if (data?.equipment) setAvailableEquipment(data.equipment);
      });
  }, [exercise.exerciseId]);

  const handleNext = () => {
    if (!hasNextExercise) {
      navigation.navigate('WorkoutOverview', {
        date: session.date,
        workoutName: session.workoutName,
        categoryId: session.categoryId || '',
      });
      return;
    }
    const nextExercise = session.exercises[exerciseIndex + 1];
    navigation.replace('ExerciseView', { exerciseLocalId: nextExercise.localId });
  };

  const handleDeleteExercise = () => {
    Alert.alert('Remove Exercise', `Remove ${exercise.exerciseName} from this workout?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeExercise(exercise.localId);
          navigation.navigate('WorkoutOverview', {
            date: session.date,
            workoutName: session.workoutName,
            categoryId: session.categoryId || '',
          });
        },
      },
    ]);
  };

  const handleBlur = (set: any) => {
    // Auto-complete when both reps and weight are filled
    const currentSet = session.exercises
      .find(ex => ex.localId === exerciseLocalId)
      ?.sets.find(s => s.localId === set.localId);
    if (currentSet && currentSet.reps !== '' && currentSet.weight !== '' && !currentSet.is_completed) {
      toggleSetComplete(exercise.localId, set.localId);
    }
  };

  const handleFocus = (set: any) => {
    // Uncheck when editing a completed set
    if (set.is_completed) {
      toggleSetComplete(exercise.localId, set.localId);
    }
  };

  const renderDeleteAction = (localSetId: string) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => deleteSet(exercise.localId, localSetId)}
    >
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('WorkoutOverview', {
              date: session.date,
              workoutName: session.workoutName,
              categoryId: session.categoryId || '',
            })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerIcon}
          >
            <Ionicons name="close" size={22} color="#888" />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={handleDeleteExercise}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.headerIcon}
            >
              <Ionicons name="trash-outline" size={20} color="#CC3333" />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.headerIcon}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerTitles}>
          <Text style={styles.exerciseName} numberOfLines={1}>{exercise.exerciseName}</Text>
          <Text style={styles.exerciseSub}>{exercise.muscleGroup}</Text>
        </View>

        {/* Equipment selector */}
        {availableEquipment.length > 0 && (
          <View style={styles.equipmentContainer}>
            <TouchableOpacity
              style={[
                styles.equipmentSelector,
                equipmentModalVisible && styles.equipmentSelectorOpen,
              ]}
              onPress={() => setEquipmentModalVisible(!equipmentModalVisible)}
            >
              <Text style={styles.equipmentText}>{exercise.equipment || 'Select equipment'}</Text>
              <Ionicons name={equipmentModalVisible ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
            </TouchableOpacity>
            {equipmentModalVisible && (
              <View style={styles.equipmentDropdown}>
                {availableEquipment.map((eq, i) => (
                  <TouchableOpacity
                    key={eq}
                    style={[
                      styles.equipmentOption,
                      i === availableEquipment.length - 1 && styles.equipmentOptionLast,
                    ]}
                    onPress={() => {
                      updateExerciseEquipment(exercise.localId, eq);
                      setEquipmentModalVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.equipmentOptionText,
                      eq === exercise.equipment && styles.equipmentOptionTextSelected,
                    ]}>
                      {eq}
                    </Text>
                    {eq === exercise.equipment && (
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Previous best */}
        {exercise.previousBest?.weight != null && (
          <Text style={styles.previousText}>
            Previous best: {exercise.previousBest.reps} reps × {exercise.previousBest.weight} lbs
          </Text>
        )}
      </View>

      {/* Sets */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.setNumCol]}>Set</Text>
          <Text style={[styles.tableHeaderText, styles.inputCol]}>Reps</Text>
          <Text style={[styles.tableHeaderText, styles.inputCol]}>Lbs</Text>
          <TouchableOpacity
            style={styles.checkCol}
            onPress={() => markAllSetsComplete(exercise.localId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.tableHeaderCheck}>✓</Text>
          </TouchableOpacity>
        </View>

        {sortedSets.map((set) => (
          <Swipeable
            key={set.localId}
            renderRightActions={() => renderDeleteAction(set.localId)}
            overshootRight={false}
            friction={2}
          >
            <View style={styles.setRow}>
              <Text style={[styles.setNumber, styles.setNumCol]}>{set.set_number}</Text>

              <TextInput
                style={[styles.input, styles.inputCol]}
                value={set.reps}
                onChangeText={val => updateSetField(exercise.localId, set.localId, 'reps', val)}
                onFocus={() => handleFocus(set)}
                onBlur={() => handleBlur(set)}
                keyboardType="numeric"
                placeholder="-"
                placeholderTextColor="#555"
                returnKeyType="next"
              />

              <TextInput
                style={[styles.input, styles.inputCol]}
                value={set.weight}
                onChangeText={val => updateSetField(exercise.localId, set.localId, 'weight', val)}
                onFocus={() => handleFocus(set)}
                onBlur={() => handleBlur(set)}
                keyboardType="numeric"
                placeholder="-"
                placeholderTextColor="#555"
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[styles.checkCol, styles.checkBtn]}
                onPress={() => toggleSetComplete(exercise.localId, set.localId)}
              >
                {set.is_completed ? (
                  <View style={styles.checkboxFilled}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                ) : (
                  <Text style={styles.checkmarkEmpty}>✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </Swipeable>
        ))}

        {/* Add Set */}
        <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exercise.localId)}>
          <Text style={styles.addSetText}>+ Add Set</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {hasPrevExercise && (
          <TouchableOpacity
            style={styles.prevBtn}
            onPress={() => {
              const prev = session.exercises[exerciseIndex - 1];
              navigation.replace('ExerciseView', { exerciseLocalId: prev.localId });
            }}
          >
            <Ionicons name="chevron-back" size={16} color="#555" />
            <Text style={styles.prevBtnText}>Prev</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, !hasPrevExercise && { flex: 1 }]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {hasNextExercise ? 'Next Exercise' : 'Back to Overview'}
          </Text>
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitles: { marginBottom: 12 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginLeft: 14 },
  exerciseName: { fontSize: 26, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  exerciseSub: { fontSize: 14, color: '#888' },
  equipmentContainer: { marginBottom: 10 },
  equipmentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  equipmentSelectorOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  equipmentText: { fontSize: 16, color: '#FFF', fontWeight: '600' },
  equipmentDropdown: {
    backgroundColor: '#262626',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  equipmentOptionLast: {},
  equipmentOptionText: { fontSize: 16, color: '#888' },
  equipmentOptionTextSelected: { color: '#FFF', fontWeight: '600' },
  previousText: { fontSize: 13, color: '#888', marginTop: 6 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 4,
  },
  tableHeaderText: { fontSize: 13, color: '#666', textAlign: 'center' },
  tableHeaderCheck: { fontSize: 16, color: '#666', textAlign: 'center' },
  setNumCol: { width: 32, textAlign: 'center' },
  inputCol: { flex: 1, marginHorizontal: 4, textAlign: 'center' },
  checkCol: { width: 44, alignItems: 'center', justifyContent: 'center' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#1A1A1A',
  },
  setNumber: { fontSize: 14, color: '#888', width: 32, textAlign: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#262626',
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  checkBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  checkboxFilled: {
    width: 36,
    height: 36,
    backgroundColor: '#2E2E2E',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: { fontSize: 16, color: '#FFF' },
  checkmarkEmpty: { fontSize: 20, color: '#444' },
  addSetBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  addSetText: { color: '#888', fontSize: 15, fontWeight: '500' },
  deleteAction: {
    backgroundColor: '#CC3333',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  deleteActionText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  footer: {
    backgroundColor: '#F0F0F0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  prevBtnText: { color: '#555', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 16,
  },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
