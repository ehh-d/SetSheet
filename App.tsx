import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RootStackParamList } from './types';

// Screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CategorySelectionScreen from './screens/CategorySelectionScreen';
import ExerciseSearchScreen from './screens/ExerciseSearchScreen';
import ActiveWorkoutScreen from './screens/ActiveWorkoutScreen';
import WorkoutSummaryScreen from './screens/WorkoutSummaryScreen';
import UploadTemplateScreen from './screens/UploadTemplateScreen';
import TemplatePreviewScreen from './screens/TemplatePreviewScreen';
import ExerciseLibraryScreen from './screens/ExerciseLibraryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { session, loading } = useAuth();

  if (loading) {
    return null; // Could add a splash screen here
  }

  return (
    <NavigationContainer>
      {!session ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CategorySelection" component={CategorySelectionScreen} />
          <Stack.Screen name="ExerciseSearch" component={ExerciseSearchScreen} />
          <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
          <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
          <Stack.Screen name="UploadTemplate" component={UploadTemplateScreen} />
          <Stack.Screen name="TemplatePreview" component={TemplatePreviewScreen} />
          <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Navigation />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
