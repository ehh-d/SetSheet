import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StageHeaderProps {
  title: string;
}

export function StageHeader({ title }: StageHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dotColumn}>
        <View style={styles.dot} />
        <View style={styles.line} />
      </View>
      <View style={styles.titleWrapper}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 24,
  },
  dotColumn: {
    alignSelf: 'stretch',
    width: 8,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#757575',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#757575',
  },
  titleWrapper: {
    paddingBottom: 16,
    marginLeft: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#C8C8C8',
    lineHeight: 20,
  },
});
