import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList, DeviceBean} from '../types/TuyaTypes';
import {
  TUYA_DEVICE_COMMANDS,
  createCommandPayload,
  DeviceCommandMapping,
  parseJavaHashMapString,
  convertDpDataToReadable,
} from '../utils/TuyaDeviceCommandMappings';
import {NativeModules, NativeEventEmitter} from 'react-native';

// Import optimized components
import PowerControlCard from '../components/device-controls/PowerControlCard';
import WorkModeCard from '../components/device-controls/WorkModeCard';
import BrightnessCard from '../components/device-controls/BrightnessCard';
import ColorTemperatureCard from '../components/device-controls/ColorTemperatureCard';
import ColorControlCard from '../components/device-controls/ColorControlCard';
import SceneControlCard from '../components/device-controls/SceneControlCard';
import CountdownCard from '../components/device-controls/CountdownCard';

const {TuyaDeviceControlModule} = NativeModules;
const tuyaEventEmitter = new NativeEventEmitter(TuyaDeviceControlModule);

type DeviceDetailControlScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DeviceDetailControl'
>;

type DeviceDetailControlScreenRouteProp = RouteProp<
  RootStackParamList,
  'DeviceDetailControl'
>;

interface Props {
  navigation: DeviceDetailControlScreenNavigationProp;
  route: DeviceDetailControlScreenRouteProp;
}

interface DeviceState {
  [key: string]: any;
}

const DeviceDetailControlScreen: React.FC<Props> = ({navigation, route}) => {
  const {device, homeId, homeName} = route.params;

  const [deviceState, setDeviceState] = useState<DeviceState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    initializeDevice();
    return () => {
      // Clean up
      TuyaDeviceControlModule.unregisterDpUpdateListener();
      TuyaDeviceControlModule.onDestroy();
    };
  }, []);

  const initializeDevice = async () => {
    try {
      setIsLoading(true);

      // Initialize device control
      await TuyaDeviceControlModule.initializeDeviceControl(device.devId);

      // Register for updates
      await TuyaDeviceControlModule.registerDpUpdateListener();

      // Set up event listeners
      const dpUpdateListener = tuyaEventEmitter.addListener(
        'onDpUpdate',
        data => {
          console.log('Device DP Update:', data);
          if (data.devId === device.devId) {
            try {
              const dpData = parseJavaHashMapString(data.dpStr);
              console.log('Parsed DP data:', dpData);
              setDeviceState(prev => ({...prev, ...dpData}));
            } catch (error) {
              console.error('Error parsing DP data:', error);
            }
          }
        },
      );

      const statusListener = tuyaEventEmitter.addListener(
        'onDeviceStatusChanged',
        data => {
          console.log('Device Status Changed:', data);
          if (data.devId === device.devId) {
            setIsOnline(data.online);
          }
        },
      );

      // Get initial device status
      const status = await TuyaDeviceControlModule.getDeviceStatus();
      setIsOnline(status.online);
      setDeviceState(status.dps || {});

      return () => {
        dpUpdateListener?.remove();
        statusListener?.remove();
      };
    } catch (error: any) {
      console.error('Error initializing device:', error);
      Alert.alert('Error', error.message || 'Failed to initialize device');
    } finally {
      setIsLoading(false);
    }
  };

  const sendCommand = async (command: DeviceCommandMapping, value: any) => {
    try {
      setIsLoading(true);
      const payload = createCommandPayload(command, value);
      console.log('Sending command:', payload);

      const result = await TuyaDeviceControlModule.sendCommand(payload);
      console.log('Command result:', result);

      // Update local state optimistically
      setDeviceState(prev => ({...prev, [command.dpId]: value}));
    } catch (error: any) {
      console.error('Error sending command:', error);
      Alert.alert('Error', error.message || 'Failed to send command');
    } finally {
      setIsLoading(false);
    }
  };

  // Callback handlers for each component
  const handlePowerToggle = useCallback((value: boolean) => {
    sendCommand(TUYA_DEVICE_COMMANDS.switch_led, value);
  }, []);

  const handleModeChange = useCallback((mode: string) => {
    sendCommand(TUYA_DEVICE_COMMANDS.work_mode, mode);
  }, []);

  const handleBrightnessChange = useCallback((brightness: number) => {
    sendCommand(TUYA_DEVICE_COMMANDS.bright_value_v2, brightness);
  }, []);

  const handleTemperatureChange = useCallback((temp: number) => {
    sendCommand(TUYA_DEVICE_COMMANDS.temp_value_v2, temp);
  }, []);

  const handleColorChange = useCallback(
    (color: {h: number; s: number; v: number}) => {
      sendCommand(TUYA_DEVICE_COMMANDS.colour_data_v2, color);
    },
    [],
  );

  const handleSceneChange = useCallback((scene: {scene_num: number}) => {
    sendCommand(TUYA_DEVICE_COMMANDS.scene_data_v2, scene);
  }, []);

  const handleCountdownChange = useCallback((seconds: number) => {
    sendCommand(TUYA_DEVICE_COMMANDS.countdown_1, seconds);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading device...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.homeInfo}>{homeName}</Text>
          <Text
            style={[
              styles.statusText,
              isOnline ? styles.online : styles.offline,
            ]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        <PowerControlCard
          isOn={deviceState[TUYA_DEVICE_COMMANDS.switch_led.dpId] === true}
          isOnline={isOnline}
          onToggle={handlePowerToggle}
        />
        <WorkModeCard
          currentMode={
            deviceState[TUYA_DEVICE_COMMANDS.work_mode.dpId] || 'white'
          }
          isOnline={isOnline}
          onModeChange={handleModeChange}
        />
        <BrightnessCard
          currentBrightness={
            deviceState[TUYA_DEVICE_COMMANDS.bright_value_v2.dpId] || 500
          }
          isOnline={isOnline}
          onBrightnessChange={handleBrightnessChange}
        />
        <ColorTemperatureCard
          currentTemp={
            deviceState[TUYA_DEVICE_COMMANDS.temp_value_v2.dpId] || 500
          }
          isOnline={isOnline}
          onTemperatureChange={handleTemperatureChange}
        />
        <ColorControlCard
          isOnline={isOnline}
          onColorChange={handleColorChange}
        />
        <SceneControlCard
          isOnline={isOnline}
          onSceneChange={handleSceneChange}
        />
        <CountdownCard
          currentCountdown={
            deviceState[TUYA_DEVICE_COMMANDS.countdown_1.dpId] || 0
          }
          isOnline={isOnline}
          onCountdownChange={handleCountdownChange}
        />
      </ScrollView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 16,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  homeInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  online: {
    color: '#4CAF50',
  },
  offline: {
    color: '#F44336',
  },
  scrollView: {
    flex: 1,
  },
});

export default DeviceDetailControlScreen;
