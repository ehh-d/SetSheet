import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RootStackParamList, MainTabParamList } from './types';

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
import ProfileScreen from './screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder component - the button navigates before this renders
function StartWorkoutPlaceholder() {
  return <View style={{ flex: 1, backgroundColor: '#1A1A1A' }} />;
}

function MainTabs() {
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
        name="StartWorkout"
        component={StartWorkoutPlaceholder}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.startButton}>
              <Ionicons name="add" size={32} color="#1A1A1A" />
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const today = new Date().toISOString().split('T')[0];
            navigation.navigate('CategorySelection', { date: today });
          },
        })}
      />
      <Tab.Screen
        name="Templates"
        component={UploadTemplateScreen}
        options={{
          tabBarLabel: 'Templates',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
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

const styles = StyleSheet.create({
  startButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

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
          <Stack.Screen name="CategorySelection" component={CategorySelectionScreen} />
          <Stack.Screen name="ExerciseSearch" component={ExerciseSearchScreen} />
          <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
          <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
          <Stack.Screen name="UploadTemplate" component={UploadTemplateScreen} />
          <Stack.Screen name="TemplatePreview" component={TemplatePreviewScreen} />
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
