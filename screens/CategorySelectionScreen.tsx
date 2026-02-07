import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type CategorySelectionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CategorySelection'
>;
type CategorySelectionRouteProp = RouteProp<RootStackParamList, 'CategorySelection'>;

type TabType = 'All' | 'Splits' | 'Muscle' | 'Cardio' | 'Conditioning';

const CATEGORY_GROUPS: Record<TabType, string[]> = {
  All: [],
  Splits: ['Push', 'Pull', 'Legs', 'Upper Body', 'Lower Body', 'Full Body'],
  Muscle: ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Posterior Chain'],
  Cardio: ['Cardio', 'Running', 'Cycling', 'Rowing'],
  Conditioning: ['HIIT', 'MetCon', 'GPP', 'Circuit', 'Conditioning'],
};

export default function CategorySelectionScreen() {
  const [selectedTab, setSelectedTab] = useState<TabType>('All');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<CategorySelectionNavigationProp>();
  const route = useRoute<CategorySelectionRouteProp>();

  const { date } = route.params;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  };

  const getFilteredCategories = () => {
    if (selectedTab === 'All') return categories;

    const groupNames = CATEGORY_GROUPS[selectedTab];
    return categories.filter(cat => groupNames.includes(cat.name));
  };

  const handleCategorySelect = (category: Category) => {
    navigation.navigate('ExerciseSearch', {
      categoryId: category.id,
      categoryName: category.name,
      date,
    });
  };

  const formattedDate = format(parseISO(date), 'MMM d');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{formattedDate} / New Sheet</Text>
          <Text style={styles.headerIcon}>✏️</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {(['All', 'Splits', 'Muscle', 'Cardio', 'Conditioning'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.tabSelected]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextSelected]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Categories */}
      <ScrollView style={styles.categoriesContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
        ) : (
          getFilteredCategories().map(category => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategorySelect(category)}
            >
              <View>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.description && (
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                )}
              </View>
              <Text style={styles.arrow}>›</Text>
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
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  cancelText: {
    color: '#888888',
    fontSize: 16,
  },
  tabsContainer: {
    maxHeight: 60,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },
  tabSelected: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: '#1A1A1A',
  },
  categoriesContainer: {
    flex: 1,
    padding: 20,
  },
  loader: {
    marginTop: 40,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#888888',
  },
  arrow: {
    fontSize: 24,
    color: '#888888',
  },
});
