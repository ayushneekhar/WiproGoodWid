import React, {memo, useState, useCallback, useEffect} from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import Slider from '@react-native-community/slider';
import {TUYA_DEVICE_COMMANDS} from '../../utils/TuyaDeviceCommandMappings';

interface ColorTemperatureCardProps {
  currentTemp: number;
  isOnline: boolean;
  onTemperatureChange: (temp: number) => void;
}

const ColorTemperatureCard: React.FC<ColorTemperatureCardProps> = memo(
  ({currentTemp, isOnline, onTemperatureChange}) => {
    const command = TUYA_DEVICE_COMMANDS.temp_value_v2;

    // Local state for immediate UI feedback
    const [localTemp, setLocalTemp] = useState(currentTemp);

    // Update local state when prop changes (from external updates)
    useEffect(() => {
      setLocalTemp(currentTemp);
    }, [currentTemp]);

    const getTemperatureLabel = useCallback((temp: number) => {
      if (temp <= 300) return 'Warm';
      if (temp >= 700) return 'Cool';
      return 'Neutral';
    }, []);

    // Handle slider value changes (immediate UI feedback)
    const handleSliderChange = useCallback((value: number) => {
      const roundedValue = Math.round(value);
      setLocalTemp(roundedValue);
    }, []);

    // Handle when user finishes sliding (send command)
    const handleSlidingComplete = useCallback(
      (value: number) => {
        const roundedValue = Math.round(value);
        setLocalTemp(roundedValue);
        onTemperatureChange(roundedValue);
      },
      [onTemperatureChange],
    );

    return (
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>{command.name}</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            {getTemperatureLabel(localTemp)} ({localTemp})
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={command.range?.min || 0}
            maximumValue={command.range?.max || 1000}
            value={localTemp}
            onValueChange={handleSliderChange}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor="#ff6b35"
            maximumTrackTintColor="#6bb6ff"
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

ColorTemperatureCard.displayName = 'ColorTemperatureCard';

export default ColorTemperatureCard;
