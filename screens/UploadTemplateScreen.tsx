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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { parseTemplate, validateTemplate } from '../utils/templateParser';
import { supabase } from '../lib/supabase';

type UploadTemplateScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'UploadTemplate'
>;
type UploadTemplateScreenRouteProp = RouteProp<RootStackParamList, 'UploadTemplate'>;

export default function UploadTemplateScreen() {
  const navigation = useNavigation<UploadTemplateScreenNavigationProp>();
  const route = useRoute<UploadTemplateScreenRouteProp>();
  const { date } = route.params;

  const [templateText, setTemplateText] = useState('');
  const [loading, setLoading] = useState(false);

  const exampleTemplate = `Pull Day
[Compound Movements]
Barbell Row 4x8-10
Pull-ups 3x8-12
Deadlift 3x5

[Accessories]
Dumbbell Curl 3x10-12
Face Pulls 3x15-20`;

  const handleParseTemplate = async () => {
    if (!templateText.trim()) {
      Alert.alert('Error', 'Please enter a template');
      return;
    }

    setLoading(true);
    try {
      // Parse the template
      const parsed = parseTemplate(templateText);

      // Validate against database
      const validation = await validateTemplate(parsed, supabase);

      if (!validation.valid) {
        Alert.alert(
          'Invalid Exercises',
          `The following exercises were not found in the database:\n\n${validation.missingExercises.join(
            '\n'
          )}\n\nPlease check the spelling or use different exercises.`
        );
        setLoading(false);
        return;
      }

      // Navigate to preview
      navigation.navigate('TemplatePreview', { parsedTemplate: parsed, date });
    } catch (error) {
      Alert.alert('Parse Error', 'Failed to parse template. Please check the format.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setTemplateText(exampleTemplate);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Template</Text>
        <TouchableOpacity onPress={loadExample}>
          <Text style={styles.exampleButton}>Example</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardDismissMode="interactive">
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Template Format:</Text>
          <Text style={styles.instructionsText}>
            Line 1: Category name (e.g., "Pull Day"){'\n'}
            [Stage Name] - Optional section headers{'\n'}
            Exercise Name SetsxReps (e.g., "Bench Press 4x8-10")
          </Text>
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
            <Text style={styles.parseButtonText}>Parse Template</Text>
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
    lineHeight: 20,
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
