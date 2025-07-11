import React, {memo, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import {
  TUYA_DEVICE_COMMANDS,
  COLOR_PRESETS,
} from '../../utils/TuyaDeviceCommandMappings';

interface ColorControlCardProps {
  isOnline: boolean;
  onColorChange: (color: {h: number; s: number; v: number}) => void;
}

const ColorControlCard: React.FC<ColorControlCardProps> = memo(
  ({isOnline, onColorChange}) => {
    const command = TUYA_DEVICE_COMMANDS.colour_data_v2;
    const [showColorPicker, setShowColorPicker] = useState(false);

    const handleColorPress = useCallback(() => {
      setShowColorPicker(true);
    }, []);

    const handleColorSelect = useCallback(
      (color: {h: number; s: number; v: number}) => {
        onColorChange(color);
        setShowColorPicker(false);
      },
      [onColorChange],
    );

    const handleModalClose = useCallback(() => {
      setShowColorPicker(false);
    }, []);

    const hsvToRgb = useCallback((h: number, s: number, v: number): string => {
      const c = v * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = v - c;

      let r, g, b;
      if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
      } else if (h >= 60 && h < 120) {
        r = x;
        g = c;
        b = 0;
      } else if (h >= 120 && h < 180) {
        r = 0;
        g = c;
        b = x;
      } else if (h >= 180 && h < 240) {
        r = 0;
        g = x;
        b = c;
      } else if (h >= 240 && h < 300) {
        r = x;
        g = 0;
        b = c;
      } else {
        r = c;
        g = 0;
        b = x;
      }

      r = Math.round((r + m) * 255);
      g = Math.round((g + m) * 255);
      b = Math.round((b + m) * 255);

      return `rgb(${r}, ${g}, ${b})`;
    }, []);

    return (
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>{command.name}</Text>
        <TouchableOpacity
          style={styles.colorPickerButton}
          onPress={handleColorPress}
          disabled={!isOnline}>
          <Text style={styles.colorPickerButtonText}>Choose Color</Text>
        </TouchableOpacity>

        <Modal
          visible={showColorPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={handleModalClose}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Color</Text>
              <View style={styles.colorGrid}>
                {COLOR_PRESETS.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorPreset,
                      {
                        backgroundColor: hsvToRgb(
                          color.h,
                          color.s / 1000,
                          color.v / 1000,
                        ),
                      },
                    ]}
                    onPress={() => handleColorSelect(color)}>
                    <Text style={styles.colorPresetText}>{color.name}</Text>
                  </TouchableOpacity>
                ))}
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
  colorPickerButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  colorPickerButtonText: {
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  colorPreset: {
    width: 80,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  colorPresetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
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

ColorControlCard.displayName = 'ColorControlCard';

export default ColorControlCard;
