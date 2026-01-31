import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDateEntry } from '../types';

interface CalendarDateRowProps {
  entry: CalendarDateEntry;
  onPress: () => void;
  topLabel?: string;    // Show month label at top of this row (first day of month)
  bottomLabel?: string; // Show month label at bottom of this row (last day of month)
}

// Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
const getOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function CalendarDateRow({ entry, onPress, topLabel, bottomLabel }: CalendarDateRowProps) {
  const { date, workout, isToday } = entry;
  const hasWorkout = !!workout;

  return (
    <View style={styles.rowContainer}>
      {/* Timeline column with optional month labels */}
      <View style={styles.timelineColumn}>
        <View style={styles.timelineLine} />
        {(topLabel || bottomLabel) && (
          <View style={styles.monthLabelContainer}>
            <View style={styles.monthDot} />
            <Text style={styles.monthLabel}>{topLabel || bottomLabel}</Text>
          </View>
        )}
      </View>

      {/* Date Card */}
      <TouchableOpacity
        style={[styles.dateCard, isToday && styles.dateCardToday]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.dateText, !hasWorkout && styles.textMuted]}>
          {getOrdinal(date.getDate())}
        </Text>
        <Text style={styles.separator}>/</Text>
        <Text style={[styles.workoutText, !hasWorkout && styles.textMuted]}>
          {workout?.name || 'No Workout'}
        </Text>
        {workout?.status === 'completed' && <View style={styles.completedDot} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 50,
    overflow: 'visible',
  },
  // Timeline column with continuous line
  timelineColumn: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 50,
    overflow: 'visible',
  },
  timelineLine: {
    width: 1,
    height: 56, // 50 (row) + 6 (margin) to create continuous line
    position: 'absolute',
    left: 11,
    top: 0,
    backgroundColor: '#333333',
  },
  // Date card
  dateCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  dateCardToday: {
    backgroundColor: '#3A3A3A',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#666666',
  },
  separator: {
    fontSize: 15,
    color: '#555555',
    marginHorizontal: 10,
  },
  workoutText: {
    fontSize: 15,
    color: '#FFFFFF',
    flex: 1,
  },
  completedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  // Month label styles - labels are vertically centered with the row
  monthLabelContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#555555',
    marginRight: 8,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
  },
});
