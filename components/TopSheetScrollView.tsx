import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  ScrollView,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const SPRING_CONFIG = {
  tension: 50,
  friction: 10,
  useNativeDriver: false,
};

export interface TopSheetScrollViewRef {
  scrollTo: (options: { y: number; animated?: boolean }) => void;
  snapToIndex: (index: number) => void;
}

interface TopSheetScrollViewProps {
  snapPoints: number[];
  initialIndex?: number;
  children: React.ReactNode;
  onSnapChange?: (index: number) => void;
  onScroll?: (offsetY: number) => void;
  scrollEnabled?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  handleHeight?: number;
  topInset?: number;
  overlay?: React.ReactNode;
}

export const TopSheetScrollView = forwardRef<TopSheetScrollViewRef, TopSheetScrollViewProps>(
  (
    {
      snapPoints,
      initialIndex = 0,
      children,
      onSnapChange,
      onScroll,
      scrollEnabled = true,
      style,
      contentContainerStyle,
      handleHeight = 56,
      topInset = 0,
      overlay,
    },
    ref
  ) => {
    const sortedSnapPoints = [...snapPoints].sort((a, b) => a - b);
    const maxSnapIndex = sortedSnapPoints.length - 1;

    // Animated values
    const sheetHeight = useRef(new Animated.Value(sortedSnapPoints[initialIndex])).current;
    const currentIndex = useRef(initialIndex);
    const currentHeight = useRef(sortedSnapPoints[initialIndex]);
    const startHeight = useRef(sortedSnapPoints[initialIndex]);
    const scrollViewRef = useRef<ScrollView>(null);

    // Scroll tracking for close-on-overscroll
    const scrollOffset = useRef(0);
    const contentHeight = useRef(0);
    const scrollViewHeight = useRef(0);
    const isAtBottom = useRef(false);

    // Track animated value changes
    React.useEffect(() => {
      const id = sheetHeight.addListener(({ value }) => {
        currentHeight.current = value;
      });
      return () => sheetHeight.removeListener(id);
    }, [sheetHeight]);

    // Find closest snap point with velocity consideration
    const findClosestSnapPoint = useCallback(
      (height: number, velocity: number) => {
        const projectedHeight = height + velocity * 0.15;

        let closestIndex = 0;
        let minDistance = Math.abs(sortedSnapPoints[0] - projectedHeight);

        for (let i = 1; i < sortedSnapPoints.length; i++) {
          const distance = Math.abs(sortedSnapPoints[i] - projectedHeight);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        }

        return closestIndex;
      },
      [sortedSnapPoints]
    );

    // Snap to specific index
    const snapToIndex = useCallback(
      (index: number, notify = true) => {
        const clampedIndex = Math.min(Math.max(index, 0), maxSnapIndex);
        const targetHeight = sortedSnapPoints[clampedIndex];

        Animated.spring(sheetHeight, {
          toValue: targetHeight,
          ...SPRING_CONFIG,
        }).start();

        if (notify && clampedIndex !== currentIndex.current && onSnapChange) {
          onSnapChange(clampedIndex);
        }
        currentIndex.current = clampedIndex;
      },
      [sortedSnapPoints, maxSnapIndex, sheetHeight, onSnapChange]
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        scrollTo: (options) => {
          scrollViewRef.current?.scrollTo({ y: options.y, animated: options.animated ?? true });
        },
        snapToIndex: (index: number) => {
          snapToIndex(index);
        },
      }),
      [snapToIndex]
    );

    // Pan responder for dragging (handle and collapsed content area)
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
        onPanResponderGrant: () => {
          startHeight.current = currentHeight.current;
        },
        onPanResponderMove: (_, gesture) => {
          const newHeight = startHeight.current + gesture.dy;
          const minHeight = sortedSnapPoints[0];
          const maxHeight = sortedSnapPoints[maxSnapIndex];

          // Rubber banding at edges
          if (newHeight < minHeight) {
            const overscroll = minHeight - newHeight;
            sheetHeight.setValue(minHeight - overscroll * 0.3);
          } else if (newHeight > maxHeight) {
            const overscroll = newHeight - maxHeight;
            sheetHeight.setValue(maxHeight + overscroll * 0.3);
          } else {
            sheetHeight.setValue(newHeight);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const closestIndex = findClosestSnapPoint(currentHeight.current, gesture.vy);
          snapToIndex(closestIndex);
        },
      })
    ).current;

    // Handle scroll events
    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        scrollOffset.current = contentOffset.y;
        contentHeight.current = contentSize.height;
        scrollViewHeight.current = layoutMeasurement.height;

        // Check if at bottom (with small threshold)
        const maxScroll = contentSize.height - layoutMeasurement.height;
        isAtBottom.current = contentOffset.y >= maxScroll - 10;

        if (onScroll) {
          onScroll(contentOffset.y);
        }
      },
      [onScroll]
    );

    // Handle scroll end - close panel if at bottom and user swipes up
    const handleScrollEndDrag = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { velocity, contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const maxScroll = contentSize.height - layoutMeasurement.height;
        const atBottom = contentOffset.y >= maxScroll - 20;

        // If at bottom and user swipes up (positive velocity.y = scrolling down = finger swiping up)
        if (atBottom && velocity && velocity.y > 0.3 && currentIndex.current > 0) {
          snapToIndex(0);
        }
      },
      [snapToIndex]
    );

    // When collapsed, overlay a draggable area on top of the ScrollView
    const isCollapsed = !scrollEnabled;

    return (
      <Animated.View style={[styles.container, style, { height: sheetHeight }]}>
        {/* Header mask - covers safe area so content doesn't show behind status bar */}
        <View style={[styles.headerMask, { height: topInset }]} />

        {/* Always use ScrollView to preserve scroll position */}
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          style={[styles.scrollView, { marginTop: topInset }]}
          contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        >
          {children}
        </ScrollView>

        {/* When collapsed, overlay a draggable area to capture gestures */}
        {isCollapsed && (
          <View
            style={[styles.collapsedOverlay, { top: topInset, bottom: handleHeight }]}
            {...panResponder.panHandlers}
          />
        )}

        {/* Overlay content (e.g., month label) */}
        {overlay}

        {/* Draggable handle */}
        <View style={[styles.handleArea, { height: handleHeight }]} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#272727',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginHorizontal: 8,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  headerMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#272727',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  collapsedOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  contentContainer: {
    flexGrow: 1,
  },
  handleArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#272727',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555555',
  },
});
