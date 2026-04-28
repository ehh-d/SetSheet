// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Exercise, Category } from '../types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { WorkoutHeader, WorkoutHeaderHandle } from '../components/WorkoutHeader';
import { useWorkoutSession } from '../contexts/WorkoutSessionContext';

type ExerciseSearchNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ExerciseSearch'
>;
type ExerciseSearchRouteProp = RouteProp<RootStackParamList, 'ExerciseSearch'>;

interface SelectedExercise {
  exerciseId: string;
  exerciseName: string;
  equipment: string;
  muscleGroup: string;
  metric_type: string;
  proposedSets?: number;
  proposedRepsMin?: number;
}

const getExerciseKey = (exerciseId: string, equipment: string) => `${exerciseId}::${equipment}`;


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ExerciseSearchScreen() {
  const navigation = useNavigation<ExerciseSearchNavigationProp>();
  const route = useRoute<ExerciseSearchRouteProp>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const { categoryId, categoryName, date, addToSession } = route.params;

  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedDate = `${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}`;
  const ordinalDay = dateObj.getDate();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>(
    (route.params.preSelectedExercises ?? []).map(ex => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      equipment: ex.equipment,
      muscleGroup: ex.muscleGroup,
      proposedSets: ex.proposedSets,
      proposedRepsMin: ex.proposedRepsMin,
    }))
  );
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<Category[]>(() => {
    if (!categoryId) return [];
    return [{ id: categoryId, name: categoryName, category_group: '', created_at: null, muscle_groups: null }];
  });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [expandedAccordionId, setExpandedAccordionId] = useState<string | null>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(100);
  const [existingExerciseKeys, setExistingExerciseKeys] = useState<Set<string>>(new Set());
  const [isStarting, setIsStarting] = useState(false);

  const { session: workoutSession, initSession, clearSession, addExercises: addToSessionExercises } = useWorkoutSession();

  // Editable sheet name
  const [sheetName, setSheetName] = useState(categoryName || 'Workout');
  const [isEditNameVisible, setIsEditNameVisible] = useState(false);
  const [editingName, setEditingName] = useState('');

  const panelHeightAnim = useRef(new Animated.Value(120)).current;
  const collapsedHeightRef = useRef(120);
  const isAnimatingRef = useRef(false);
  const headerRef = useRef<WorkoutHeaderHandle>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerHeightRef = useRef(0);
  const panelPaddingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      headerRef.current?.collapse();
      setIsKeyboardVisible(true);
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: -headerHeightRef.current,
          duration: e.duration || 250,
          useNativeDriver: false,
        }),
        Animated.timing(panelPaddingAnim, {
          toValue: -(insets.bottom + 8),
          duration: e.duration || 250,
          useNativeDriver: false,
        }),
      ]).start();
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      setIsKeyboardVisible(false);
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: e.duration || 250,
          useNativeDriver: false,
        }),
        Animated.timing(panelPaddingAnim, {
          toValue: 0,
          duration: e.duration || 250,
          useNativeDriver: false,
        }),
      ]).start();
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const loadData = async () => {
    const promises: Promise<any>[] = [
      supabase.from('exercises').select('*').order('name'),
      supabase.from('categories').select('*').order('display_order'),
    ];

    const [exercisesResult, categoriesResult] = await Promise.all(promises);

    if (!exercisesResult.error && exercisesResult.data) {
      setExercises(exercisesResult.data as Exercise[]);
    }
    if (!categoriesResult.error && categoriesResult.data) {
      setAllCategories(categoriesResult.data as Category[]);
    }

    // addToSession mode: pre-populate from live session context
    if (addToSession && workoutSession) {
      const sessionExercises = workoutSession.exercises;
      const keys = new Set(sessionExercises.map(ex => getExerciseKey(ex.exerciseId, ex.equipment)));
      setExistingExerciseKeys(keys);
      setSelectedExercises(sessionExercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        equipment: ex.equipment,
        muscleGroup: ex.muscleGroup,
      })));
    }

    setLoading(false);
  };

  const getFilteredExercises = () => {
    let filtered = exercises;

    if (activeCategories.length > 0) {
      const activeCategoryIds = activeCategories.map(c => c.id);
      filtered = filtered.filter(ex =>
        ex.category_ids?.some(id => activeCategoryIds.includes(id))
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.aliases?.some((a: string) => a.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const getCardSubtitle = (exercise: Exercise) => {
    if (exercise.specific_muscles && exercise.specific_muscles.length > 0) {
      return `${exercise.muscle_group} (${exercise.specific_muscles.join(' & ')})`;
    }
    return exercise.muscle_group;
  };

  const toggleExpanded = (exerciseId: string) => {
    setExpandedExerciseId(expandedExerciseId === exerciseId ? null : exerciseId);
  };

  const toggleCategory = (category: Category) => {
    setActiveCategories(prev => {
      if (prev.some(c => c.id === category.id)) {
        return prev.filter(c => c.id !== category.id);
      }
      return [...prev, category];
    });
  };

  const getChildren = (parentId: string) => allCategories.filter(c => c.parent_id === parentId);

  const selectAllChildren = (parentId: string) => {
    const children = getChildren(parentId);
    const allSelected = children.every(c => activeCategories.some(a => a.id === c.id));
    if (allSelected) {
      setActiveCategories(prev => prev.filter(c => !children.some(ch => ch.id === c.id)));
    } else {
      setActiveCategories(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const toAdd = children.filter(c => !existingIds.has(c.id));
        return [...prev, ...toAdd];
      });
    }
  };

  const topLevelCategories = allCategories.filter(c => !c.parent_id);

  const handleAddExercise = (exercise: Exercise, equipment?: string) => {
    const eq = equipment ?? exercise.equipment?.[0];

    if (!eq) return;
    const key = getExerciseKey(exercise.id, eq);
    if (selectedExercises.some(ex => getExerciseKey(ex.exerciseId, ex.equipment) === key)) return;

    setSelectedExercises(prev => [...prev, {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      equipment: eq,
      muscleGroup: exercise.muscle_group,
      metric_type: exercise.metric_type ?? 'reps',
    }]);
    setExpandedExerciseId(null);
  };

  const handleRemoveExercise = (key: string) => {
    setSelectedExercises(prev => prev.filter(ex => getExerciseKey(ex.exerciseId, ex.equipment) !== key));
  };

  const openFilterPanel = () => {
    setIsFilterPanelOpen(true);
    isAnimatingRef.current = true;
    Animated.timing(panelHeightAnim, {
      toValue: SCREEN_HEIGHT * 0.78,
      duration: 300,
      useNativeDriver: false,
    }).start(() => { isAnimatingRef.current = false; });
  };

  const closeFilterPanel = () => {
    isAnimatingRef.current = true;
    Animated.timing(panelHeightAnim, {
      toValue: collapsedHeightRef.current,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      isAnimatingRef.current = false;
      setIsFilterPanelOpen(false);
    });
  };

  const openEditName = () => {
    setEditingName(sheetName);
    setIsEditNameVisible(true);
  };

  const saveEditName = () => {
    if (editingName.trim()) {
      setSheetName(editingName.trim());
    }
    setIsEditNameVisible(false);
  };

  const doStartWorkout = () => {
    initSession({
      date,
      workoutName: sheetName,
      categoryId: categoryId || null,
      exercises: selectedExercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        equipment: ex.equipment,
        muscleGroup: ex.muscleGroup,
        metric_type: ex.metric_type,
        proposedSets: ex.proposedSets,
        proposedRepsMin: ex.proposedRepsMin,
      })),
    });
    navigation.navigate('WorkoutOverview', {
      date,
      workoutName: sheetName,
      categoryId: categoryId || '',
    });
  };

  const handleStartWorkout = () => {
    if (selectedExercises.length === 0) {
      Alert.alert('No Exercises', 'Please select at least one exercise');
      return;
    }
    if (isStarting) return;
    setIsStarting(true);

    // If there's an active session from a different day, prompt the user
    if (workoutSession && workoutSession.date !== date) {
      Alert.alert(
        'Workout In Progress',
        `You have an active workout from ${workoutSession.date}: ${workoutSession.workoutName}`,
        [
          {
            text: 'Go to Workout',
            onPress: () => {
              setIsStarting(false);
              navigation.navigate('WorkoutOverview', {
                date: workoutSession.date,
                workoutName: workoutSession.workoutName,
                categoryId: workoutSession.categoryId || '',
              });
            },
          },
          {
            text: 'Finish Workout',
            onPress: () => {
              setIsStarting(false);
              navigation.navigate('WorkoutOverview', {
                date: workoutSession.date,
                workoutName: workoutSession.workoutName,
                categoryId: workoutSession.categoryId || '',
              });
            },
          },
          {
            text: 'End & Start New',
            style: 'destructive',
            onPress: () => {
              clearSession();
              doStartWorkout();
            },
          },
        ]
      );
      return;
    }

    doStartWorkout();
  };

  const handleCancel = () => {
    if (addToSession) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Cancel Workout',
      "Are you sure you want to cancel? You'll be taken back to your sheets.",
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Cancel Workout', style: 'destructive', onPress: () => navigation.navigate('MainTabs') },
      ]
    );
  };

  const handleAddToSession = () => {
    if (!workoutSession) return;
    const existingKeys = new Set(
      workoutSession.exercises.map(ex => `${ex.exerciseId}::${ex.equipment}`)
    );
    const newExercises = selectedExercises.filter(
      ex => !existingKeys.has(`${ex.exerciseId}::${ex.equipment}`)
    );
    if (newExercises.length > 0) {
      addToSessionExercises(newExercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        equipment: ex.equipment,
        muscleGroup: ex.muscleGroup,
        proposedSets: ex.proposedSets,
        proposedRepsMin: ex.proposedRepsMin,
      })));
    }
    navigation.navigate('WorkoutOverview', {
      date: workoutSession.date,
      workoutName: workoutSession.workoutName,
      categoryId: workoutSession.categoryId || '',
    });
  };


  const filteredExercises = getFilteredExercises();

  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    const firstLetter = exercise.name[0].toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        style={{ marginTop: headerTranslateY, overflow: 'hidden' }}
        onLayout={(e) => { headerHeightRef.current = e.nativeEvent.layout.height; }}
      >
      <WorkoutHeader
        ref={headerRef}
        date={formattedDate}
        ordinalDay={ordinalDay}
        workoutName={sheetName}
        subtitle={`${selectedExercises.length} Exercises Selected`}
        onCancel={handleCancel}
        onStart={selectedExercises.length > 0 ? (addToSession ? handleAddToSession : handleStartWorkout) : undefined}
        startLabel={addToSession ? 'Add' : (isStarting ? 'Starting…' : 'Start')}
        onEditName={openEditName}
        selectedItems={selectedExercises.map(ex => ({
          variationId: getExerciseKey(ex.exerciseId, ex.equipment),
          exerciseName: ex.exerciseName,
          muscleGroup: `${ex.equipment} · ${ex.muscleGroup}`,
        }))}
        onRemoveItem={(key) => {
          if (!existingExerciseKeys.has(key)) {
            handleRemoveExercise(key);
          }
        }}
        onReorderItems={(reordered) => {
          setSelectedExercises(prev =>
            reordered
              .map(item => prev.find(ex => getExerciseKey(ex.exerciseId, ex.equipment) === item.variationId))
              .filter(Boolean) as SelectedExercise[]
          );
        }}
      />
      </Animated.View>

      {/* Exercise list */}
      <ScrollView
        style={[styles.exerciseList, isKeyboardVisible && { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: bottomPanelHeight + 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Exercises count header — scrolls with list */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>Exercises <Text style={styles.listHeaderCount}>({filteredExercises.length})</Text></Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
        ) : (
          Object.keys(groupedExercises)
            .sort()
            .map(letter => (
              <View key={letter}>
                <Text style={styles.sectionHeader}>{letter}</Text>
                {groupedExercises[letter].map(exercise => {
                  const equipmentList = exercise.equipment ?? [];
                  const isExpanded = expandedExerciseId === exercise.id;
                  const hasMultipleVariations = equipmentList.length > 1;
                  const isSingleSelected = !hasMultipleVariations &&
                    selectedExercises.some(ex =>
                      ex.exerciseId === exercise.id && ex.equipment === (equipmentList[0] ?? '')
                    );
                  const hasAnyVariationSelected = hasMultipleVariations &&
                    selectedExercises.some(ex => ex.exerciseId === exercise.id);
                  const cardIsLight = isSingleSelected || hasAnyVariationSelected;

                  const selectedEquipmentNames = hasMultipleVariations
                    ? equipmentList.filter(eq => selectedExercises.some(
                        ex => ex.exerciseId === exercise.id && ex.equipment === eq
                      ))
                    : [];

                  return (
                    <View
                      key={exercise.id}
                      style={[styles.exerciseCard, cardIsLight && styles.exerciseCardLight]}
                    >
                      <TouchableOpacity
                        style={styles.exerciseMain}
                        onPress={() => {
                          if (hasMultipleVariations) {
                            toggleExpanded(exercise.id);
                          } else {
                            if (isSingleSelected) {
                              handleRemoveExercise(getExerciseKey(exercise.id, equipmentList[0] ?? ''));
                            } else {
                              handleAddExercise(exercise);
                            }
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.exerciseInfo}>
                          <Text style={[styles.exerciseName, cardIsLight && styles.exerciseNameDark]}>
                            {exercise.name}
                          </Text>
                          <Text style={[styles.exerciseSubtitle, cardIsLight && styles.exerciseSubtitleDark]}>
                            {getCardSubtitle(exercise)}
                          </Text>
                        </View>

                        <View style={styles.exerciseRight}>
                          {hasMultipleVariations ? (
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={20}
                              color={'#FFFFFF'}
                            />
                          ) : (
                            <View style={isSingleSelected ? styles.actionButtonRemove : undefined}>
                              <Text style={[styles.actionButtonText, isSingleSelected && styles.actionButtonTextRemove]}>
                                {isSingleSelected ? '×' : '+'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>

                      {!isExpanded && selectedEquipmentNames.length > 0 && (
                        <View style={styles.variationsContainer}>
                          <View style={[styles.variationsDivider, styles.variationsDividerLight]} />
                          {equipmentList
                            .filter(eq => selectedExercises.some(
                              ex => ex.exerciseId === exercise.id && ex.equipment === eq
                            ))
                            .map(eq => (
                              <TouchableOpacity
                                key={eq}
                                style={styles.variationRow}
                                onPress={() => handleRemoveExercise(getExerciseKey(exercise.id, eq))}
                              >
                                <Text style={[styles.variationText, styles.variationTextOnLight]}>
                                  {eq}
                                </Text>
                                <Text style={[styles.actionButtonText, styles.actionButtonTextDark]}>×</Text>
                              </TouchableOpacity>
                            ))}
                        </View>
                      )}

                      {isExpanded && (
                        <View style={styles.variationsContainer}>
                          <View style={[styles.variationsDivider, cardIsLight && styles.variationsDividerLight]} />
                          {equipmentList.map(eq => {
                            const isVariationSelected = selectedExercises.some(
                              ex => ex.exerciseId === exercise.id && ex.equipment === eq
                            );
                            return (
                              <TouchableOpacity
                                key={eq}
                                style={[
                                  styles.variationRow,
                                  cardIsLight && !isVariationSelected && styles.variationRowOnLight,
                                  isVariationSelected && styles.variationRowSelected,
                                ]}
                                onPress={() => {
                                  if (isVariationSelected) {
                                    handleRemoveExercise(getExerciseKey(exercise.id, eq));
                                  } else {
                                    handleAddExercise(exercise, eq);
                                  }
                                }}
                              >
                                <Text style={[
                                  styles.variationText,
                                  cardIsLight && !isVariationSelected && styles.variationTextOnLight,
                                  isVariationSelected && styles.variationTextSelected,
                                ]}>
                                  {eq}
                                </Text>
                                <Text style={[
                                  styles.actionButtonText,
                                  (isVariationSelected || (cardIsLight && !isVariationSelected)) && styles.actionButtonTextDark,
                                ]}>
                                  {isVariationSelected ? '×' : '+'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
        )}
      </ScrollView>

      {/* Bottom panel — unified search + filter */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.bottomPanelWrapper}
      >
        <Animated.View
          style={[styles.bottomPanel, isFilterPanelOpen && { height: panelHeightAnim }]}
        >
        {isFilterPanelOpen ? (
          <View style={[styles.filterPanelContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.filterPanelHeader}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.filterChipsRow, { marginTop: 0 }]}
                contentContainerStyle={styles.filterChipsContent}
              >
                {activeCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.activeChip}
                    onPress={() => toggleCategory(cat)}
                  >
                    <View style={styles.chipRemoveCircle}>
                      <Ionicons name="close" size={14} color="#D5D5D5" />
                    </View>
                    <Text style={styles.activeChipText}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.filterCloseButton} onPress={closeFilterPanel}>
                <Ionicons name="close" size={22} color="#1B1B1B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterPanelSubtitle}>
              {filteredExercises.length} exercises Available
            </Text>

            <ScrollView style={styles.filterCategoryList} showsVerticalScrollIndicator={false}>
              {topLevelCategories.map(cat => {
                if (cat.is_accordion) {
                  const children = getChildren(cat.id);
                  const isExpanded = expandedAccordionId === cat.id;
                  const allChildrenSelected = children.length > 0 && children.every(c => activeCategories.some(a => a.id === c.id));
                  const someChildrenSelected = children.some(c => activeCategories.some(a => a.id === c.id));
                  return (
                    <View key={cat.id}>
                      <TouchableOpacity
                        style={[styles.filterCategoryRow, someChildrenSelected && styles.filterCategoryRowActive]}
                        onPress={() => setExpandedAccordionId(isExpanded ? null : cat.id)}
                      >
                        <View style={styles.filterCategoryInfo}>
                          <Text style={[styles.filterCategoryName, someChildrenSelected && styles.filterCategoryNameActive]}>
                            {cat.name}
                          </Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={someChildrenSelected ? '#FFF' : '#888'}
                        />
                      </TouchableOpacity>
                      {isExpanded && (
                        <View style={styles.accordionChildren}>
                          <TouchableOpacity
                            style={[styles.filterCategoryRow, styles.accordionChildRow, allChildrenSelected && styles.filterCategoryRowActive]}
                            onPress={() => selectAllChildren(cat.id)}
                          >
                            <Text style={[styles.filterCategoryName, allChildrenSelected && styles.filterCategoryNameActive]}>All</Text>
                            <Text style={[styles.filterCategoryAction, allChildrenSelected && styles.filterCategoryActionActive]}>
                              {allChildrenSelected ? '×' : '+'}
                            </Text>
                          </TouchableOpacity>
                          {children.map(child => {
                            const isActive = activeCategories.some(c => c.id === child.id);
                            return (
                              <TouchableOpacity
                                key={child.id}
                                style={[styles.filterCategoryRow, styles.accordionChildRow, isActive && styles.filterCategoryRowActive]}
                                onPress={() => toggleCategory(child)}
                              >
                                <Text style={[styles.filterCategoryName, isActive && styles.filterCategoryNameActive]}>
                                  {child.name}
                                </Text>
                                <Text style={[styles.filterCategoryAction, isActive && styles.filterCategoryActionActive]}>
                                  {isActive ? '×' : '+'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                }

                const isActive = activeCategories.some(c => c.id === cat.id);
                const subtitle = cat.muscle_groups?.join(', ') || '';
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.filterCategoryRow, isActive && styles.filterCategoryRowActive]}
                    onPress={() => toggleCategory(cat)}
                  >
                    <View style={styles.filterCategoryInfo}>
                      <Text style={[styles.filterCategoryName, isActive && styles.filterCategoryNameActive]}>
                        {cat.name}
                      </Text>
                      {subtitle ? (
                        <Text style={[styles.filterCategorySubtitle, isActive && styles.filterCategorySubtitleActive]}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.filterCategoryAction, isActive && styles.filterCategoryActionActive]}>
                      {isActive ? '×' : '+'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <Animated.View
            style={[styles.bottomPanelCollapsed, { paddingBottom: Animated.add(insets.bottom + 16, panelPaddingAnim) }]}
            onLayout={(e) => {
              if (!isAnimatingRef.current) {
                const h = e.nativeEvent.layout.height;
                collapsedHeightRef.current = h;
                panelHeightAnim.setValue(h);
                setBottomPanelHeight(h);
              }
            }}
          >
            <View style={styles.searchRow}>
              <View style={styles.searchPill}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Exercises"
                  placeholderTextColor="#888888"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={22} color="#888888" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.filterIconButton} onPress={openFilterPanel} activeOpacity={0.7}>
                <Ionicons name="options-outline" size={22} color="#1B1B1B" />
              </TouchableOpacity>
            </View>

            {activeCategories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsRow}
                contentContainerStyle={styles.filterChipsContent}
              >
                {activeCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.activeChip}
                    onPress={() => toggleCategory(cat)}
                  >
                    <View style={styles.chipRemoveCircle}>
                      <Ionicons name="close" size={14} color="#D5D5D5" />
                    </View>
                    <Text style={styles.activeChipText}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        )}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Edit name modal */}
      <Modal
        visible={isEditNameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditNameVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setIsEditNameVisible(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Sheet</Text>
            <TextInput
              style={styles.modalInput}
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
              selectTextOnFocus
              placeholder="Sheet name"
              placeholderTextColor="#999999"
              returnKeyType="done"
              onSubmitEditing={saveEditName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsEditNameVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveEditName}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },

  // Bottom panel
  bottomPanelWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F0F0F0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomPanel: {
    backgroundColor: '#F0F0F0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 16,
  },
  bottomPanelCollapsed: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  filterPanelContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#757575',
    paddingLeft: 18,
    paddingRight: 22,
    paddingVertical: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1B1B1B',
  },
  clearButton: {
    marginLeft: 8,
  },
  filterChipsRow: {
    marginTop: 14,
    marginBottom: 4,
  },
  filterChipsContent: {
    paddingRight: 8,
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
    borderRadius: 30,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    marginRight: 10,
    gap: 8,
  },
  chipRemoveCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5D5D5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeChipText: {
    color: '#D5D5D5',
    fontSize: 16,
    fontWeight: '700',
  },
  filterIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Exercises count header
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listHeaderCount: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '400',
  },

  // Exercise list
  exerciseList: {
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B0B0B0',
    paddingHorizontal: 36,
    paddingTop: 16,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Exercise card
  exerciseCard: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#505050',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  exerciseCardLight: {
    backgroundColor: '#313131',
    borderColor: '#505050',
  },
  exerciseMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  exerciseNameDark: {
    color: '#F0F0F0',
  },
  exerciseSubtitle: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 16,
  },
  exerciseSubtitleDark: {
    color: '#C8C8C8',
  },
  selectedEquipmentText: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 3,
    fontWeight: '500',
  },
  selectedEquipmentTextDark: {
    color: '#505050',
  },
  exerciseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  actionButtonRemove: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 28,
    textAlign: 'center',
    marginTop: -2,
  },
  actionButtonTextRemove: {
    color: '#FFFFFF',
  },
  actionButtonTextDark: {
    color: '#FFFFFF',
  },

  // Variations
  variationsContainer: {
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  variationsDivider: {
    height: 1,
    backgroundColor: '#505050',
    marginBottom: 4,
  },
  variationsDividerLight: {
    backgroundColor: '#505050',
  },
  variationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 22,
    marginVertical: 2,
    borderRadius: 10,
  },
  variationRowOnLight: {
    backgroundColor: 'transparent',
  },
  variationRowSelected: {
    backgroundColor: '#505050',
    borderRadius: 32,
    height: 56,
  },
  variationText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  variationTextOnLight: {
    color: '#FFFFFF',
  },
  variationTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  filterCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  filterPanelSubtitle: {
    fontSize: 13,
    color: '#888888',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterCategoryList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  filterCategoryRowActive: {
    backgroundColor: '#1B1B1B',
  },
  filterCategoryInfo: {
    flex: 1,
  },
  filterCategoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B1B1B',
  },
  filterCategoryNameActive: {
    color: '#FFFFFF',
  },
  filterCategorySubtitle: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  filterCategorySubtitleActive: {
    color: '#AAAAAA',
  },
  filterCategoryAction: {
    fontSize: 20,
    color: '#1B1B1B',
    fontWeight: '300',
    lineHeight: 24,
    marginLeft: 12,
  },
  filterCategoryActionActive: {
    color: '#FFFFFF',
  },

  // Accordion
  accordionChildren: {
    paddingLeft: 8,
    marginBottom: 4,
  },
  accordionChildRow: {
    backgroundColor: '#F8F8F8',
    marginBottom: 4,
  },

  // Edit name modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#888888',
    fontWeight: '500',
  },
  modalSaveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalSaveText: {
    fontSize: 15,
    color: '#1B1B1B',
    fontWeight: '700',
  },
});
