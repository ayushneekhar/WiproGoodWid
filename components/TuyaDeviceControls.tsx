import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {NativeModules} from 'react-native';

const {TuyaModule} = NativeModules;

interface TuyaDeviceControlsProps {
  deviceId: string;
  deviceType: 'light' | 'switch' | 'fan' | 'dimmer';
}

export const TuyaDeviceControls: React.FC<TuyaDeviceControlsProps> = ({
  deviceId,
  deviceType,
}) => {
  const sendCommand = async (command: object) => {
    if (!deviceId) {
      Alert.alert('Error', 'Device ID is required');
      return;
    }

    try {
      await TuyaModule.publishDps(deviceId, JSON.stringify(command));
      Alert.alert('Success', 'Command sent successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send command');
    }
  };

  const renderLightControls = () => (
    <View style={styles.controlGroup}>
      <Text style={styles.deviceTypeTitle}>Light Controls</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.onButton]}
          onPress={() => sendCommand({'1': true})}>
          <Text style={styles.buttonText}>Turn On</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.offButton]}
          onPress={() => sendCommand({'1': false})}>
          <Text style={styles.buttonText}>Turn Off</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.colorButton]}
          onPress={() => sendCommand({'5': '007eff0000ff'})}>
          <Text style={styles.buttonText}>Blue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.colorButton]}
          onPress={() => sendCommand({'5': 'ff00000000ff'})}>
          <Text style={styles.buttonText}>Red</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSwitchControls = () => (
    <View style={styles.controlGroup}>
      <Text style={styles.deviceTypeTitle}>Switch Controls</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.onButton]}
          onPress={() => sendCommand({'1': true})}>
          <Text style={styles.buttonText}>Turn On</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.offButton]}
          onPress={() => sendCommand({'1': false})}>
          <Text style={styles.buttonText}>Turn Off</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFanControls = () => (
    <View style={styles.controlGroup}>
      <Text style={styles.deviceTypeTitle}>Fan Controls</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.onButton]}
          onPress={() => sendCommand({'1': true})}>
          <Text style={styles.buttonText}>Turn On</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.offButton]}
          onPress={() => sendCommand({'1': false})}>
          <Text style={styles.buttonText}>Turn Off</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.speedButton]}
          onPress={() => sendCommand({'3': '1'})}>
          <Text style={styles.buttonText}>Low</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.speedButton]}
          onPress={() => sendCommand({'3': '2'})}>
          <Text style={styles.buttonText}>Medium</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.speedButton]}
          onPress={() => sendCommand({'3': '3'})}>
          <Text style={styles.buttonText}>High</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDimmerControls = () => (
    <View style={styles.controlGroup}>
      <Text style={styles.deviceTypeTitle}>Dimmer Controls</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.onButton]}
          onPress={() => sendCommand({'1': true})}>
          <Text style={styles.buttonText}>Turn On</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.offButton]}
          onPress={() => sendCommand({'1': false})}>
          <Text style={styles.buttonText}>Turn Off</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.dimButton]}
          onPress={() => sendCommand({'2': 250})}>
          <Text style={styles.buttonText}>25%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.dimButton]}
          onPress={() => sendCommand({'2': 500})}>
          <Text style={styles.buttonText}>50%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.dimButton]}
          onPress={() => sendCommand({'2': 750})}>
          <Text style={styles.buttonText}>75%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.dimButton]}
          onPress={() => sendCommand({'2': 1000})}>
          <Text style={styles.buttonText}>100%</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderControls = () => {
    switch (deviceType) {
      case 'light':
        return renderLightControls();
      case 'switch':
        return renderSwitchControls();
      case 'fan':
        return renderFanControls();
      case 'dimmer':
        return renderDimmerControls();
      default:
        return (
          <Text style={styles.errorText}>
            Unknown device type: {deviceType}
          </Text>
        );
    }
  };

  return <View style={styles.container}>{renderControls()}</View>;
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  controlGroup: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  deviceTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  onButton: {
    backgroundColor: '#4CAF50',
  },
  offButton: {
    backgroundColor: '#F44336',
  },
  colorButton: {
    backgroundColor: '#9C27B0',
  },
  speedButton: {
    backgroundColor: '#2196F3',
  },
  dimButton: {
    backgroundColor: '#FF9800',
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default TuyaDeviceControls;
