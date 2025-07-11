import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList, HomeBean} from '../types/TuyaTypes';
import TuyaDeviceControls from '../components/TuyaDeviceControls';
import useDevices from '../hooks/useDevices';
import {useHomesContext} from '../contexts/HomesContext';
import TuyaHomeModule from '../utils/TuyaHomeModule';

type DeviceControlScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DeviceControl'
>;

interface Props {
  navigation: DeviceControlScreenNavigationProp;
}

const DeviceControlScreen: React.FC<Props> = ({navigation}) => {
  const {
    deviceStatuses,
    listenedDevices,
    recentDevices,
    isLoading: deviceLoading,
    error: deviceError,
    sendCommand,
    registerDeviceListener,
    unregisterDeviceListener,
    toggleDeviceListener,
    turnDeviceOn,
    turnDeviceOff,
    setDeviceBrightness,
    addRecentDevice,
    removeRecentDevice,
    clearError,
  } = useDevices();

  const {
    activeHome,
    isLoading: homeLoading,
    error: homeError,
    getHomeDetail,
  } = useHomesContext();

  const [homeWithDevices, setHomeWithDevices] = useState<HomeBean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load home details with devices when component mounts or active home changes
  useEffect(() => {
    if (activeHome) {
      loadHomeDetails();
    }
  }, [activeHome]);

  // Handle errors
  useEffect(() => {
    if (deviceError) {
      Alert.alert('Device Error', deviceError, [
        {text: 'OK', onPress: clearError},
      ]);
    }
  }, [deviceError, clearError]);

  useEffect(() => {
    if (homeError) {
      Alert.alert('Home Error', homeError, [{text: 'OK'}]);
    }
  }, [homeError]);

  const loadHomeDetails = async () => {
    if (!activeHome) {
      Alert.alert('Error', 'No active home selected');
      return;
    }

    try {
      setRefreshing(true);
      console.log('Loading home details for:', activeHome.homeId);
      const homeDetails = await TuyaHomeModule.getHomeDetail(activeHome.homeId);
      console.log('Home details loaded:', homeDetails);
      setHomeWithDevices(homeDetails);
    } catch (error: any) {
      console.error('Error loading home details:', error);
      Alert.alert('Error', error.message || 'Failed to load home details');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshDevices = async () => {
    await loadHomeDetails();
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNavigateToDetailedControl = (
    device: DeviceBean,
    homeId: number,
    homeName: string,
  ) => {
    navigation.navigate('DeviceDetailControl', {
      device,
      homeId: activeHome?.homeId || homeId,
      homeName: activeHome?.name || homeName,
    });
  };

  if (!activeHome) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Device Control</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No home selected</Text>
          <Text style={styles.errorSubtext}>
            Please select a home from the dashboard first
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Device Control</Text>
          <Text style={styles.subtitle}>{activeHome.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefreshDevices}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      <TuyaDeviceControls
        devices={homeWithDevices?.devices || []}
        deviceStatuses={deviceStatuses}
        listenedDevices={listenedDevices}
        recentDevices={recentDevices}
        isLoading={deviceLoading || homeLoading || refreshing}
        onSendCommand={sendCommand}
        onRegisterDeviceListener={registerDeviceListener}
        onUnregisterDeviceListener={unregisterDeviceListener}
        onToggleDeviceListener={toggleDeviceListener}
        onTurnDeviceOn={turnDeviceOn}
        onTurnDeviceOff={turnDeviceOff}
        onSetDeviceBrightness={setDeviceBrightness}
        onAddRecentDevice={addRecentDevice}
        onRemoveRecentDevice={removeRecentDevice}
        onRefreshDevices={handleRefreshDevices}
        onNavigateToDetailedControl={handleNavigateToDetailedControl}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 16,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  refreshButtonText: {
    color: '#2196F3',
    fontWeight: '500',
    fontSize: 20,
  },
  placeholder: {
    width: 60, // Same width as back button to center title
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default DeviceControlScreen;
