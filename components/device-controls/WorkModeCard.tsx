import React, {memo, useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {TUYA_DEVICE_COMMANDS} from '../../utils/TuyaDeviceCommandMappings';

interface WorkModeCardProps {
  currentMode: string;
  isOnline: boolean;
  onModeChange: (mode: string) => void;
}

const WorkModeCard: React.FC<WorkModeCardProps> = memo(
  ({currentMode, isOnline, onModeChange}) => {
    const command = TUYA_DEVICE_COMMANDS.work_mode;

    const handleModePress = useCallback(
      (mode: string) => {
        onModeChange(mode);
      },
      [onModeChange],
    );

    return (
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>{command.name}</Text>
        <View style={styles.modeContainer}>
          {command.options?.map(mode => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeButton,
                currentMode === mode && styles.modeButtonActive,
              ]}
              onPress={() => handleModePress(mode)}
              disabled={!isOnline}>
              <Text
                style={[
                  styles.modeButtonText,
                  currentMode === mode && styles.modeButtonTextActive,
                ]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
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
  modeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#2196F3',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
});

WorkModeCard.displayName = 'WorkModeCard';

export default WorkModeCard;
