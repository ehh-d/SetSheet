import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatRowProps {
  label: string;
  value: string | number;
  unit?: string;
}

export function StatRow({ label, value, unit }: StatRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value}
        {unit && <Text style={styles.unit}> {unit}</Text>}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    paddingLeft: 8,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: '#D5D5D5',
    lineHeight: 20,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  unit: {
    fontWeight: '400',
    color: '#D5D5D5',
    lineHeight: 20,
  },
});
