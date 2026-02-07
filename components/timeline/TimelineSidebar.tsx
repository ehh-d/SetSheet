import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';

interface TimelineSidebarProps {
  height?: DimensionValue;
  showDot?: boolean;
}

export function TimelineSidebar({ height = '100%', showDot = false }: TimelineSidebarProps) {
  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.line} />
      {showDot && <View style={styles.dot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  line: {
    width: 2,
    height: '100%',
    backgroundColor: '#757575',
  },
  dot: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#757575',
  },
});
