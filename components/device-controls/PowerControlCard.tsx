import React, {memo} from 'react';
import {View, Text, StyleSheet, Switch} from 'react-native';
import {TUYA_DEVICE_COMMANDS} from '../../utils/TuyaDeviceCommandMappings';

interface PowerControlCardProps {
  isOn: boolean;
  isOnline: boolean;
  onToggle: (value: boolean) => void;
}

const PowerControlCard: React.FC<PowerControlCardProps> = memo(
  ({isOn, isOnline, onToggle}) => {
    const command = TUYA_DEVICE_COMMANDS.switch_led;

    return (
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>{command.name}</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>{isOn ? 'ON' : 'OFF'}</Text>
          <Switch
            value={isOn}
            onValueChange={onToggle}
            trackColor={{false: '#767577', true: '#81b0ff'}}
            thumbColor={isOn ? '#f5dd4b' : '#f4f3f4'}
            disabled={!isOnline}
          />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  controlSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

PowerControlCard.displayName = 'PowerControlCard';

export default PowerControlCard;
