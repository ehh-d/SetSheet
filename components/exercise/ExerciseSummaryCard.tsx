import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutExerciseWithDetails } from '../../types';
import { calculate1RM, calculateVolume } from '../../utils/calculations';

interface ExerciseSummaryCardProps {
  exercise: WorkoutExerciseWithDetails;
}

export function ExerciseSummaryCard({ exercise }: ExerciseSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const completedSets = exercise.sets.filter((s) => s.is_completed);
  const exerciseName = exercise.exercise_variations.exercises.name;
  const muscleGroup = exercise.exercise_variations.exercises.muscle_group;

  // Calculate total volume
  const totalVolume = calculateVolume(
    completedSets.map((s) => ({ reps: s.reps || 0, weight: s.weight || 0 }))
  );

  // Calculate estimated 1RM (highest across all completed sets)
  const estimated1RM = completedSets.reduce((max, s) => {
    if (!s.weight || !s.reps) return max;
    const e1rm = Math.round(calculate1RM(s.weight, s.reps));
    return e1rm > max ? e1rm : max;
  }, 0);

  return (
    <View style={styles.wrapper}>
      {/* Continuous sidebar line */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarLine} />
      </View>

      {/* Card */}
      <View style={styles.cardParent}>
        <View style={[styles.card, expanded ? styles.cardExpanded : styles.cardCollapsed]}>
          {/* Header — toggles accordion */}
          <TouchableOpacity
            style={styles.header}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <View style={styles.imagePlaceholder} />

            <View style={styles.titleContainer}>
              <Text style={styles.title}>{exerciseName}</Text>
              <Text style={[styles.muscleGroup, expanded && styles.muscleGroupExpanded]}>
                {muscleGroup}
              </Text>
            </View>

            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#757575"
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Detail rows — always visible */}
          <View style={styles.detailRows}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Volume</Text>
              <View style={styles.detailValue}>
                <Text style={styles.detailValueBold}>{totalVolume.toLocaleString()}</Text>
                <Text style={styles.detailUnit}>lbs</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>1 Rep Max</Text>
              <View style={styles.detailValue}>
                <Text style={styles.detailValueBold}>{estimated1RM}</Text>
                <Text style={styles.detailUnit}>lbs</Text>
              </View>
            </View>
          </View>

          {/* Set details — only when expanded */}
          {expanded && (
            <View style={styles.setDetails}>
              {/* Column headers */}
              <View style={styles.setHeaderRow}>
                <Text style={styles.setHeaderText}>Set</Text>
                <Text style={styles.setHeaderText}>Reps</Text>
                <Text style={styles.setHeaderText}>Lbs</Text>
                <Text style={styles.setHeaderText}>PR</Text>
              </View>

              {/* Set rows */}
              <View style={styles.setRows}>
                {completedSets.map((set, idx) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={styles.setCell}>{idx + 1}</Text>
                    <Text style={styles.setCell}>{set.reps ?? '-'}</Text>
                    <Text style={styles.setCellBold}>{set.weight ?? '-'}</Text>
                    <View style={styles.prCell}>
                      {set.is_pr && (
                        <Ionicons name="star" size={16} color="#D5D5D5" />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  sidebar: {
    width: 8,
    alignItems: 'center',
  },
  sidebarLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#757575',
  },
  cardParent: {
    flex: 1,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 20,
  },
  cardCollapsed: {
    borderWidth: 1,
    borderColor: '#313131',
  },
  cardExpanded: {
    backgroundColor: '#1B1B1B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 8,
    gap: 16,
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  muscleGroup: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  muscleGroupExpanded: {
    color: '#D5D5D5',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
  },
  // Detail rows (Total Volume, 1RM)
  detailRows: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 16,
    color: '#D5D5D5',
    lineHeight: 20,
  },
  detailValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailValueBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0F0F0',
    lineHeight: 20,
  },
  detailUnit: {
    fontSize: 16,
    color: '#D5D5D5',
    lineHeight: 20,
  },
  // Set details table
  setDetails: {
    gap: 16,
  },
  setHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setHeaderText: {
    width: 56,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#D5D5D5',
  },
  setRows: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setCell: {
    width: 56,
    textAlign: 'center',
    fontSize: 16,
    color: '#D5D5D5',
    lineHeight: 20,
  },
  setCellBold: {
    width: 56,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0F0F0',
    lineHeight: 20,
  },
  prCell: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
