import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {
  tuyaPairingUtils,
  addScanListener,
  removeScanListener,
  startLeScan,
  manuallyStopScanning,
  getDeviceInfo,
  startBleDevicePairing,
  startComboDevicePairing,
  getDevicePairingType,
  isDeviceBound,
  isSharedDevice,
  getCurrentWiFiSSID,
} from '../utils/TuyaPairingUtils';
import {PermissionUtils} from '../utils/PermissionUtils';
import PairingModeSelector from './PairingModeSelector';
import {
  ScannedDevice,
  DeviceInfo,
  PairedDevice,
  HomeBean,
  PairingMode,
} from '../types/TuyaTypes';
import {getEzPairingToken} from '../utils/TuyaWiFiEzPairingUtils';

interface DevicePairingScreenProps {
  activeHome: HomeBean;
  onDevicePaired?: (device: PairedDevice) => void;
  onBack?: () => void;
}

type PairingStep =
  | 'modeSelection'
  | 'scanning'
  | 'deviceList'
  | 'pairing'
  | 'wifiSetup'
  | 'success';

interface WiFiCredentials {
  ssid: string;
  password: string;
}

const DevicePairingScreen: React.FC<DevicePairingScreenProps> = ({
  activeHome,
  onDevicePaired,
  onBack,
}) => {
  const [currentStep, setCurrentStep] = useState<PairingStep>('modeSelection');
  const [selectedPairingMode, setSelectedPairingMode] =
    useState<PairingMode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ScannedDevice | null>(
    null,
  );
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(null);
  const [wifiCredentials, setWifiCredentials] = useState<WiFiCredentials>({
    ssid: '',
    password: '',
  });
  const [scanTimeout, setScanTimeout] = useState(30000);
  const [pairingProgress, setPairingProgress] = useState('');

  // Ref to track timeout so we can clear it if needed
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleDeviceDiscovered = (device: ScannedDevice) => {
      setScannedDevices(prev => {
        // Check if device already exists (by UUID)
        const existingIndex = prev.findIndex(d => d.uuid === device.uuid);
        if (existingIndex >= 0) {
          // Update existing device
          const updated = [...prev];
          updated[existingIndex] = device;
          return updated;
        } else {
          // Add new device
          return [...prev, device];
        }
      });
    };

    addScanListener(handleDeviceDiscovered);

    return () => {
      console.log(
        'DevicePairingScreen: Cleaning up scan listener and stopping scan if active',
      );
      removeScanListener(handleDeviceDiscovered);
      // Always try to stop scanning when this effect cleans up
      if (isScanning) {
        manuallyStopScanning().catch(error => {
          console.error('Error stopping scanning in useEffect cleanup:', error);
        });
      }
    };
  }, [isScanning]);

  // Auto-start scanning when scanning step is reached for BLE/combo modes
  useEffect(() => {
    if (
      currentStep === 'scanning' &&
      !isScanning &&
      !isStopping &&
      (selectedPairingMode === 'ble' || selectedPairingMode === 'combo')
    ) {
      startScanning();
    }
  }, [currentStep, selectedPairingMode]);

  // Prefill WiFi SSID when WiFi setup step is reached for combo devices
  useEffect(() => {
    if (currentStep === 'wifiSetup' && !wifiCredentials.ssid) {
      const prefillWiFiSSID = async () => {
        try {
          const currentSSID = await getCurrentWiFiSSID();
          if (currentSSID) {
            setWifiCredentials(prev => ({
              ...prev,
              ssid: currentSSID,
            }));
          }
        } catch (error) {
          console.error('Failed to get current WiFi SSID:', error);
          // Don't show an error to the user, just continue without prefilling
        }
      };

      prefillWiFiSSID();
    }
  }, [currentStep, wifiCredentials.ssid]);

  // Cleanup: Always stop scanning when component unmounts
  useEffect(() => {
    return () => {
      console.log(
        'DevicePairingScreen: Unmounting, stopping any active scanning...',
      );

      // Clear any pending timeouts
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }

      // Always try to stop scanning on unmount, regardless of state
      manuallyStopScanning().catch(error => {
        console.error('Error stopping scanning on unmount:', error);
      });
      // Remove any scan listeners
      removeScanListener(() => {});
    };
  }, []);

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        console.log('DevicePairingScreen: Hardware back button pressed');
        if (isScanning) {
          // Stop scanning and then navigate back
          manuallyStopScanning()
            .then(() => {
              console.log('Scanning stopped successfully');
            })
            .catch(error => {
              console.error('Error stopping scanning on hardware back:', error);
            })
            .finally(() => {
              // Let the default back behavior happen
              return false;
            });
          // Prevent immediate back navigation to allow scan to stop
          return true;
        }
        // Allow default back behavior if not scanning
        return false;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, [isScanning]),
  );

  const startScanning = async () => {
    try {
      console.log('DevicePairingScreen: Starting scan...');

      // Check and request permissions before scanning
      const permissionsGranted =
        await PermissionUtils.checkBluetoothScanPermissions();
      if (!permissionsGranted) {
        console.log(
          'DevicePairingScreen: Permissions not granted, requesting...',
        );

        const permissionResult =
          await PermissionUtils.requestBluetoothScanPermissions();
        if (!permissionResult.granted) {
          Alert.alert(
            'Permissions Required',
            permissionResult.message ||
              'Bluetooth and location permissions are required to scan for devices. ' +
                'Please grant these permissions in your device settings.',
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Open Settings',
                onPress: () => {
                  // Note: In a real app, you might want to use a library like react-native-permissions
                  // that provides openSettings() functionality
                  Alert.alert(
                    'Open Settings',
                    'Please go to Settings > Apps > WiproGoodWid > Permissions and enable Location and Nearby devices/Bluetooth permissions.',
                    [{text: 'OK'}],
                  );
                },
              },
            ],
          );
          return;
        }
      }

      // Safety: Stop any existing scan before starting new one
      try {
        await manuallyStopScanning();
      } catch (error) {
        console.log('No active scan to stop, proceeding with new scan');
      }

      setIsScanning(true);
      setIsStopping(false);
      setScannedDevices([]);
      setCurrentStep('scanning');

      await startLeScan(scanTimeout);

      // Clear any existing timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      // Auto-stop scanning after timeout
      scanTimeoutRef.current = setTimeout(() => {
        console.log('Scan timeout reached, transitioning to device list');
        if (isScanning) {
          setIsScanning(false);
          setIsStopping(false);
          setCurrentStep('deviceList');
        }
      }, scanTimeout);
    } catch (error: any) {
      console.error('Failed to start scanning:', error);
      Alert.alert('Scan Error', `Failed to start scanning: ${error.message}`);
      setIsScanning(false);
      setIsStopping(false);
    }
  };

  const stopScanning = async () => {
    if (!isScanning || isStopping) return;

    try {
      setIsStopping(true);

      // Clear the auto-timeout since we're manually stopping
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }

      await manuallyStopScanning();
      setIsScanning(false);
      setCurrentStep('deviceList');
    } catch (error: any) {
      console.error('Failed to stop scanning:', error);
      Alert.alert('Stop Error', `Failed to stop scanning: ${error.message}`);
      // Keep scanning state as true if stop failed
    } finally {
      setIsStopping(false);
    }
  };

  const handleDeviceSelect = async (device: ScannedDevice) => {
    console.log('Device selected:', device);
    console.log('Selected pairing mode:', selectedPairingMode);
    console.log('Device pairing type:', getDevicePairingType(device));

    if (isDeviceBound(device)) {
      Alert.alert(
        'Device Already Paired',
        'This device is already paired to another account.',
        [{text: 'OK'}],
      );
      return;
    }

    const devicePairingType = getDevicePairingType(device);

    // Check if device type matches selected mode
    if (selectedPairingMode !== devicePairingType) {
      Alert.alert(
        'Pairing Mode Mismatch',
        `This device requires ${devicePairingType.toUpperCase()} pairing mode, but you selected ${selectedPairingMode?.toUpperCase()} mode. Would you like to switch modes?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Switch Mode',
            onPress: () => {
              setSelectedPairingMode(devicePairingType);
              // Continue with pairing
              proceedWithDevicePairing(device);
            },
          },
        ],
      );
      return;
    }

    proceedWithDevicePairing(device);
  };

  const proceedWithDevicePairing = async (device: ScannedDevice) => {
    setSelectedDevice(device);
    setPairingProgress('Getting device information...');

    try {
      const info = await getDeviceInfo(
        device.productId,
        device.uuid,
        device.mac,
      );
      setDeviceInfo(info);

      const pairingType = getDevicePairingType(device);
      if (pairingType === 'combo') {
        setCurrentStep('wifiSetup');
      } else {
        await handleBleDevicePairing(device, info);
      }
    } catch (error: any) {
      console.error('Failed to get device info:', error);
      Alert.alert(
        'Device Info Error',
        `Failed to get device information: ${error.message}`,
      );
      setSelectedDevice(null);
      setDeviceInfo(null);
    }
  };

  const handleBleDevicePairing = async (
    device: ScannedDevice,
    info: DeviceInfo,
  ) => {
    setCurrentStep('pairing');
    setIsPairing(true);
    setPairingProgress('Pairing BLE device...');

    try {
      const pairedDevice = await startBleDevicePairing({
        homeId: activeHome.homeId,
        uuid: device.uuid,
        deviceType: device.deviceType,
        productId: device.productId,
        address: device.address,
        isShare: isSharedDevice(device),
        timeout: 100000, // 100 seconds
      });

      setPairedDevice(pairedDevice);
      setCurrentStep('success');
      onDevicePaired?.(pairedDevice);
    } catch (error: any) {
      console.error('BLE pairing failed:', error);
      Alert.alert('Pairing Failed', `Failed to pair device: ${error.message}`);
      setCurrentStep('deviceList');
    } finally {
      setIsPairing(false);
    }
  };

  const handleComboDevicePairing = async () => {
    if (!selectedDevice || !wifiCredentials.ssid || !wifiCredentials.password) {
      Alert.alert('Missing Information', 'Please provide WiFi credentials');
      return;
    }

    setCurrentStep('pairing');
    setIsPairing(true);
    setPairingProgress('Pairing combo device...');

    try {
      const token = await getEzPairingToken(activeHome.homeId);

      const pairedDevice = await startComboDevicePairing({
        homeId: activeHome.homeId,
        uuid: selectedDevice.uuid,
        deviceType: selectedDevice.deviceType,
        token: token,
        ssid: wifiCredentials.ssid,
        password: wifiCredentials.password,
        mac: selectedDevice.mac,
        address: selectedDevice.address,
        timeout: 120000, // 120 seconds
      });

      setPairedDevice(pairedDevice);
      setCurrentStep('success');
      onDevicePaired?.(pairedDevice);
    } catch (error: any) {
      console.error('Combo pairing failed:', error);
      Alert.alert('Pairing Failed', `Failed to pair device: ${error.message}`);
      setCurrentStep('deviceList');
    } finally {
      setIsPairing(false);
    }
  };

  const handleModeSelected = (mode: PairingMode) => {
    setSelectedPairingMode(mode);
    if (mode === 'ble' || mode === 'combo') {
      setCurrentStep('scanning');
    } else if (mode === 'wifi-ez') {
      // WiFi EZ mode is handled by the PairingModeSelector component
      // We don't need to navigate away from mode selection
    }
  };

  const handleWiFiEzPairingComplete = (device: PairedDevice) => {
    setPairedDevice(device);
    setCurrentStep('success');
    onDevicePaired?.(device);
  };

  const resetPairingFlow = () => {
    setCurrentStep('modeSelection');
    setSelectedPairingMode(null);
    setIsScanning(false);
    setIsStopping(false);
    setScannedDevices([]);
    setSelectedDevice(null);
    setDeviceInfo(null);
    setPairedDevice(null);
    setWifiCredentials({ssid: '', password: ''});
    setPairingProgress('');
  };

  const renderScanningStep = () => (
    <View style={styles.container}>
      <View style={styles.scanningContainer}>
        {isScanning && <ActivityIndicator size="large" color="#007AFF" />}
        <Text style={styles.scanningText}>
          {isScanning ? 'Scanning for devices...' : 'Starting scan...'}
        </Text>
        <Text style={styles.scanningSubtext}>
          Using {selectedPairingMode?.toUpperCase()} pairing mode
        </Text>
        <Text style={styles.scanningSubtext}>
          Make sure your device is in pairing mode
        </Text>
        <Text style={styles.deviceCount}>
          Found {scannedDevices.length} device
          {scannedDevices.length !== 1 ? 's' : ''}
        </Text>

        {scannedDevices.length > 0 && (
          <TouchableOpacity
            style={styles.viewDevicesButton}
            onPress={() => {
              setCurrentStep('deviceList');
            }}>
            <Text style={styles.viewDevicesButtonText}>
              View Found Devices ({scannedDevices.length})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.stopButton,
            (!isScanning || isStopping) && styles.stopButtonDisabled,
          ]}
          onPress={stopScanning}
          disabled={!isScanning || isStopping}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.stopButtonText,
              (!isScanning || isStopping) && styles.stopButtonTextDisabled,
            ]}>
            {isStopping ? 'Stopping...' : 'Stop Scanning'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backToModeButton} onPress={handleBack}>
          <Text style={styles.backToModeButtonText}>
            Back to Mode Selection
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeviceItem = ({item}: {item: ScannedDevice}) => {
    const isBound = isDeviceBound(item);
    const pairingType = getDevicePairingType(item);
    const isShared = isSharedDevice(item);

    return (
      <TouchableOpacity
        style={[styles.deviceItem, isBound && styles.deviceItemBound]}
        onPress={() => handleDeviceSelect(item)}
        disabled={isBound}>
        <View style={styles.deviceHeader}>
          <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
          <View style={styles.deviceBadges}>
            <Text style={[styles.badge, styles.typeBadge]}>
              {pairingType.toUpperCase()}
            </Text>
            {isBound && (
              <Text style={[styles.badge, styles.boundBadge]}>BOUND</Text>
            )}
            {isShared && (
              <Text style={[styles.badge, styles.sharedBadge]}>SHARED</Text>
            )}
          </View>
        </View>
        <Text style={styles.deviceDetails}>
          RSSI: {item.rssi} dBm | Type: {item.deviceType}
        </Text>
        <Text style={styles.deviceDetails}>MAC: {item.mac}</Text>
        <Text style={styles.deviceDetails}>Product ID: {item.productId}</Text>
      </TouchableOpacity>
    );
  };

  const renderDeviceListStep = () => {
    // Show devices that match the selected mode, but also show other devices with a note
    const matchingDevices = scannedDevices.filter(device => {
      const devicePairingType = getDevicePairingType(device);
      return selectedPairingMode === devicePairingType;
    });

    const otherDevices = scannedDevices.filter(device => {
      const devicePairingType = getDevicePairingType(device);
      return selectedPairingMode !== devicePairingType;
    });

    const allDevicesForDisplay = [...matchingDevices, ...otherDevices];

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Found Devices</Text>
          <TouchableOpacity style={styles.rescanButton} onPress={startScanning}>
            <Text style={styles.rescanButtonText}>Rescan</Text>
          </TouchableOpacity>
        </View>

        {scannedDevices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No devices found</Text>
            <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
              <Text style={styles.scanButtonText}>Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backToModeButton}
              onPress={handleBack}>
              <Text style={styles.backToModeButtonText}>
                Change Pairing Mode
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {matchingDevices.length > 0 && (
              <Text style={styles.sectionHeader}>
                Compatible with {selectedPairingMode?.toUpperCase()} mode (
                {matchingDevices.length})
              </Text>
            )}
            {otherDevices.length > 0 && matchingDevices.length > 0 && (
              <Text style={styles.sectionHeader}>
                Other devices (different pairing mode) ({otherDevices.length})
              </Text>
            )}
            <FlatList
              data={allDevicesForDisplay}
              keyExtractor={item => item.uuid}
              renderItem={renderDeviceItem}
              contentContainerStyle={styles.deviceList}
            />
            {otherDevices.length > 0 && matchingDevices.length === 0 && (
              <View style={styles.modeHintContainer}>
                <Text style={styles.modeHintText}>
                  💡 These devices support a different pairing mode. Tap "Change
                  Pairing Mode" to select the correct mode.
                </Text>
                <TouchableOpacity
                  style={styles.backToModeButton}
                  onPress={handleBack}>
                  <Text style={styles.backToModeButtonText}>
                    Change Pairing Mode
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  const renderWiFiSetupStep = () => (
    <View style={styles.container}>
      <Text style={styles.title}>WiFi Setup</Text>
      <Text style={styles.subtitle}>
        {deviceInfo?.name || 'Device'} requires WiFi connection
      </Text>

      <View style={styles.form}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>WiFi Network (2.4GHz)</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              const prefillWiFiSSID = async () => {
                try {
                  const currentSSID = await getCurrentWiFiSSID();
                  if (currentSSID) {
                    setWifiCredentials(prev => ({
                      ...prev,
                      ssid: currentSSID,
                    }));
                  } else {
                    Alert.alert(
                      'Info',
                      'No WiFi network detected or unable to get SSID',
                    );
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to get current WiFi network');
                }
              };
              prefillWiFiSSID();
            }}>
            <Text style={styles.refreshButtonText}>🔄 Current</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={wifiCredentials.ssid}
          onChangeText={text =>
            setWifiCredentials(prev => ({...prev, ssid: text}))
          }
          placeholder="Enter WiFi SSID"
          autoCapitalize="none"
        />

        <Text style={styles.label}>WiFi Password</Text>
        <TextInput
          style={styles.input}
          value={wifiCredentials.password}
          onChangeText={text =>
            setWifiCredentials(prev => ({...prev, password: text}))
          }
          placeholder="Enter WiFi password"
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[
            styles.pairButton,
            (!wifiCredentials.ssid || !wifiCredentials.password) &&
              styles.pairButtonDisabled,
          ]}
          onPress={handleComboDevicePairing}
          disabled={
            !wifiCredentials.ssid || !wifiCredentials.password || isPairing
          }>
          <Text style={styles.pairButtonText}>Start Pairing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPairingStep = () => (
    <View style={styles.container}>
      <View style={styles.pairingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.pairingText}>Pairing Device</Text>
        <Text style={styles.pairingProgress}>{pairingProgress}</Text>
        <Text style={styles.pairingSubtext}>
          This may take up to 2 minutes...
        </Text>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.container}>
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Device Paired Successfully!</Text>
        <Text style={styles.successDevice}>
          {pairedDevice?.name || 'Unknown Device'}
        </Text>
        <Text style={styles.successDetails}>
          Device ID: {pairedDevice?.devId}
        </Text>

        <TouchableOpacity style={styles.doneButton} onPress={onBack}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pairAnotherButton}
          onPress={resetPairingFlow}>
          <Text style={styles.pairAnotherButtonText}>Pair Another Device</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'modeSelection':
        return (
          <PairingModeSelector
            activeHome={activeHome}
            onDevicePaired={handleWiFiEzPairingComplete}
            onModeSelected={handleModeSelected}
          />
        );
      case 'scanning':
        return renderScanningStep();
      case 'deviceList':
        return renderDeviceListStep();
      case 'wifiSetup':
        return renderWiFiSetupStep();
      case 'pairing':
        return renderPairingStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderDeviceListStep();
    }
  };

  const handleBack = async () => {
    console.log(
      'DevicePairingScreen: Back button pressed from step:',
      currentStep,
    );

    try {
      // Handle different back navigation based on current step
      switch (currentStep) {
        case 'modeSelection':
          // Go back to previous screen
          onBack?.();
          break;
        case 'scanning':
        case 'deviceList':
          // Stop scanning and go back to mode selection
          if (isScanning) {
            await manuallyStopScanning();
          }
          setCurrentStep('modeSelection');
          setSelectedPairingMode(null);
          break;
        case 'wifiSetup':
          // Go back to device list (for combo devices)
          setCurrentStep('deviceList');
          break;
        case 'pairing':
          // Can't go back during pairing, but stop scanning if needed
          if (isScanning) {
            await manuallyStopScanning();
          }
          break;
        case 'success':
          // Go back to previous screen
          onBack?.();
          break;
        default:
          onBack?.();
      }
    } catch (error) {
      console.error('Error handling back navigation:', error);
      // Always try to navigate back as fallback
      onBack?.();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#fff' : undefined}
        translucent={false}
      />
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Add Device</Text>
        <Text style={styles.homeInfo}>Home: {activeHome.name}</Text>
      </View>

      {renderCurrentStep()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  homeInfo: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
  },
  scanningSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  deviceCount: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 16,
    fontWeight: '500',
  },
  stopButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stopButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  stopButtonTextDisabled: {
    color: '#9CA3AF',
  },
  deviceList: {
    paddingVertical: 8,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  deviceItemBound: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  deviceBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  typeBadge: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
  },
  boundBadge: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  sharedBadge: {
    backgroundColor: '#F9FAFB',
    color: '#4B5563',
  },
  deviceDetails: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  rescanButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    marginTop: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  pairButton: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  pairButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  pairButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  pairingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pairingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
  },
  pairingProgress: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
  },
  pairingSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  successDevice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  successDetails: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 32,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  pairAnotherButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  pairAnotherButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  backToModeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  backToModeButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  viewDevicesButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewDevicesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  modeHintContainer: {
    backgroundColor: '#FEF3C7',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  modeHintText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
});

export default DevicePairingScreen;
