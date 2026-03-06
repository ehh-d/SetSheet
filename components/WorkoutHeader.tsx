import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface HeaderSelectedItem {
  variationId: string;
  exerciseName: string;
  muscleGroup: string;
}

interface WorkoutHeaderProps {
  date: string;
  ordinalDay: number;
  sheetName?: string;
  workoutName?: string;
  subtitle?: string;
  onCancel: () => void;
  onStart?: () => void;
  startLabel?: string;
  onEditName?: () => void;
  selectedItems?: HeaderSelectedItem[];
  onRemoveItem?: (variationId: string) => void;
  onReorderItems?: (items: HeaderSelectedItem[]) => void;
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

const ITEM_ROW_HEIGHT = 48;

export function WorkoutHeader({
  date,
  ordinalDay,
  sheetName = 'New Sheet',
  workoutName,
  subtitle,
  onCancel,
  onStart,
  startLabel = 'Start',
  onEditName,
  selectedItems,
  onRemoveItem,
  onReorderItems,
}: WorkoutHeaderProps) {
  const insets = useSafeAreaInsets();
  const suffix = getOrdinalSuffix(ordinalDay);

  const isExpandedRef = useRef(false);
  const listHeightAnim = useRef(new Animated.Value(0)).current;
  const selectedItemsRef = useRef(selectedItems);
  const currentHeightRef = useRef(0);
  const startHeightRef = useRef(0);

  // Drag-to-reorder state (refs to avoid stale closures in responder handlers)
  const dragFromIndexRef = useRef<number | null>(null);
  const dragToIndexRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
  const [dragState, setDragState] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  useEffect(() => {
    const id = listHeightAnim.addListener(({ value }) => {
      currentHeightRef.current = value;
    });
    return () => listHeightAnim.removeListener(id);
  }, []);

  useEffect(() => {
    const count = selectedItems?.length || 0;
    if (count === 0 && isExpandedRef.current) {
      isExpandedRef.current = false;
      Animated.timing(listHeightAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    } else if (isExpandedRef.current && count > 0) {
      Animated.timing(listHeightAnim, {
        toValue: count * ITEM_ROW_HEIGHT,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
  }, [selectedItems?.length]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startHeightRef.current = currentHeightRef.current;
      },
      onPanResponderMove: (_, gs) => {
        const count = selectedItemsRef.current?.length || 0;
        const maxH = count * ITEM_ROW_HEIGHT;
        const newH = Math.max(0, Math.min(maxH, startHeightRef.current + gs.dy));
        listHeightAnim.setValue(newH);
      },
      onPanResponderRelease: (_, gs) => {
        const count = selectedItemsRef.current?.length || 0;
        if (count === 0) return;
        const maxH = count * ITEM_ROW_HEIGHT;
        const projected = currentHeightRef.current + gs.vy * 80;
        if (projected > maxH / 2) {
          isExpandedRef.current = true;
          Animated.spring(listHeightAnim, {
            toValue: maxH,
            useNativeDriver: false,
            tension: 100,
            friction: 20,
          }).start();
        } else {
          isExpandedRef.current = false;
          Animated.timing(listHeightAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Compute display order during drag
  const getDisplayItems = (): HeaderSelectedItem[] => {
    if (!selectedItems) return [];
    if (!dragState || dragState.from === dragState.to) return selectedItems;
    const items = [...selectedItems];
    const [moved] = items.splice(dragState.from, 1);
    items.splice(dragState.to, 0, moved);
    return items;
  };

  const makeHandleResponder = (originalIndex: number) => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: any) => {
      dragFromIndexRef.current = originalIndex;
      dragToIndexRef.current = originalIndex;
      dragStartYRef.current = e.nativeEvent.pageY;
      setDragState({ from: originalIndex, to: originalIndex });
    },
    onResponderMove: (e: any) => {
      if (dragFromIndexRef.current === null) return;
      const dy = e.nativeEvent.pageY - dragStartYRef.current;
      const count = selectedItemsRef.current?.length || 1;
      const newTo = Math.max(0, Math.min(count - 1, dragFromIndexRef.current + Math.round(dy / ITEM_ROW_HEIGHT)));
      dragToIndexRef.current = newTo;
      setDragState({ from: dragFromIndexRef.current, to: newTo });
    },
    onResponderRelease: () => {
      const from = dragFromIndexRef.current;
      const to = dragToIndexRef.current;
      if (from !== null && to !== null && from !== to && selectedItemsRef.current) {
        const items = [...selectedItemsRef.current];
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        onReorderItems?.(items);
      }
      dragFromIndexRef.current = null;
      dragToIndexRef.current = null;
      setDragState(null);
    },
  });

  const hasItems = selectedItems && selectedItems.length > 0;
  const displayItems = getDisplayItems();

  return (
    <View style={[styles.panel, { paddingTop: insets.top + 16 }]}>
      {/* Main header row */}
      <View style={styles.headerContent}>
        <View style={styles.leftSection}>
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>
              {date}
              <Text style={styles.ordinalSuffix}>{suffix}</Text>
            </Text>
            <View style={styles.sheetType}>
              <Text style={styles.separator}> / </Text>
              {workoutName ? (
                <View style={styles.nameRow}>
                  <Text style={styles.workoutNameBold}>{workoutName}</Text>
                  <Text style={styles.sheetNameLight}> Sheet</Text>
                  {onEditName && (
                    <TouchableOpacity
                      onPress={onEditName}
                      hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                      style={styles.pencilButton}
                    >
                      <Ionicons name="pencil" size={11} color="#888888" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.sheetName}>{sheetName}</Text>
              )}
            </View>
          </View>
          {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
        </View>

        <View style={styles.buttonsRow}>
          {onStart && (
            <TouchableOpacity style={styles.startPill} onPress={onStart} activeOpacity={0.8}>
              <Text style={styles.startText}>{startLabel}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelPill} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Expandable selected items panel */}
      {hasItems && (
        <>
          <Animated.View style={[styles.selectedList, { height: listHeightAnim }]}>
            {displayItems.map((item, index) => {
              const isDragged = dragState !== null && selectedItems![dragState.from].variationId === item.variationId;
              return (
                <View
                  key={item.variationId}
                  style={[styles.selectedItemRow, isDragged && styles.selectedItemRowDragging]}
                >
                  <View style={styles.selectedItemInfo}>
                    <Text style={styles.selectedItemName}>{item.exerciseName}</Text>
                    <Text style={styles.selectedItemMuscle}>{item.muscleGroup}</Text>
                  </View>
                  <View style={styles.selectedItemActions}>
                    {onRemoveItem && !isDragged && (
                      <TouchableOpacity
                        onPress={() => onRemoveItem(item.variationId)}
                        style={styles.selectedItemRemove}
                      >
                        <Text style={styles.selectedItemRemoveText}>×</Text>
                      </TouchableOpacity>
                    )}
                    <View
                      {...makeHandleResponder(selectedItems!.findIndex(i => i.variationId === item.variationId))}
                      style={styles.dragHandle}
                    >
                      <Ionicons name="reorder-three" size={22} color={isDragged ? '#AAAAAA' : '#555555'} />
                    </View>
                  </View>
                </View>
              );
            })}
          </Animated.View>

          <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandleBar} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#0C0C0C',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  leftSection: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D5D5D5',
    lineHeight: 16,
  },
  ordinalSuffix: {
    fontSize: 8,
    fontWeight: '400',
    color: '#D5D5D5',
  },
  sheetType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    fontSize: 12,
    fontWeight: '300',
    color: '#D5D5D5',
  },
  sheetName: {
    fontSize: 12,
    fontWeight: '300',
    color: '#D5D5D5',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutNameBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D5D5D5',
  },
  sheetNameLight: {
    fontSize: 12,
    fontWeight: '300',
    color: '#D5D5D5',
  },
  pencilButton: {
    marginLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#888888',
    marginTop: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  startPill: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  startText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  cancelPill: {
    backgroundColor: '#960000',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F0F0F0',
    lineHeight: 18,
  },
  selectedList: {
    overflow: 'hidden',
  },
  selectedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ITEM_ROW_HEIGHT,
  },
  selectedItemRowDragging: {
    opacity: 0.5,
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedItemMuscle: {
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
  selectedItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedItemRemove: {
    padding: 8,
  },
  selectedItemRemoveText: {
    fontSize: 20,
    color: '#888888',
    fontWeight: '300',
    lineHeight: 22,
  },
  dragHandle: {
    padding: 8,
    marginLeft: 4,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3A',
  },
});
