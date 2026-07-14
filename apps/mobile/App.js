import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { 
  HomeScreen, 
  LoginScreen, 
  DriverScreen,
  AdminScreen,
  ProfileScreen
} from './src/screens';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { PaymentProvider } from './src/contexts/PaymentContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { LoadingSpinner } from './src/components/common';
import { theme } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Bottom Tabs
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let icon = '📱';
          if (route.name === 'Passenger') icon = '👥';
          if (route.name === 'Driver') icon = '🚗';
          if (route.name === 'Admin') icon = '📊';
          if (route.name === 'Profile') icon = '👤';
          return <Text style={{ fontSize: size }}>{icon}</Text>;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray[500],
        headerShown: false,
      })}
    >
      <Tab.Screen name="Passenger" component={HomeScreen} />
      <Tab.Screen name="Driver" component={DriverScreen} />
      <Tab.Screen name="Admin" component={AdminScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// App Content
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {isAuthenticated ? (
        <SocketProvider>
          <LocationProvider>
            <PaymentProvider>
              <NotificationProvider>
                <MainTabs />
              </NotificationProvider>
            </PaymentProvider>
          </LocationProvider>
        </SocketProvider>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
