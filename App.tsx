import React from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkoutSessionProvider, useWorkoutSession } from './contexts/WorkoutSessionContext';
import { RootStackParamList, MainTabParamList } from './types';

// Screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CategorySelectionScreen from './screens/CategorySelectionScreen';
import ExerciseSearchScreen from './screens/ExerciseSearchScreen';
import WorkoutOverviewScreen from './screens/WorkoutOverviewScreen';
import ExerciseViewScreen from './screens/ExerciseViewScreen';
import UploadTemplateScreen from './screens/UploadTemplateScreen';
import ExerciseLibraryScreen from './screens/ExerciseLibraryScreen';
import ProfileScreen from './screens/ProfileScreen';
import StartWorkoutScreen from './screens/StartWorkoutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();


function MainTabs() {
  const { session: workoutSession, clearSession } = useWorkoutSession();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#333333',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Sheets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StartWorkout"
        component={StartWorkoutScreen}
        options={{
          tabBarLabel: 'Start',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (workoutSession) {
              e.preventDefault();
              Alert.alert(
                'Workout In Progress',
                `You have an active workout: ${workoutSession.workoutName} (${workoutSession.date})`,
                [
                  {
                    text: 'Go to Workout',
                    onPress: () => navigation.navigate('WorkoutOverview', {
                      date: workoutSession.date,
                      workoutName: workoutSession.workoutName,
                      categoryId: workoutSession.categoryId || '',
                    }),
                  },
                  {
                    text: 'Delete In Progress Workout',
                    style: 'destructive',
                    onPress: () => {
                      clearSession();
                      navigation.navigate('StartWorkout');
                    },
                  },
                ]
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="ExerciseLibrary"
        component={ExerciseLibraryScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}


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
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="StartWorkout" component={StartWorkoutScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="CategorySelection" component={CategorySelectionScreen} />
          <Stack.Screen name="ExerciseSearch" component={ExerciseSearchScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="WorkoutOverview" component={WorkoutOverviewScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="ExerciseView" component={ExerciseViewScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="UploadTemplate" component={UploadTemplateScreen} options={{ gestureEnabled: false }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AuthProvider>
          <WorkoutSessionProvider>
            <StatusBar style="light" />
            <Navigation />
          </WorkoutSessionProvider>
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
