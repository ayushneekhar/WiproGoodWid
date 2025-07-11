import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types/TuyaTypes';
import MainDashboard from '../components/MainDashboard';
import {useAuthContext} from '../contexts/AuthContext';
import {useHomesContext} from '../contexts/HomesContext';

type DashboardScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Dashboard'
>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

const DashboardScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout, isLoading: authLoading} = useAuthContext();
  const {
    homes,
    activeHome,
    isLoading: homesLoading,
    error: homesError,
    loadHomes,
    refreshHomes,
    setActiveHome,
    createHome,
    updateHome,
    dismissHome,
    clearError,
  } = useHomesContext();

  // Homes are automatically loaded by HomesContext when user is authenticated

  // Handle homes error
  useEffect(() => {
    if (homesError) {
      Alert.alert('Error', homesError, [
        {text: 'OK', onPress: clearError},
        {text: 'Retry', onPress: loadHomes},
      ]);
    }
  }, [homesError, clearError, loadHomes]);

  const handleLogout = async () => {
    console.log('DashboardScreen: handleLogout called');
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          console.log(
            'DashboardScreen: User confirmed logout, calling logout()',
          );
          try {
            await logout();
            console.log('DashboardScreen: logout() completed successfully');
            // No manual navigation needed - App.tsx will automatically
            // render LoginScreen when isLoggedIn becomes false
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  const handleGoToDevicePairing = () => {
    if (!activeHome) {
      Alert.alert(
        'No Home Selected',
        'Please select a home first before adding devices.',
      );
      return;
    }

    navigation.navigate('DevicePairing', {
      homeId: activeHome.homeId,
      homeName: activeHome.name,
    });
  };

  const handleGoToDeviceControl = () => {
    navigation.navigate('DeviceControl');
  };

  const handleCreateHome = () => {
    navigation.navigate('CreateHome');
  };

  const handleEditHome = () => {
    if (!activeHome) {
      Alert.alert('No Home Selected', 'Please select a home to edit.');
      return;
    }

    navigation.navigate('EditHome', {home: activeHome});
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </SafeAreaView>
    );
  }

  if (!activeHome) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>No home available. Please create a home first.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MainDashboard
        activeHome={activeHome}
        allHomes={homes}
        onHomeUpdate={updatedHome => setActiveHome(updatedHome)}
        onHomesRefresh={refreshHomes}
        onSwitchHome={setActiveHome}
        onEditHome={handleEditHome}
        onCreateNewHome={handleCreateHome}
        onGoToDevicePairing={handleGoToDevicePairing}
        onGoToDeviceControl={handleGoToDeviceControl}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default DashboardScreen;
