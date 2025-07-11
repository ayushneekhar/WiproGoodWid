import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {NativeModules} from 'react-native';
import {DeviceBean, DeviceStatus} from '../types/TuyaTypes';
import {
  parseJavaHashMapString,
  TUYA_DEVICE_COMMANDS,
  createCommandPayload,
} from '../utils/TuyaDeviceCommandMappings';

const {TuyaModule, TuyaDeviceControlModule} = NativeModules;

interface TuyaDeviceControlsProps {
  devices: DeviceBean[];
  deviceStatuses: DeviceStatus[];
  listenedDevices: Set<string>;
  recentDevices: string[];
  isLoading: boolean;
  onSendCommand: (
    deviceId: string,
    command: Record<string, any>,
  ) => Promise<void>;
  onRegisterDeviceListener: (deviceId: string) => Promise<void>;
  onUnregisterDeviceListener: (deviceId: string) => Promise<void>;
  onToggleDeviceListener: (deviceId: string) => Promise<void>;
  onTurnDeviceOn: (deviceId: string) => Promise<void>;
  onTurnDeviceOff: (deviceId: string) => Promise<void>;
  onSetDeviceBrightness: (
    deviceId: string,
    brightness: number,
  ) => Promise<void>;
  onAddRecentDevice: (deviceId: string) => void;
  onRemoveRecentDevice: (deviceId: string) => void;
  onRefreshDevices?: () => Promise<void>;
  onNavigateToDetailedControl?: (
    device: DeviceBean,
    homeId: number,
    homeName: string,
  ) => void;
}

const TuyaDeviceControls: React.FC<TuyaDeviceControlsProps> = ({
  devices,
  deviceStatuses,
  listenedDevices,
  recentDevices,
  isLoading,
  onSendCommand,
  onRegisterDeviceListener,
  onUnregisterDeviceListener,
  onToggleDeviceListener,
  onTurnDeviceOn,
  onTurnDeviceOff,
  onSetDeviceBrightness,
  onAddRecentDevice,
  onRemoveRecentDevice,
  onRefreshDevices,
  onNavigateToDetailedControl,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const getDeviceStatus = (deviceId: string): DeviceStatus | undefined => {
    return deviceStatuses.find(status => status.devId === deviceId);
  };

  const isDeviceListened = (deviceId: string): boolean => {
    return listenedDevices.has(deviceId);
  };

  const isRecentDevice = (deviceId: string): boolean => {
    return recentDevices.includes(deviceId);
  };

  const handleRefresh = async () => {
    if (onRefreshDevices) {
      setRefreshing(true);
      try {
        await onRefreshDevices();
      } catch (error) {
        console.error('Error refreshing devices:', error);
      } finally {
        setRefreshing(false);
      }
    }
  };

  // Updated power toggle using TuyaDeviceControlModule
  const handleTogglePower = async (device: DeviceBean) => {
    try {
      const status = getDeviceStatus(device.devId);
      let isOn = false;

      if (status?.dpStr) {
        try {
          const parsedState = parseJavaHashMapString(status.dpStr);
          // Check for power state using correct dpIds
          isOn =
            parsedState['20'] === true ||
            parsedState['switch_led'] === true ||
            parsedState['1'] === true;
        } catch (parseError) {
          console.error(
            'Error parsing device state for power toggle:',
            parseError,
          );
        }
      }

      // Initialize device control
      await TuyaDeviceControlModule.initializeDeviceControl(device.devId);

      const command = TUYA_DEVICE_COMMANDS.switch_led;
      const payload = createCommandPayload(command, !isOn);
      await TuyaDeviceControlModule.sendCommand(payload);

      console.log(`Device ${device.devId} power toggled to ${!isOn}`);
    } catch (error: any) {
      console.error('Error toggling device power:', error);
      Alert.alert('Error', error.message || 'Failed to toggle device power');
    }
  };

  // Updated brightness change using TuyaDeviceControlModule
  const handleBrightnessChange = async (
    device: DeviceBean,
    brightness: number,
  ) => {
    try {
      // Initialize device control
      await TuyaDeviceControlModule.initializeDeviceControl(device.devId);

      const command = TUYA_DEVICE_COMMANDS.bright_value_v2;
      const payload = createCommandPayload(command, brightness);
      await TuyaDeviceControlModule.sendCommand(payload);

      console.log(`Device ${device.devId} brightness set to ${brightness}`);
    } catch (error: any) {
      console.error('Error setting brightness:', error);
      Alert.alert('Error', error.message || 'Failed to set brightness');
    }
  };

  // Updated color change using TuyaDeviceControlModule
  const handleColorChange = async (
    device: DeviceBean,
    color: {h: number; s: number; v: number},
  ) => {
    try {
      // Initialize device control
      await TuyaDeviceControlModule.initializeDeviceControl(device.devId);

      const command = TUYA_DEVICE_COMMANDS.colour_data_v2;
      const payload = createCommandPayload(command, color);
      await TuyaDeviceControlModule.sendCommand(payload);

      console.log(`Device ${device.devId} color changed to`, color);
    } catch (error: any) {
      console.error('Error changing color:', error);
      Alert.alert('Error', error.message || 'Failed to change color');
    }
  };

  // Handle card click to navigate to detailed control
  const handleCardPress = (device: DeviceBean) => {
    if (onNavigateToDetailedControl) {
      onNavigateToDetailedControl(device, 0, 'Current Home');
    }
  };

  const renderDeviceItem = ({item}: {item: DeviceBean}) => {
    const status = getDeviceStatus(item.devId);
    const isListened = isDeviceListened(item.devId);
    const isRecent = isRecentDevice(item.devId);

    let deviceState: any = {};
    if (status?.dpStr) {
      try {
        deviceState = parseJavaHashMapString(status.dpStr);
        console.log('Parsed device state:', deviceState);
      } catch (error) {
        console.error('Failed to parse device state:', error);
      }
    }

    // Updated to use correct dpIds
    const isOn =
      deviceState['20'] === true ||
      deviceState['switch_led'] === true ||
      deviceState['1'] === true;
    const brightness =
      deviceState['22'] ||
      deviceState['bright_value_v2'] ||
      deviceState['2'] ||
      500; // Default brightness value

    return (
      <TouchableOpacity
        style={styles.deviceCard}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.7}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>
              {item.name || `Device ${item.devId.slice(-6)}`}
            </Text>
            <Text style={styles.deviceId}>ID: {item.devId}</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIndicator,
                  {backgroundColor: item.isOnline ? '#4CAF50' : '#F44336'},
                ]}
              />
              <Text style={styles.statusText}>
                {item.isOnline ? 'Online' : 'Offline'}
              </Text>
              {isListened && (
                <Text style={styles.listeningText}>• Listening</Text>
              )}
              {isRecent && <Text style={styles.recentText}>• Recent</Text>}
            </View>
          </View>
        </View>

        {/* Advanced Control Button */}
        {onNavigateToDetailedControl && (
          <TouchableOpacity
            style={styles.detailedControlButton}
            onPress={e => {
              e.stopPropagation();
              onNavigateToDetailedControl(item, 0, 'Current Home');
            }}>
            <Text style={styles.detailedControlButtonText}>
              Advanced Controls
            </Text>
          </TouchableOpacity>
        )}

        {/* Device Controls */}
        <View style={styles.controlsContainer}>
          {/* Power Control */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Power:</Text>
            <TouchableOpacity
              style={[
                styles.powerButton,
                {backgroundColor: isOn ? '#4CAF50' : '#F44336'},
              ]}
              onPress={e => {
                e.stopPropagation();
                handleTogglePower(item);
              }}
              disabled={!item.isOnline}>
              <Text style={styles.buttonText}>{isOn ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          {/* Brightness Control */}
          {isOn && (
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Brightness:</Text>
              <View style={styles.brightnessControls}>
                {[250, 500, 750, 1000].map(value => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.brightnessButton,
                      {opacity: Math.abs(brightness - value) < 50 ? 1 : 0.6},
                    ]}
                    onPress={e => {
                      e.stopPropagation();
                      handleBrightnessChange(item, value);
                    }}
                    disabled={!item.isOnline}>
                    <Text style={styles.brightnessText}>
                      {Math.round((value / 1000) * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Color Control */}
          {isOn && (
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Colors:</Text>
              <View style={styles.colorControls}>
                <TouchableOpacity
                  style={[styles.colorButton, {backgroundColor: '#2196F3'}]}
                  onPress={e => {
                    e.stopPropagation();
                    handleColorChange(item, {h: 240, s: 1000, v: 1000});
                  }}
                  disabled={!item.isOnline}>
                  <Text style={styles.colorText}>Blue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.colorButton, {backgroundColor: '#F44336'}]}
                  onPress={e => {
                    e.stopPropagation();
                    handleColorChange(item, {h: 0, s: 1000, v: 1000});
                  }}
                  disabled={!item.isOnline}>
                  <Text style={styles.colorText}>Red</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.colorButton, {backgroundColor: '#4CAF50'}]}
                  onPress={e => {
                    e.stopPropagation();
                    handleColorChange(item, {h: 120, s: 1000, v: 1000});
                  }}
                  disabled={!item.isOnline}>
                  <Text style={styles.colorText}>Green</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Listener Control */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Monitoring:</Text>
            <TouchableOpacity
              style={[
                styles.listenerButton,
                {backgroundColor: isListened ? '#FF9800' : '#6B7280'},
              ]}
              onPress={e => {
                e.stopPropagation();
                onToggleDeviceListener(item.devId);
              }}>
              <Text style={styles.buttonText}>
                {isListened ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Device Status Details */}
        {status && (
          <View style={styles.statusDetails}>
            <Text style={styles.statusLabel}>
              Last Update: {status.lastUpdate}
            </Text>
            {status.dpStr && (
              <Text style={styles.statusLabel}>
                State: {JSON.stringify(deviceState, null, 2)}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (devices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No devices found in this home</Text>
        <Text style={styles.emptySubtext}>
          Try pairing some devices first or refresh to check for updates
        </Text>
        {onRefreshDevices && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh Devices</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={devices}
        keyExtractor={item => item.devId}
        renderItem={renderDeviceItem}
        style={styles.deviceList}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          onRefreshDevices ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2196F3']}
              tintColor="#2196F3"
            />
          ) : undefined
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Updating devices...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  deviceList: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  deviceHeader: {
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  listeningText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 8,
  },
  recentText: {
    fontSize: 12,
    color: '#9C27B0',
    marginLeft: 8,
  },
  controlsContainer: {
    marginBottom: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    width: 80,
  },
  powerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  brightnessControls: {
    flexDirection: 'row',
    flex: 1,
  },
  brightnessButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  brightnessText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  colorControls: {
    flexDirection: 'row',
    flex: 1,
  },
  colorButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  colorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  listenerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  detailedControlButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  detailedControlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TuyaDeviceControls;
