import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import useTuyaPairing from '../utils/useTuyaPairing';
import {ScannedDevice, HomeBean} from '../types/TuyaTypes';

interface SimplePairingExampleProps {
  activeHome: HomeBean;
}

const SimplePairingExample: React.FC<SimplePairingExampleProps> = ({
  activeHome,
}) => {
  const {
    // State
    isScanning,
    scannedDevices,
    scanError,
    isPairing,
    pairingProgress,
    pairingError,
    pairedDevice,

    // Methods
    startScanning,
    stopScanning,
    pairBleDevice,
    pairComboDevice,
    getDevicePairingType,
    isDeviceBound,
    reset,
    clearErrors,
  } = useTuyaPairing(activeHome.homeId, {
    onDevicePaired: device => {
      Alert.alert(
        'Success!',
        `Device ${device.name} has been paired successfully!`,
      );
    },
    onError: error => {
      Alert.alert('Error', error.message);
    },
  });

  const handleDevicePress = async (device: ScannedDevice) => {
    if (isDeviceBound(device)) {
      Alert.alert(
        'Already Paired',
        'This device is already paired to another account.',
      );
      return;
    }

    const pairingType = getDevicePairingType(device);

    if (pairingType === 'ble') {
      // For BLE devices, pair directly
      try {
        await pairBleDevice(device);
      } catch (error) {
        console.error('Pairing failed:', error);
      }
    } else {
      // For combo devices, prompt for WiFi credentials
      Alert.prompt(
        'WiFi Setup',
        'Enter WiFi SSID:',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Next',
            onPress: ssid => {
              if (!ssid) return;
              Alert.prompt(
                'WiFi Setup',
                'Enter WiFi Password:',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'Pair',
                    onPress: async password => {
                      if (!password) return;
                      try {
                        await pairComboDevice(device, {ssid, password});
                      } catch (error) {
                        console.error('Pairing failed:', error);
                      }
                    },
                  },
                ],
                'secure-text',
              );
            },
          },
        ],
        'plain-text',
      );
    }
  };

  const renderDevice = ({item}: {item: ScannedDevice}) => {
    const isBound = isDeviceBound(item);
    const pairingType = getDevicePairingType(item);

    return (
      <TouchableOpacity
        style={[styles.deviceItem, isBound && styles.deviceBound]}
        onPress={() => handleDevicePress(item)}
        disabled={isBound || isPairing}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
          <Text style={styles.deviceType}>
            Type: {pairingType.toUpperCase()} | RSSI: {item.rssi}dBm
          </Text>
          <Text style={styles.deviceId}>UUID: {item.uuid}</Text>
        </View>
        {isBound && (
          <View style={styles.boundBadge}>
            <Text style={styles.boundText}>BOUND</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isPairing) {
    return (
      <View style={styles.container}>
        <View style={styles.pairingContainer}>
          <Text style={styles.pairingTitle}>Pairing Device...</Text>
          <Text style={styles.pairingProgress}>{pairingProgress}</Text>
          <TouchableOpacity style={styles.button} onPress={reset}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (pairedDevice) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>✅ Device Paired!</Text>
          <Text style={styles.deviceName}>{pairedDevice.name}</Text>
          <Text style={styles.deviceId}>ID: {pairedDevice.devId}</Text>
          <TouchableOpacity style={styles.button} onPress={reset}>
            <Text style={styles.buttonText}>Pair Another Device</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Pairing</Text>
        <Text style={styles.subtitle}>Home: {activeHome.name}</Text>
      </View>

      {!isScanning && scannedDevices.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No devices found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => startScanning()}>
            <Text style={styles.buttonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      )}

      {isScanning && (
        <View style={styles.scanningState}>
          <Text style={styles.scanningText}>
            Scanning... ({scannedDevices.length} found)
          </Text>
          <TouchableOpacity style={styles.button} onPress={stopScanning}>
            <Text style={styles.buttonText}>Stop Scanning</Text>
          </TouchableOpacity>
        </View>
      )}

      {scannedDevices.length > 0 && (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              Found {scannedDevices.length} device
              {scannedDevices.length !== 1 ? 's' : ''}
            </Text>
            {!isScanning && (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => startScanning()}>
                <Text style={styles.rescanText}>Rescan</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={scannedDevices}
            keyExtractor={item => item.uuid}
            renderItem={renderDevice}
            style={styles.deviceList}
          />
        </>
      )}

      {(scanError || pairingError) && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{scanError || pairingError}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={clearErrors}>
            <Text style={styles.errorButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 20,
  },
  scanningState: {
    padding: 20,
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 18,
    color: '#007AFF',
    marginBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  rescanButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rescanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceBound: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  deviceId: {
    fontSize: 12,
    color: '#adb5bd',
  },
  boundBadge: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  boundText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pairingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pairingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  pairingProgress: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#721c24',
    flex: 1,
    fontSize: 14,
  },
  errorButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SimplePairingExample;
