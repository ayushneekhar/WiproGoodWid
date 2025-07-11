import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {RootStackParamList} from './types/TuyaTypes';
import {AuthProvider, useAuthContext} from './contexts/AuthContext';
import {HomesProvider} from './contexts/HomesContext';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Import screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import DeviceControlScreen from './screens/DeviceControlScreen';
import DeviceDetailControlScreen from './screens/DeviceDetailControlScreen';
import CreateHomeScreen from './screens/CreateHomeScreen';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import DevicePairingScreen from './screens/DevicePairingScreen';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const {isLoggedIn, isLoading} = useAuthContext();

  // Debug: Log auth state changes
  console.log('AppNavigator - Auth state:', {isLoggedIn, isLoading});

  // Show loading screen while checking authentication status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Dashboard' : 'Login'}
        screenOptions={{
          headerShown: false,
        }}>
        {!isLoggedIn ? (
          // Authentication flow
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              gestureEnabled: false,
            }}
          />
        ) : (
          // Authenticated user flow
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="DeviceControl"
              component={DeviceControlScreen}
              options={{
                title: 'Device Control',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="DeviceDetailControl"
              component={DeviceDetailControlScreen}
              options={{
                title: 'Device Details',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="DevicePairing"
              component={DevicePairingScreen}
              options={{
                title: 'Add Device',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="CreateHome"
              component={CreateHomeScreen}
              options={{
                title: 'Create Home',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="EditHome"
              component={CreateHomeScreen}
              options={{
                title: 'Edit Home',
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <HomesProvider>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={Platform.OS === 'android' ? '#f8f9fa' : undefined}
            translucent={false}
          />
          <AppNavigator />
        </HomesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default App;
