// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { RootStackParamList } from '../types';
import { parseTemplate, validateTemplate } from '../utils/templateParser';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const EXERCISE_URL = 'https://kcgsllsvowamrwljnxmi.supabase.co/functions/v1/exercises';

type TabType = 'All' | 'Splits' | 'Muscle' | 'Cardio' | 'Conditioning';
const TABS: TabType[] = ['All', 'Splits', 'Muscle', 'Cardio', 'Conditioning'];

type UploadTemplateScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'UploadTemplate'
>;
type UploadTemplateScreenRouteProp = RouteProp<RootStackParamList, 'UploadTemplate'>;

export default function UploadTemplateScreen() {
  const navigation = useNavigation<UploadTemplateScreenNavigationProp>();
  const route = useRoute<UploadTemplateScreenRouteProp>();
  const { session } = useAuth();
  // Default to today if accessed from tab (no params)
  const date = route.params?.date ?? format(new Date(), 'yyyy-MM-dd');

  const [templateText, setTemplateText] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; category_group: string; muscle_groups: string[] | null }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categoryTab, setCategoryTab] = useState<TabType>('All');
  const [exerciseCount, setExerciseCount] = useState(6);
  const [showCountPicker, setShowCountPicker] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name, category_group, muscle_groups').order('display_order');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const templateExample = selectedCategory
    ? `${selectedCategory}\n- Exercise Name (Equipment) SetsxReps\n- Exercise Name (Equipment) SetsxReps`
    : `[Workout Name]\n- Exercise Name (Equipment) SetsxReps\n- Exercise Name (Equipment) SetsxReps`;

  const promptText = selectedCategory
    ? `Generate a ${selectedCategory} workout from this exercise set: ${EXERCISE_URL}\n\nUse this template format:\n\n${templateExample}\n\nFilter by exercises where categories includes "${selectedCategory}". Match exercise names exactly.\n\nSelect ${exerciseCount} exercises. Distribute evenly across the specific muscles in this category.\n\nReturn the workout as a plain text code block.`
    : null;

  const handleCopyPrompt = async () => {
    if (promptText) await Share.share({ message: promptText });
  };

  const goToExerciseSearch = async (parsedTemplate: any) => {
    try {
      const exerciseNames = parsedTemplate.exercises.map((ex: any) => ex.name);
      const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .in('name', exerciseNames);
      const exerciseMap: any = {};
      exercises?.forEach((ex: any) => { exerciseMap[ex.name] = ex; });

      const preSelected = parsedTemplate.exercises
        .map((ex: any) => {
          const info = exerciseMap[ex.name];
          if (!info) return null;
          const availableEquipment: string[] = info.equipment ?? [];
          const equipment = ex.equipment
            ? availableEquipment.find((eq: string) => eq.toLowerCase() === ex.equipment.toLowerCase())
              ?? availableEquipment[0]
            : availableEquipment[0];
          return {
            exerciseId: info.id,
            exerciseName: info.name,
            equipment: equipment ?? '',
            muscleGroup: info.muscle_group,
            proposedSets: ex.sets,
            proposedRepsMin: ex.repsMin,
          };
        })
        .filter(Boolean);

      navigation.navigate('ExerciseSearch', {
        categoryId: '',
        categoryName: parsedTemplate.category,
        date,
        preSelectedExercises: preSelected,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load exercises');
    }
  };

  const handleParseTemplate = async () => {
    if (!templateText.trim()) {
      Alert.alert('Error', 'Please enter a template');
      return;
    }

    setLoading(true);
    try {
      const parsed = parseTemplate(templateText);
      const validation = await validateTemplate(parsed, supabase);

      if (!validation.valid) {
        const missingList = validation.missingExercises.join('\n');
        Alert.alert(
          'Some Exercises Not Found',
          `These exercises weren't recognized:\n\n${missingList}\n\nContinue without them?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            {
              text: 'Continue',
              onPress: async () => {
                const filtered = {
                  ...parsed,
                  exercises: parsed.exercises.filter(
                    (ex: any) => !validation.missingExercises.includes(ex.name)
                  ),
                };
                await goToExerciseSearch(filtered);
                setLoading(false);
              },
            },
          ]
        );
        return;
      }

      await goToExerciseSearch(parsed);
    } catch (error) {
      Alert.alert('Parse Error', 'Failed to parse template. Please check the format.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {route.params?.date ? (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <Text style={styles.headerTitle}>Upload Template</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} keyboardDismissMode="interactive">
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Generate with AI</Text>
          <Text style={styles.instructionsSubtitle}>Select a category, copy the prompt, and paste it into your AI.</Text>

          <View style={styles.groupTabBar}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.groupTab, categoryTab === tab && styles.groupTabSelected]}
                onPress={() => {
                  setCategoryTab(tab);
                  if (selectedCategory && tab !== 'All') {
                    const match = categories.find(c => c.name === selectedCategory);
                    if (match && match.category_group !== tab) setSelectedCategory(null);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.groupTabText, categoryTab === tab && styles.groupTabTextSelected]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.dropdown} onPress={() => setShowCategoryPicker(true)}>
            <Text style={selectedCategory ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedCategory ?? 'Select workout category…'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#888888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dropdown} onPress={() => setShowCountPicker(true)}>
            <Text style={styles.dropdownText}>{exerciseCount} exercises</Text>
            <Ionicons name="chevron-down" size={18} color="#888888" />
          </TouchableOpacity>

          {promptText && (
            <View style={styles.promptBox}>
              <Text style={styles.promptText}>{promptText}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyPrompt}>
                <Text style={styles.copyButtonText}>Copy Prompt</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Modal visible={showCategoryPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <FlatList
                data={categoryTab === 'All' ? categories : categories.filter(c => c.category_group === categoryTab)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalRow, selectedCategory === item.name && styles.modalRowActive]}
                    onPress={() => { setSelectedCategory(item.name); setShowCategoryPicker(false); }}
                  >
                    <Text style={[styles.modalRowText, selectedCategory === item.name && styles.modalRowTextActive]}>{item.name}</Text>
                    {item.muscle_groups && item.muscle_groups.length > 0 && (
                      <Text style={styles.modalRowSubtitle}>{item.muscle_groups.join(', ')}</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showCountPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCountPicker(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Exercise Count</Text>
              <FlatList
                data={[3, 4, 5, 6, 7, 8, 9, 10]}
                keyExtractor={(item) => String(item)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalRow, exerciseCount === item && styles.modalRowActive]}
                    onPress={() => { setExerciseCount(item); setShowCountPicker(false); }}
                  >
                    <Text style={[styles.modalRowText, exerciseCount === item && styles.modalRowTextActive]}>{item} exercises</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <TextInput
          style={styles.input}
          multiline
          placeholder="Paste your template here..."
          placeholderTextColor="#555555"
          value={templateText}
          onChangeText={setTemplateText}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.parseButton, loading && styles.parseButtonDisabled]}
          onPress={handleParseTemplate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.parseButtonText}>Upload</Text>
          )}
        </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backText: {
    color: '#888888',
    fontSize: 18,
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exampleButton: {
    color: '#4A9EFF',
    fontSize: 16,
    width: 60,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructions: {
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  instructionsSubtitle: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 14,
    lineHeight: 18,
  },
  instructionsText: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 22,
    fontFamily: 'Courier',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  dropdownText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#555555',
  },
  promptBox: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  promptText: {
    fontSize: 14,
    color: '#D5D5D5',
    lineHeight: 20,
  },
  copyButton: {
    backgroundColor: '#333333',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: '#252525',
    borderRadius: 16,
    maxHeight: '60%',
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modalRowActive: {
    backgroundColor: '#333333',
  },
  modalRowText: {
    fontSize: 15,
    color: '#D5D5D5',
  },
  modalRowTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalRowSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  groupTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  groupTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  groupTabSelected: {
    backgroundColor: '#D5D5D5',
  },
  groupTabText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#757575',
    lineHeight: 20,
  },
  groupTabTextSelected: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B1B1B',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#252525',
    color: '#FFFFFF',
    fontSize: 15,
    padding: 16,
    borderRadius: 12,
    minHeight: 120,
    marginBottom: 20,
    fontFamily: 'Courier',
  },
  parseButton: {
    backgroundColor: '#4A9EFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  parseButtonDisabled: {
    opacity: 0.5,
  },
  parseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
