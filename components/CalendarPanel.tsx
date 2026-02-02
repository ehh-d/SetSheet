import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isSameDay, format, isSameMonth } from 'date-fns';

import { CalendarDateRow } from './CalendarDateRow';
import { useCalendarDates } from '../hooks/useCalendarDates';
import { RootStackParamList, Workout } from '../types';
import { TopSheetScrollView, TopSheetScrollViewRef } from './TopSheetScrollView';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface CalendarPanelProps {
  onDateSelect?: (date: Date) => void;
  focusDate?: Date;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ROW_HEIGHT = 56;
const HANDLE_HEIGHT = 36;

export function CalendarPanel({ onDateSelect, focusDate }: CalendarPanelProps) {
  const navigation = useNavigation<NavigationProp>();
  const sheetRef = useRef<TopSheetScrollViewRef>(null);
  const insets = useSafeAreaInsets();

  // Calculate snap points with safe area
  const SAFE_AREA_TOP = insets.top + 4;

  // Two snap points:
  // 0: Collapsed (1 row visible)
  // 1: Open (larger view)
  const COLLAPSED_HEIGHT = SAFE_AREA_TOP + ROW_HEIGHT + HANDLE_HEIGHT;
  const OPEN_HEIGHT = SAFE_AREA_TOP + (7 * ROW_HEIGHT) + HANDLE_HEIGHT;

  const snapPoints = useMemo(
    () => [COLLAPSED_HEIGHT, OPEN_HEIGHT],
    [COLLAPSED_HEIGHT, OPEN_HEIGHT]
  );

  // Current snap index for controlling scroll
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0);

  // Active month for fixed label (tracks which month is at bottom of visible area)
  const [activeMonth, setActiveMonth] = useState<string>('');
  const activeMonthRef = useRef<string>('');

  // Refs for callbacks
  const focusDateRef = useRef(focusDate);
  const snapIndexRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const hasInitialScrolled = useRef(false);

  // Data - load 3 months initially, lazy load more as needed
  const {
    dates,
    isLoading,
    checkLazyLoadTrigger,
    prependedCount,
    clearPrependedCount,
  } = useCalendarDates({
    initialWeeks: 13,
    lazyLoadWeeks: 4,
    lazyLoadThresholdDays: 7,
  });

  // Keep refs in sync
  const datesRef = useRef(dates);
  useEffect(() => {
    datesRef.current = dates;
  }, [dates]);
  useEffect(() => {
    focusDateRef.current = focusDate;
  }, [focusDate]);

  // Calculate month blocks - each month has a start index, end index, and label
  const monthBlocks = useMemo(() => {
    const blocks: { startIndex: number; endIndex: number; month: string }[] = [];
    let blockStart = 0;

    for (let i = 0; i < dates.length; i++) {
      const currentDate = dates[i].date;
      const nextDate = dates[i + 1]?.date;

      // If this is the last item OR the next item is a different month
      if (!nextDate || !isSameMonth(currentDate, nextDate)) {
        blocks.push({
          startIndex: blockStart,
          endIndex: i,
          month: format(currentDate, 'MMM'),
        });
        blockStart = i + 1;
      }
    }
    return blocks;
  }, [dates]);

  // The final month chronologically (most recent)
  const finalMonth = monthBlocks.length > 0 ? monthBlocks[monthBlocks.length - 1].month : '';

  // Adjust scroll position when new dates are prepended (lazy loading)
  useEffect(() => {
    if (prependedCount > 0) {
      const scrollAdjustment = prependedCount * ROW_HEIGHT;
      const newScrollY = scrollOffsetRef.current + scrollAdjustment;
      sheetRef.current?.scrollTo({ y: newScrollY, animated: false });
      clearPrependedCount();
    }
  }, [prependedCount, clearPrependedCount]);

  // Calculate scroll position for focus date at a given panel height
  const getScrollPositionForHeight = useCallback((panelHeight: number) => {
    const currentFocusDate = focusDateRef.current;
    const currentDates = datesRef.current;
    if (!currentFocusDate || currentDates.length === 0) return 0;

    const index = currentDates.findIndex((entry) =>
      isSameDay(entry.date, currentFocusDate)
    );
    if (index < 0) return 0;

    // Position so focus date is at the bottom of visible area
    const visibleHeight = panelHeight - SAFE_AREA_TOP - HANDLE_HEIGHT;
    const rowsVisible = Math.floor(visibleHeight / ROW_HEIGHT);
    const targetRow = Math.max(0, index - rowsVisible + 1);

    return targetRow * ROW_HEIGHT;
  }, [SAFE_AREA_TOP]);

  // Calculate scroll position for focus date at current snap point
  const getScrollPositionForFocusDate = useCallback(() => {
    return getScrollPositionForHeight(snapPoints[snapIndexRef.current]);
  }, [snapPoints, getScrollPositionForHeight]);

  // Scroll to focus date
  const scrollToFocusDate = useCallback(
    (animated = true) => {
      const scrollY = getScrollPositionForFocusDate();
      sheetRef.current?.scrollTo({ y: scrollY, animated });
    },
    [getScrollPositionForFocusDate]
  );

  // Scroll to focus date on initial load (only once)
  useEffect(() => {
    if (dates.length > 0 && !isLoading && focusDate && !hasInitialScrolled.current) {
      hasInitialScrolled.current = true;
      // Delay to ensure sheet is mounted
      setTimeout(() => scrollToFocusDate(false), 100);
    }
  }, [dates.length, isLoading, focusDate, scrollToFocusDate]);

  // Scroll to focus date when panel collapses or expands
  useEffect(() => {
    if (dates.length > 0 && focusDate) {
      // Delay to allow panel animation to settle, then animate scroll
      const timer = setTimeout(() => {
        scrollToFocusDate(true);
        // Update activeMonth based on focus date since it's now at the bottom
        const focusMonth = format(focusDate, 'MMM');
        activeMonthRef.current = focusMonth;
        setActiveMonth(focusMonth);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentSnapIndex, dates.length, focusDate, scrollToFocusDate]);

  // Handle snap changes
  const handleSnapChange = useCallback(
    (index: number) => {
      snapIndexRef.current = index;
      setCurrentSnapIndex(index);
    },
    []
  );

  // Handle scroll for lazy loading and active month tracking
  const handleScroll = useCallback(
    (offsetY: number) => {
      scrollOffsetRef.current = offsetY;

      // Check if we need to lazy load more dates
      const topRowIndex = Math.floor(offsetY / ROW_HEIGHT);
      checkLazyLoadTrigger(topRowIndex);

      // Skip activeMonth updates when collapsed - collapsed state uses focus date's month
      if (snapIndexRef.current === 0) {
        return;
      }

      // Determine active month from bottom-most visible row
      const visibleHeight = snapPoints[snapIndexRef.current] - SAFE_AREA_TOP - HANDLE_HEIGHT;
      const bottomRowIndex = Math.floor((offsetY + visibleHeight) / ROW_HEIGHT);

      // Find which month this row belongs to
      for (const block of monthBlocks) {
        if (bottomRowIndex >= block.startIndex && bottomRowIndex <= block.endIndex) {
          if (activeMonthRef.current !== block.month) {
            activeMonthRef.current = block.month;
            setActiveMonth(block.month);
          }
          break;
        }
      }
    },
    [snapPoints, SAFE_AREA_TOP, checkLazyLoadTrigger, monthBlocks]
  );

  // Initialize active month when dates/blocks change
  useEffect(() => {
    if (monthBlocks.length > 0) {
      // When collapsed, use focus date's month; otherwise calculate from scroll position
      if (snapIndexRef.current === 0 && focusDateRef.current) {
        const focusMonth = format(focusDateRef.current, 'MMM');
        activeMonthRef.current = focusMonth;
        setActiveMonth(focusMonth);
      } else {
        handleScroll(scrollOffsetRef.current);
      }
    }
  }, [monthBlocks.length, handleScroll]);

  // Set active month to focus date's month when panel is collapsed
  useEffect(() => {
    if (currentSnapIndex === 0 && focusDate) {
      const focusMonth = format(focusDate, 'MMM');
      activeMonthRef.current = focusMonth;
      setActiveMonth(focusMonth);
    }
  }, [currentSnapIndex, focusDate]);

  // Handle date/workout press
  const handleDatePress = useCallback(
    (date: Date, workout: Workout | null) => {
      // Update focus date ref
      focusDateRef.current = date;

      // Notify parent
      if (onDateSelect) {
        onDateSelect(date);
      }

      // Collapse to week view
      sheetRef.current?.snapToIndex(0);

      // Navigate to active workout (completed workouts show inline on Home)
      if (workout && workout.status !== 'completed') {
        navigation.navigate('ActiveWorkout', { workoutId: workout.id });
      }
    },
    [navigation, onDateSelect]
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { height: COLLAPSED_HEIGHT, paddingTop: SAFE_AREA_TOP },
        ]}
      >
        <ActivityIndicator size="small" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TopSheetScrollView
        ref={sheetRef}
        snapPoints={snapPoints}
        initialIndex={0}
        onSnapChange={handleSnapChange}
        onScroll={handleScroll}
        scrollEnabled={currentSnapIndex > 0}
        topInset={SAFE_AREA_TOP}
        handleHeight={HANDLE_HEIGHT}
        contentContainerStyle={styles.contentContainer}
        overlay={
          <View style={styles.fixedLabelContainer}>
            {/* Only show terminator for the final month (most recent chronologically) */}
            {activeMonth === finalMonth && <View style={styles.timelineTerminator} />}
            <View style={styles.monthDot} />
            <Text style={styles.monthLabel}>{activeMonth}</Text>
          </View>
        }
      >
        <View style={styles.timelineContainer}>
          {/* Single continuous timeline line */}
          <View style={styles.timelineLine} />

          {/* Date rows */}
          {monthBlocks.map((block, blockIdx) => (
            <React.Fragment key={`block-${block.month}-${blockIdx}`}>
              {dates.slice(block.startIndex, block.endIndex + 1).map((entry, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === block.endIndex - block.startIndex;
                return (
                  <CalendarDateRow
                    key={`date-${block.startIndex + idx}`}
                    entry={entry}
                    onPress={() => handleDatePress(entry.date, entry.workout)}
                    isSelected={focusDate ? isSameDay(entry.date, focusDate) : false}
                    topLabel={isFirst ? block.month : undefined}
                    bottomLabel={isLast ? block.month : undefined}
                    activeMonth={activeMonth}
                    hideAllInlineLabels={currentSnapIndex === 0}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </View>
      </TopSheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 44, // Space for handle (36) + small padding
  },
  timelineContainer: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 7, // Align with dot center: 4 (monthLabelContainer) + 4 (dot center) - 1 (line center)
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#333333',
  },
  fixedLabelContainer: {
    position: 'absolute',
    left: 20, // Align with inline labels: 16 (padding) + 4 (container offset)
    bottom: HANDLE_HEIGHT + 22, // Align vertically with bottom card center
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 200,
  },
  timelineTerminator: {
    position: 'absolute',
    left: 3, // Align with timeline line (23 absolute - 20 container = 3)
    top: 8, // Start just below the dot center
    width: 2,
    height: HANDLE_HEIGHT + 20, // Cover line down to bottom of panel
    backgroundColor: '#272727', // Match panel background
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#272727',
    marginHorizontal: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
});
