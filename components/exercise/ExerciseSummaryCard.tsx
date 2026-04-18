import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutExerciseWithDetails } from '../../types';
import { calculate1RM, calculateVolume } from '../../utils/calculations';
import { getMetricConfig, secondsToMMSS } from '../../utils/metricConfig';

interface ExerciseSummaryCardProps {
  exercise: WorkoutExerciseWithDetails;
}

function getSetDisplayValue(fieldKey: string, set: any): string {
  switch (fieldKey) {
    case 'duration': return set.duration != null ? secondsToMMSS(set.duration) : '-';
    case 'distance': return set.distance != null ? set.distance.toString() : '-';
    case 'reps':     return set.reps != null ? set.reps.toString() : '-';
    case 'weight':   return set.weight != null ? set.weight.toString() : '-';
    default:         return '-';
  }
}

export function ExerciseSummaryCard({ exercise }: ExerciseSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const metricType: string = (exercise.exercises as any).metric_type ?? 'reps';
  const config = getMetricConfig(metricType);
  const completedSets = exercise.sets.filter((s) => s.is_completed);
  const exerciseName = exercise.exercises.name;
  const muscleGroup = exercise.exercises.muscle_group;

  // Reps-based stats
  const estimated1RM = completedSets.reduce((max, s) => {
    if (!s.weight || !s.reps) return max;
    const e1rm = Math.round(calculate1RM(s.weight, s.reps));
    return e1rm > max ? e1rm : max;
  }, 0);
  const totalVolume = calculateVolume(
    completedSets.map((s) => ({ reps: s.reps || 0, weight: s.weight || 0 }))
  );
  const prWeight = completedSets.reduce((max, s) => ((s.weight || 0) > max ? s.weight || 0 : max), 0);

  // Time-based stats
  const totalDurationSecs = completedSets.reduce((sum, s) => sum + ((s as any).duration ?? 0), 0);

  // Distance-based stats
  const totalDistance = completedSets.reduce((sum, s) => sum + ((s as any).distance ?? 0), 0);
  const distanceUnit = (completedSets[0] as any)?.distance_unit ?? '';

  const showsReps = metricType === 'reps' || metricType === 'hybrid';
  const showsTime = metricType === 'time' || metricType === 'cardio' || metricType === 'hybrid';
  const showsDistance = metricType === 'distance_weight' || metricType === 'cardio';

  return (
    <View style={styles.wrapper}>
      <View style={styles.cardParent}>
        <View style={[styles.card, expanded ? styles.cardExpanded : styles.cardCollapsed]}>

          {/* Header */}
          <TouchableOpacity
            style={styles.header}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{exerciseName}</Text>
              <View style={styles.subtitleRow}>
                <Text style={[styles.muscleGroup, expanded && styles.muscleGroupExpanded]}>
                  {exercise.equipment ? `${exercise.equipment} • ` : ''}{muscleGroup}
                </Text>
                {!expanded && showsReps && estimated1RM > 0 && (
                  <Text style={styles.inlineOnerm}>1RM {estimated1RM} lbs</Text>
                )}
                {!expanded && showsTime && !showsReps && totalDurationSecs > 0 && (
                  <Text style={styles.inlineOnerm}>{secondsToMMSS(totalDurationSecs)}</Text>
                )}
              </View>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#757575" />
          </TouchableOpacity>

          {expanded && <View style={styles.divider} />}

          {/* Stats */}
          {expanded && (
            <View style={styles.detailRows}>
              {showsReps && estimated1RM > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>1 Rep Max</Text>
                  <View style={styles.detailValue}>
                    <Text style={styles.detailValueBold}>{estimated1RM}</Text>
                    <Text style={styles.detailUnit}>lbs</Text>
                  </View>
                </View>
              )}
              {showsReps && totalVolume > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Volume</Text>
                  <View style={styles.detailValue}>
                    <Text style={styles.detailValueBold}>{totalVolume.toLocaleString()}</Text>
                    <Text style={styles.detailUnit}>lbs</Text>
                  </View>
                </View>
              )}
              {showsTime && totalDurationSecs > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Time</Text>
                  <View style={styles.detailValue}>
                    <Text style={styles.detailValueBold}>{secondsToMMSS(totalDurationSecs)}</Text>
                  </View>
                </View>
              )}
              {showsDistance && totalDistance > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Distance</Text>
                  <View style={styles.detailValue}>
                    <Text style={styles.detailValueBold}>{totalDistance.toLocaleString()}</Text>
                    {distanceUnit ? <Text style={styles.detailUnit}>{distanceUnit}</Text> : null}
                  </View>
                </View>
              )}
              {showsReps && prWeight > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PR</Text>
                  <View style={styles.detailValue}>
                    <Text style={styles.detailValueBold}>{prWeight}</Text>
                    <Text style={styles.detailUnit}>lbs</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Set table */}
          {expanded && (
            <View style={styles.setDetails}>
              <View style={styles.setHeaderRow}>
                <Text style={[styles.setHeaderText, styles.setNumCol]}>Set</Text>
                {config.fields.map(f => (
                  <Text key={f.key} style={[styles.setHeaderText, styles.setDataCol]}>{f.label}</Text>
                ))}
              </View>
              <View style={styles.setRows}>
                {completedSets.map((set, idx) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={[styles.setCell, styles.setNumCol]}>{idx + 1}</Text>
                    {config.fields.map((f, fi) => (
                      <Text
                        key={f.key}
                        style={[
                          fi === config.fields.length - 1 ? styles.setCellBold : styles.setCell,
                          styles.setDataCol,
                        ]}
                      >
                        {getSetDisplayValue(f.key, set)}
                      </Text>
                    ))}
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
  wrapper: { flex: 1 },
  cardParent: { flex: 1, paddingVertical: 8 },
  card: { borderRadius: 32, paddingHorizontal: 24, paddingVertical: 24, gap: 20 },
  cardCollapsed: { borderWidth: 1, borderColor: '#313131', margin: -1 },
  cardExpanded: { backgroundColor: '#1B1B1B' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingRight: 8, gap: 16 },
  titleContainer: { flex: 1, gap: 8 },
  subtitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inlineOnerm: { fontSize: 14, fontWeight: '500', color: '#999999', marginRight: -44 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  muscleGroup: { fontSize: 14, fontWeight: '500', color: '#757575' },
  muscleGroupExpanded: { color: '#D5D5D5' },
  divider: { height: 1, backgroundColor: '#2A2A2A' },
  detailRows: { gap: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailLabel: { fontSize: 16, color: '#D5D5D5', lineHeight: 20 },
  detailValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailValueBold: { fontSize: 16, fontWeight: 'bold', color: '#F0F0F0', lineHeight: 20 },
  detailUnit: { fontSize: 16, color: '#D5D5D5', lineHeight: 20 },
  setDetails: { gap: 16 },
  setHeaderRow: { flexDirection: 'row' },
  setHeaderText: { textAlign: 'center', fontSize: 14, fontWeight: '500', color: '#D5D5D5' },
  setNumCol: { width: 40 },
  setDataCol: { flex: 1 },
  setRows: { gap: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center' },
  setCell: { textAlign: 'center', fontSize: 16, color: '#D5D5D5', lineHeight: 20 },
  setCellBold: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#F0F0F0', lineHeight: 20 },
});
