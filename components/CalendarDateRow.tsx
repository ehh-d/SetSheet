import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDateEntry } from '../types';

interface CalendarDateRowProps {
  entry: CalendarDateEntry;
  onPress: () => void;
  isSelected?: boolean; // Whether this is the focus date
  topLabel?: string;    // Show month label at top of this row (first day of month)
  bottomLabel?: string; // Show month label at bottom of this row (last day of month)
  activeMonth?: string; // Current fixed overlay month - hide inline labels that match this
  hideAllInlineLabels?: boolean; // When true, hide all inline labels (used in collapsed state)
  reserveRightSpace?: boolean; // When true, add extra right margin for current day button
}

// Helper to get ordinal suffix (st, nd, rd, th)
const getOrdinalSuffix = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

export function CalendarDateRow({ entry, onPress, isSelected, topLabel, bottomLabel, activeMonth, hideAllInlineLabels, reserveRightSpace }: CalendarDateRowProps) {
  const { date, workout } = entry;
  const hasWorkout = !!workout;

  // Determine the inline label to show (if any)
  const inlineLabel = topLabel || bottomLabel;
  // Hide inline label if: collapsed (hideAllInlineLabels), or it matches the fixed overlay's active month
  const showInlineLabel = !hideAllInlineLabels && inlineLabel && inlineLabel !== activeMonth;

  return (
    <View style={styles.rowContainer}>
      {/* Timeline column with optional month labels */}
      <View style={styles.timelineColumn}>
        {showInlineLabel && (
          <View style={styles.monthLabelContainer}>
            <View style={styles.monthDot} />
            <Text style={styles.monthLabel}>{inlineLabel}</Text>
          </View>
        )}
      </View>

      {/* Date Card */}
      <TouchableOpacity
        style={[
          styles.dateCard,
          hasWorkout && styles.dateCardWithWorkout,
          isSelected && styles.dateCardSelected,
          reserveRightSpace && styles.dateCardWithRightSpace,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.dateGroup}>
          <Text style={[styles.dateText, !hasWorkout && styles.textMuted]}>
            {date.getDate()}
          </Text>
          <Text style={[styles.ordinalSuffix, !hasWorkout && styles.textMuted]}>
            {getOrdinalSuffix(date.getDate())}
          </Text>
        </View>
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
  // Date card - default state (no workout, not selected)
  dateCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  // Selected date (focus date) - solid background
  dateCardSelected: {
    backgroundColor: '#1B1B1B',
    borderColor: '#1B1B1B',
  },
  // Has workout but not selected - brighter border
  dateCardWithWorkout: {
    borderColor: '#505050',
  },
  // Extra right margin when current day button is showing
  dateCardWithRightSpace: {
    marginRight: 52, // 32 (button width) + 8 (gap) + 12 (original margin)
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D5D5D5',
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ordinalSuffix: {
    fontSize: 7,
    fontWeight: '400',
    color: '#D5D5D5',
    marginTop: 1,
  },
  textMuted: {
    color: '#666666',
  },
  separator: {
    fontSize: 12,
    fontWeight: '300',
    color: '#D5D5D5',
    marginHorizontal: 8,
  },
  workoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D5D5D5',
    flex: 1,
  },
  completedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5D5D5',
  },
  // Month label styles - labels are vertically centered with the row
  monthLabelContainer: {
    position: 'absolute',
    left: 4, // Align dot center (at +4) with timeline line center (at 8)
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
