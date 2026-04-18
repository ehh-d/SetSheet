import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutHeader } from '../components/WorkoutHeader';
import { Ionicons } from '@expo/vector-icons';

type CategorySelectionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CategorySelection'
>;
type CategorySelectionRouteProp = RouteProp<RootStackParamList, 'CategorySelection'>;

export default function CategorySelectionScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);
  const navigation = useNavigation<CategorySelectionNavigationProp>();
  const route = useRoute<CategorySelectionRouteProp>();
  const insets = useSafeAreaInsets();

  const { date } = route.params;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order');

    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  };

  const topLevel = categories.filter(c => !c.parent_id);
  const children = selectedParent
    ? categories.filter(c => c.parent_id === selectedParent.id)
    : [];

  const visibleCategories = selectedParent ? children : topLevel;

  const handleCancel = () => {
    Alert.alert(
      'Cancel Workout',
      "Are you sure you want to cancel? You'll be taken back to your sheets.",
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Cancel Workout', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleCategorySelect = (category: Category) => {
    if (category.is_accordion) {
      setSelectedParent(category);
    } else {
      navigation.navigate('ExerciseSearch', {
        categoryId: category.id,
        categoryName: category.name,
        date,
      });
    }
  };

  const parsedDate = parseISO(date);
  const monthDay = format(parsedDate, 'MMM d');
  const day = parsedDate.getDate();

  const screenTitle = selectedParent ? selectedParent.name : 'Select Workout Type';

  return (
    <View style={styles.container}>
      <WorkoutHeader
        date={monthDay}
        ordinalDay={day}
        onCancel={handleCancel}
      />

      <View style={styles.titleRow}>
        {selectedParent && (
          <TouchableOpacity onPress={() => setSelectedParent(null)} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#888888" />
          </TouchableOpacity>
        )}
        <Text style={styles.screenTitle}>{screenTitle}</Text>
      </View>

      <ScrollView
        style={styles.categoriesContainer}
        contentContainerStyle={[styles.categoriesContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
        ) : (
          visibleCategories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategorySelect(category)}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.muscle_groups && category.muscle_groups.length > 0 && (
                  <Text style={styles.categoryDescription}>
                    {category.muscle_groups.join(', ')}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#757575" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    gap: 4,
  },
  backButton: {
    marginRight: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
    flex: 1,
  },
  categoriesContainer: {
    flex: 1,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  loader: {
    marginTop: 40,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#505050',
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderRadius: 24,
    marginBottom: 8,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 8,
    gap: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: '#757575',
  },
});
