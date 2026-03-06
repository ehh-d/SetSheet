import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutHeader } from '../components/WorkoutHeader';

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

const CATEGORY_SUBTITLES: Record<string, string> = {
  'Full Body': 'All',
  'Push': 'Chest, Shoulders, Triceps',
  'Pull': 'Back, Biceps, Rear Delts',
  'Legs': 'Quads, Hamstrings, Glutes, Calves',
  'Upper Body': 'Chest, Back, Shoulders, Arms',
  'Lower Body': 'Quads, Hamstrings, Glutes, Calves',
  'Core': 'Abs, Obliques, Lower Back',
  'Posterior Chain': 'Hamstrings, Glutes, Lower Back, Erectors',
  'Arms': 'Biceps, Triceps, Forearms',
  'Chest': 'Pectorals, Anterior Deltoid',
  'Back': 'Lats, Rhomboids, Traps',
  'Shoulders': 'Deltoids, Rotator Cuff',
  'Cardio': 'Aerobic endurance',
  'Running': 'Distance, intervals, tempo',
  'Cycling': 'Endurance, LISS',
  'Rowing': 'Full body, low impact',
  'HIIT': 'High intensity intervals',
  'MetCon': 'Metabolic conditioning',
  'GPP': 'General physical preparedness',
  'Circuit': 'Multi-exercise rotation',
  'Conditioning': 'Work capacity, stamina',
};

export default function CategorySelectionScreen() {
  const [selectedTab, setSelectedTab] = useState<TabType>('All');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<CategorySelectionNavigationProp>();
  const route = useRoute<CategorySelectionRouteProp>();
  const insets = useSafeAreaInsets();

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

  const handleFreeWorkout = () => {
    navigation.navigate('ExerciseSearch', {
      categoryId: '',
      categoryName: 'Free Workout',
      date,
    });
  };

  const parsedDate = parseISO(date);
  const monthDay = format(parsedDate, 'MMM d');
  const day = parsedDate.getDate();

  return (
    <View style={styles.container}>
      <WorkoutHeader
        date={monthDay}
        ordinalDay={day}
        onCancel={() => navigation.goBack()}
      />

      <Text style={styles.screenTitle}>Select Workout Type</Text>

      <ScrollView
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
        ) : (
          <>
            {selectedTab === 'All' && (
              <TouchableOpacity style={styles.categoryCard} onPress={handleFreeWorkout} activeOpacity={0.7}>
                <View style={styles.cardContent}>
                  <Text style={styles.categoryName}>Free Workout</Text>
                  <Text style={styles.categoryDescription}>Up to you</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            )}
            {getFilteredCategories().map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategorySelect(category)}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryDescription}>
                    {CATEGORY_SUBTITLES[category.name] || category.description || ''}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={[styles.bottomFloat, { paddingBottom: insets.bottom + 8 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          <View style={styles.tabBar}>
            {(['All', 'Splits', 'Muscle', 'Cardio', 'Conditioning'] as TabType[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, selectedTab === tab && styles.tabSelected]}
                onPress={() => setSelectedTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.tabTextSelected]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 32,
  },
  categoriesContainer: {
    flex: 1,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  arrow: {
    fontSize: 28,
    color: '#757575',
    marginLeft: 8,
  },
  bottomFloat: {
    backgroundColor: '#F0F0F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -15 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  tabsContent: {
    flexGrow: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
    borderRadius: 56,
    height: 60,
    paddingHorizontal: 24,
    gap: 8,
    minWidth: SCREEN_WIDTH - 32,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  tabSelected: {
    backgroundColor: '#D5D5D5',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#757575',
    lineHeight: 20,
  },
  tabTextSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B1B1B',
    lineHeight: 20,
  },
});
