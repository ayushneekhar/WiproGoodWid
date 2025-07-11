import React, {memo, useState, useCallback, useEffect} from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import Slider from '@react-native-community/slider';
import {TUYA_DEVICE_COMMANDS} from '../../utils/TuyaDeviceCommandMappings';

interface BrightnessCardProps {
  currentBrightness: number;
  isOnline: boolean;
  onBrightnessChange: (brightness: number) => void;
}

const BrightnessCard: React.FC<BrightnessCardProps> = memo(
  ({currentBrightness, isOnline, onBrightnessChange}) => {
    const command = TUYA_DEVICE_COMMANDS.bright_value_v2;

    // Local state for immediate UI feedback
    const [localBrightness, setLocalBrightness] = useState(currentBrightness);

    // Update local state when prop changes (from external updates)
    useEffect(() => {
      setLocalBrightness(currentBrightness);
    }, [currentBrightness]);

    // Handle slider value changes (immediate UI feedback)
    const handleSliderChange = useCallback((value: number) => {
      const roundedValue = Math.round(value);
      setLocalBrightness(roundedValue);
    }, []);

    // Handle when user finishes sliding (send command)
    const handleSlidingComplete = useCallback(
      (value: number) => {
        const roundedValue = Math.round(value);
        setLocalBrightness(roundedValue);
        onBrightnessChange(roundedValue);
      },
      [onBrightnessChange],
    );

    const getPercentage = useCallback((value: number) => {
      return Math.round((value / 1000) * 100);
    }, []);

    return (
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>{command.name}</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            {getPercentage(localBrightness)}% ({localBrightness})
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={command.range?.min || 10}
            maximumValue={command.range?.max || 1000}
            value={localBrightness}
            onValueChange={handleSliderChange}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor="#1fb28a"
            maximumTrackTintColor="#d3d3d3"
            thumbStyle={styles.sliderThumb}
            trackStyle={styles.sliderTrack}
            disabled={!isOnline}
            step={10} // Add step for smoother performance
          />
        </View>
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
  sliderContainer: {
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  slider: {
    width: width - 72,
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#2196F3',
    width: 20,
    height: 20,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
});

BrightnessCard.displayName = 'BrightnessCard';

export default BrightnessCard;
