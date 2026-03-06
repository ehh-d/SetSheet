// @ts-nocheck
import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { RootStackParamList } from '../types';
import { parseTemplate, validateTemplate } from '../utils/templateParser';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

  const copyPromptText = `Use this template:

[Workout Name]
- Exercise Name (Equipment) SetsxReps
- Exercise Name (Equipment) SetsxReps`;

  const handleCopyTemplate = async () => {
    await Share.share({ message: copyPromptText });
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
          <Text style={styles.instructionsTitle}>Template Format:</Text>
          <Text style={styles.instructionsText}>
            {'Pull Day\n- Barbell Row (Barbell) 4x8-10\n- Lat Pulldown (Cable) 3x10-12'}
          </Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyTemplate}>
            <Text style={styles.copyButtonText}>Copy Template</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          multiline
          placeholder="Paste or type your template here..."
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
    backgroundColor: '#252525',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 22,
    fontFamily: 'Courier',
    marginBottom: 14,
  },
  copyButton: {
    backgroundColor: '#333333',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#252525',
    color: '#FFFFFF',
    fontSize: 15,
    padding: 16,
    borderRadius: 12,
    minHeight: 300,
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
