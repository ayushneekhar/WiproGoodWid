// NOTE: This component requires react-native-geolocation-service for GPS functionality
// To install: npm install react-native-geolocation-service
// Alternative: Use CreateHomeScreen-fallback.tsx which uses built-in React Native geolocation

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import TuyaHomeModule from '../utils/TuyaHomeModule';
import {HomeBean} from '../types/TuyaTypes';

interface CreateHomeScreenProps {
  onHomeCreated: (home: HomeBean) => void;
  onCancel?: () => void;
}

const CreateHomeScreen: React.FC<CreateHomeScreenProps> = ({
  onHomeCreated,
  onCancel,
}) => {
  const [homeName, setHomeName] = useState('');
  const [geoName, setGeoName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [rooms, setRooms] = useState(['Living Room', 'Bedroom', 'Kitchen']);
  const [newRoom, setNewRoom] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Remove automatic location fetching on mount
  // User will explicitly request location via button

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'This app needs access to your location to set up your home.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    // For iOS, permission is requested automatically when getting location
    return true;
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      // Using a simple reverse geocoding service
      // In production, you might want to use Google Maps API or similar
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      );
      const data = await response.json();

      if (data.city && data.countryName) {
        return `${data.city}, ${data.countryName}`;
      } else if (data.locality && data.countryName) {
        return `${data.locality}, ${data.countryName}`;
      } else if (data.countryName) {
        return data.countryName;
      } else {
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);

    try {
      // Check and request location permission
      const hasPermission = await requestLocationPermission();

      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to automatically set your home location. You can manually enter coordinates.',
          [{text: 'OK'}],
        );
        setIsGettingLocation(false);
        return;
      }

      // Get current position
      Geolocation.getCurrentPosition(
        async position => {
          try {
            const {latitude, longitude} = position.coords;
            console.log('Got location:', latitude, longitude);

            setLatitude(latitude.toString());
            setLongitude(longitude.toString());

            // Get human-readable location name
            const locationName = await reverseGeocode(latitude, longitude);
            setGeoName(locationName);

            console.log('Location set to:', locationName);
          } catch (error) {
            console.error('Error processing location:', error);
          } finally {
            setIsGettingLocation(false);
          }
        },
        error => {
          console.error('Geolocation error:', error);

          let errorMessage = 'Could not get your current location.';
          switch (error.code) {
            case 1:
              errorMessage =
                'Location permission denied. Please enable location services.';
              break;
            case 2:
              errorMessage =
                'Location unavailable. Please check your GPS settings.';
              break;
            case 3:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }

          Alert.alert(
            'Location Error',
            `${errorMessage} You can manually enter your coordinates.`,
            [{text: 'OK'}],
          );

          setIsGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          showLocationDialog: true,
          forceRequestLocation: true,
        },
      );
    } catch (error) {
      console.error('Location permission error:', error);
      Alert.alert(
        'Error',
        'Failed to request location permission. You can manually enter coordinates.',
        [{text: 'OK'}],
      );
      setIsGettingLocation(false);
    }
  };

  const addRoom = () => {
    if (newRoom.trim() && !rooms.includes(newRoom.trim())) {
      setRooms([...rooms, newRoom.trim()]);
      setNewRoom('');
    }
  };

  const removeRoom = (roomToRemove: string) => {
    setRooms(rooms.filter(room => room !== roomToRemove));
  };

  const validateForm = (): boolean => {
    if (!homeName.trim()) {
      Alert.alert('Error', 'Please enter a home name');
      return false;
    }
    if (homeName.length > 25) {
      Alert.alert('Error', 'Home name must be 25 characters or less');
      return false;
    }
    if (!geoName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return false;
    }
    if (!latitude || !longitude) {
      Alert.alert('Error', 'Please provide valid coordinates');
      return false;
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (
      isNaN(lat) ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      Alert.alert(
        'Error',
        'Please provide valid latitude (-90 to 90) and longitude (-180 to 180)',
      );
      return false;
    }
    if (rooms.length === 0) {
      Alert.alert('Error', 'Please add at least one room');
      return false;
    }
    return true;
  };

  const handleCreateHome = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      console.log('Creating home with:', {
        name: homeName,
        lat,
        lon,
        geoName,
        rooms,
      });

      // Create the home
      const homeId = await TuyaHomeModule.createHome(
        homeName.trim(),
        lon,
        lat,
        geoName.trim(),
        rooms,
      );

      console.log('Home created successfully with ID:', homeId);

      // Get the full details of the newly created home
      const homeDetails = await TuyaHomeModule.getHomeDetail(homeId);

      Alert.alert('Success', `Home "${homeName}" created successfully!`, [
        {
          text: 'OK',
          onPress: () => onHomeCreated(homeDetails),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating home:', error);
      Alert.alert(
        'Error',
        `Failed to create home: ${error.message || 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoomList = () => (
    <View style={styles.roomSection}>
      <Text style={styles.label}>Rooms</Text>
      <View style={styles.roomAddContainer}>
        <TextInput
          style={[styles.input, styles.roomInput]}
          placeholder="Enter room name"
          value={newRoom}
          onChangeText={setNewRoom}
          onSubmitEditing={addRoom}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addRoomButton} onPress={addRoom}>
          <Text style={styles.addRoomButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.roomList}>
        {rooms.map((room, index) => (
          <View key={index} style={styles.roomChip}>
            <Text style={styles.roomChipText}>{room}</Text>
            <TouchableOpacity
              style={styles.removeRoomButton}
              onPress={() => removeRoom(room)}>
              <Text style={styles.removeRoomButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Creating your home...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create New Home</Text>
          <Text style={styles.subtitle}>
            Set up your smart home to start controlling your devices
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Home Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter home name (max 25 characters)"
              value={homeName}
              onChangeText={setHomeName}
              maxLength={25}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., San Francisco, CA"
              value={geoName}
              onChangeText={setGeoName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.coordinateContainer}>
            <View style={styles.coordinateGroup}>
              <Text style={styles.label}>Latitude *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 37.7749"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.coordinateGroup}>
              <Text style={styles.label}>Longitude *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., -122.4194"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={isGettingLocation}>
            <Text style={styles.locationButtonText}>
              {isGettingLocation
                ? 'Getting Location...'
                : '📍 Get My Current Location'}
            </Text>
          </TouchableOpacity>

          {!latitude && !longitude && (
            <Text style={styles.locationHint}>
              Tap the button above to automatically fill in your current
              location, or manually enter coordinates below.
            </Text>
          )}

          {renderRoomList()}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateHome}
              disabled={isLoading}>
              <Text style={styles.createButtonText}>Create Home</Text>
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isLoading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  coordinateContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  coordinateGroup: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  roomSection: {
    marginBottom: 20,
  },
  roomAddContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  roomInput: {
    flex: 1,
  },
  addRoomButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addRoomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  roomList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomChip: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomChipText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  removeRoomButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeRoomButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateHomeScreen;
