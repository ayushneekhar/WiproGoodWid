import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  PairingMode,
  HomeBean,
  PairedDevice,
  WiFiEzPairingParams,
  WiFiEzPairingStep,
} from '../types/TuyaTypes';
import {
  getEzPairingToken,
  startEzPairing,
  stopEzPairing,
  addEzStepListener,
  removeEzStepListener,
  getEzStepDescription,
} from '../utils/TuyaWiFiEzPairingUtils';
import {getCurrentWiFiSSID} from '../utils/TuyaPairingUtils';

interface PairingModeSelectorProps {
  activeHome: HomeBean;
  onDevicePaired?: (device: PairedDevice) => void;
  onModeSelected?: (mode: PairingMode) => void;
}

interface WiFiCredentials {
  ssid: string;
  password: string;
}

const PairingModeSelector: React.FC<PairingModeSelectorProps> = ({
  activeHome,
  onDevicePaired,
  onModeSelected,
}) => {
  const [selectedMode, setSelectedMode] = useState<PairingMode | null>(null);
  const [wifiCredentials, setWifiCredentials] = useState<WiFiCredentials>({
    ssid: '',
    password: '',
  });
  const [isEzPairing, setIsEzPairing] = useState(false);
  const [ezPairingStep, setEzPairingStep] = useState<WiFiEzPairingStep | null>(
    null,
  );
  const [ezPairingProgress, setEzPairingProgress] = useState('');

  const handleModeSelection = (mode: PairingMode) => {
    setSelectedMode(mode);
    onModeSelected?.(mode);
  };

  // Prefill WiFi SSID when WiFi EZ mode is selected
  useEffect(() => {
    if (selectedMode === 'wifi-ez') {
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
  }, [selectedMode]);

  const handleEzStepUpdate = (step: WiFiEzPairingStep, data?: any) => {
    setEzPairingStep(step);
    setEzPairingProgress(getEzStepDescription(step));
  };

  const startWiFiEzPairing = async () => {
    if (!wifiCredentials.ssid || !wifiCredentials.password) {
      Alert.alert('Missing Information', 'Please provide WiFi credentials');
      return;
    }

    setIsEzPairing(true);
    setEzPairingStep('getting_token');
    setEzPairingProgress('Getting pairing token...');

    try {
      // Add step listener
      addEzStepListener(handleEzStepUpdate);

      // Get pairing token
      const token = await getEzPairingToken(activeHome.homeId);

      // Start EZ pairing
      const ezParams: WiFiEzPairingParams = {
        homeId: activeHome.homeId,
        ssid: wifiCredentials.ssid,
        password: wifiCredentials.password,
        token: token,
        timeout: 120, // 2 minutes
      };

      const pairedDevice = await startEzPairing(ezParams);

      setEzPairingStep('success');
      setEzPairingProgress('Device paired successfully!');

      Alert.alert(
        'Success',
        `Device "${pairedDevice.name}" has been paired successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              onDevicePaired?.(pairedDevice);
              resetForm();
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('WiFi EZ pairing failed:', error);
      Alert.alert(
        'Pairing Failed',
        `WiFi EZ pairing failed: ${error.message}`,
        [
          {
            text: 'OK',
            onPress: () => resetForm(),
          },
        ],
      );
    } finally {
      removeEzStepListener(handleEzStepUpdate);
      setIsEzPairing(false);
    }
  };

  const stopWiFiEzPairing = async () => {
    try {
      await stopEzPairing();
      removeEzStepListener(handleEzStepUpdate);
      setIsEzPairing(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to stop WiFi EZ pairing:', error);
    }
  };

  const resetForm = () => {
    setSelectedMode(null);
    setWifiCredentials({ssid: '', password: ''});
    setEzPairingStep(null);
    setEzPairingProgress('');
  };

  const renderModeSelection = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Pairing Method</Text>
      <Text style={styles.subtitle}>
        Select how you want to add your device to {activeHome.name}
      </Text>

      <ScrollView style={styles.modeList}>
        <TouchableOpacity
          style={styles.modeOption}
          onPress={() => handleModeSelection('ble')}>
          <Text style={styles.modeTitle}>🔵 Bluetooth LE Pairing</Text>
          <Text style={styles.modeDescription}>
            For devices that support Bluetooth pairing only. Scan for nearby
            devices and pair directly via Bluetooth.
          </Text>
          <Text style={styles.modeNote}>
            • Device should be in pairing mode • Best for simple devices • No
            WiFi setup required
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modeOption}
          onPress={() => handleModeSelection('combo')}>
          <Text style={styles.modeTitle}>🔗 Combo Pairing (BLE + WiFi)</Text>
          <Text style={styles.modeDescription}>
            For devices that need both Bluetooth discovery and WiFi connection.
            Scan via Bluetooth first, then configure WiFi.
          </Text>
          <Text style={styles.modeNote}>
            • Device should be in pairing mode • Requires 2.4GHz WiFi network •
            More reliable for smart devices
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modeOption}
          onPress={() => handleModeSelection('wifi-ez')}>
          <Text style={styles.modeTitle}>📶 WiFi EZ Mode (SmartConfig)</Text>
          <Text style={styles.modeDescription}>
            Direct WiFi pairing without Bluetooth scanning. Device connects
            directly to your WiFi network using broadcast credentials.
          </Text>
          <Text style={styles.modeNote}>
            • Device should be blinking rapidly • Only requires WiFi credentials
            • Works from anywhere in WiFi range
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderWiFiEzSetup = () => (
    <View style={styles.container}>
      <Text style={styles.title}>WiFi EZ Mode Setup</Text>
      <Text style={styles.subtitle}>
        Make sure your device is in pairing mode (usually rapid blinking LED)
      </Text>

      {!isEzPairing ? (
        <View style={styles.form}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>WiFi Network (2.4GHz only)</Text>
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

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedMode(null)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pairButton,
                (!wifiCredentials.ssid || !wifiCredentials.password) &&
                  styles.pairButtonDisabled,
              ]}
              onPress={startWiFiEzPairing}
              disabled={!wifiCredentials.ssid || !wifiCredentials.password}>
              <Text style={styles.pairButtonText}>Start Pairing</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.pairingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.pairingText}>WiFi EZ Pairing in Progress</Text>
          <Text style={styles.pairingProgress}>{ezPairingProgress}</Text>

          {ezPairingStep && (
            <Text style={styles.pairingStep}>
              Step: {ezPairingStep.replace('_', ' ').toUpperCase()}
            </Text>
          )}

          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopWiFiEzPairing}>
            <Text style={styles.stopButtonText}>Stop Pairing</Text>
          </TouchableOpacity>

          <Text style={styles.pairingInstructions}>
            Instructions:{'\n'}
            1. Ensure device is in pairing mode (rapid blinking){'\n'}
            2. Keep device close to your phone{'\n'}
            3. Wait for automatic discovery and pairing
          </Text>
        </View>
      )}
    </View>
  );

  if (selectedMode === 'wifi-ez') {
    return renderWiFiEzSetup();
  }

  return renderModeSelection();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  modeList: {
    flex: 1,
  },
  modeOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  modeNote: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    borderRadius: 8,
    marginRight: 10,
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pairButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
  },
  pairButtonDisabled: {
    backgroundColor: '#ccc',
  },
  pairButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pairingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pairingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  pairingProgress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  pairingStep: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pairingInstructions: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 20,
  },
});

export default PairingModeSelector;
