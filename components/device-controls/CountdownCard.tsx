import React, {memo, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import {
  TUYA_DEVICE_COMMANDS,
  COUNTDOWN_PRESETS,
} from '../../utils/TuyaDeviceCommandMappings';

interface CountdownCardProps {
  currentCountdown: number;
  isOnline: boolean;
  onCountdownChange: (seconds: number) => void;
}

const CountdownCard: React.FC<CountdownCardProps> = memo(
  ({currentCountdown, isOnline, onCountdownChange}) => {
    const command = TUYA_DEVICE_COMMANDS.countdown_1;
    const [showCountdownPicker, setShowCountdownPicker] = useState(false);
    const [customCountdown, setCustomCountdown] = useState('');

    const handleCountdownPress = useCallback(() => {
      setShowCountdownPicker(true);
    }, []);

    const handlePresetSelect = useCallback(
      (seconds: number) => {
        onCountdownChange(seconds);
        setShowCountdownPicker(false);
      },
      [onCountdownChange],
    );

    const handleCustomCountdown = useCallback(() => {
      const minutes = parseInt(customCountdown, 10);
      if (minutes > 0) {
        onCountdownChange(minutes * 60);
        setCustomCountdown('');
        setShowCountdownPicker(false);
      }
    }, [customCountdown, onCountdownChange]);

    const handleModalClose = useCallback(() => {
      setShowCountdownPicker(false);
      setCustomCountdown('');
    }, []);

    const formatTime = useCallback((seconds: number) => {
      if (seconds <= 0) return 'No timer set';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes
          .toString()
          .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      } else {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
    }, []);

    return (
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>{command.name}</Text>
        <Text style={styles.countdownStatus}>
          Timer: {formatTime(currentCountdown)}
        </Text>
        <TouchableOpacity
          style={styles.countdownPickerButton}
          onPress={handleCountdownPress}
          disabled={!isOnline}>
          <Text style={styles.countdownPickerButtonText}>Set Timer</Text>
        </TouchableOpacity>

        <Modal
          visible={showCountdownPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={handleModalClose}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Set Countdown Timer</Text>
              <View style={styles.countdownGrid}>
                {COUNTDOWN_PRESETS.map((preset, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.countdownPreset}
                    onPress={() => handlePresetSelect(preset.seconds)}>
                    <Text style={styles.countdownPresetText}>
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customCountdownSection}>
                <Text style={styles.customCountdownLabel}>
                  Custom (minutes):
                </Text>
                <TextInput
                  style={styles.customCountdownInput}
                  value={customCountdown}
                  onChangeText={setCustomCountdown}
                  placeholder="Enter minutes"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.customCountdownButton}
                  onPress={handleCustomCountdown}>
                  <Text style={styles.customCountdownButtonText}>Set</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleModalClose}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  },
);

const {width} = Dimensions.get('window');

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
  countdownStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  countdownPickerButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  countdownPickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: width - 40,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  countdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  countdownPreset: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  countdownPresetText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  customCountdownSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  customCountdownLabel: {
    fontSize: 14,
    color: '#333',
  },
  customCountdownInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  customCountdownButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customCountdownButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

CountdownCard.displayName = 'CountdownCard';

export default CountdownCard;
