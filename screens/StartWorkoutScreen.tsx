import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type StartWorkoutRouteProp = RouteProp<RootStackParamList, 'StartWorkout'>;

export default function StartWorkoutScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<StartWorkoutRouteProp>();

  // Use date from route params if available, otherwise default to today
  const date = route.params?.date || format(new Date(), 'yyyy-MM-dd');

  const handleSelectExercises = () => {
    navigation.navigate('CategorySelection', { date });
  };

  const handleUploadTemplate = () => {
    navigation.navigate('UploadTemplate', { date });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Start Workout</Text>
        <Text style={styles.subtitle}>Choose how to begin</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleSelectExercises}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="list-outline" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.optionTitle}>Select Exercises</Text>
            <Text style={styles.optionDescription}>
              Choose a category and pick exercises manually
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleUploadTemplate}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="clipboard-outline" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.optionTitle}>Upload Template</Text>
            <Text style={styles.optionDescription}>
              Paste a workout template from Claude
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 48,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#272727',
    borderRadius: 16,
    padding: 24,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#999999',
    lineHeight: 20,
  },
});
