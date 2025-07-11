import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import TuyaHomeModule from '../utils/TuyaHomeModule';
import {HomeBean, RootStackParamList} from '../types/TuyaTypes';

type CreateHomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CreateHome' | 'EditHome'
>;

type CreateHomeScreenRouteProp =
  | RouteProp<RootStackParamList, 'CreateHome'>
  | RouteProp<RootStackParamList, 'EditHome'>;

interface Props {
  navigation: CreateHomeScreenNavigationProp;
  route: CreateHomeScreenRouteProp;
}

const CreateHomeScreen: React.FC<Props> = ({navigation, route}) => {
  // Determine if we're editing an existing home
  const isEditing =
    route.name === 'EditHome' && 'params' in route && route.params?.home;
  const existingHome = isEditing ? (route.params as any).home : null;

  const [homeName, setHomeName] = useState(existingHome?.name || '');
  const [geoName, setGeoName] = useState(existingHome?.geoName || '');
  const [latitude, setLatitude] = useState(existingHome?.lat?.toString() || '');
  const [longitude, setLongitude] = useState(
    existingHome?.lon?.toString() || '',
  );
  const [rooms, setRooms] = useState(
    existingHome?.rooms?.map(room => room.name) || [
      'Living Room',
      'Bedroom',
      'Kitchen',
    ],
  );
  const [newRoom, setNewRoom] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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
    return true;
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
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

      Geolocation.getCurrentPosition(
        async position => {
          try {
            const {latitude, longitude} = position.coords;
            console.log('Got location:', latitude, longitude);

            setLatitude(latitude.toString());
            setLongitude(longitude.toString());

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

    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Error', 'Please enter valid numeric coordinates');
      return false;
    }

    if (lat < -90 || lat > 90) {
      Alert.alert('Error', 'Latitude must be between -90 and 90');
      return false;
    }

    if (lon < -180 || lon > 180) {
      Alert.alert('Error', 'Longitude must be between -180 and 180');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (isEditing && existingHome) {
        // Update existing home
        await TuyaHomeModule.updateHome(
          existingHome.homeId,
          homeName.trim(),
          lon,
          lat,
          geoName.trim(),
          rooms,
          true, // overwriteRooms
        );

        Alert.alert('Success', 'Home updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        // Create new home
        const homeId = await TuyaHomeModule.createHome(
          homeName.trim(),
          lon,
          lat,
          geoName.trim(),
          rooms,
        );

        Alert.alert('Success', `Home "${homeName}" created successfully!`, [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      console.error(
        `Error ${isEditing ? 'updating' : 'creating'} home:`,
        error,
      );
      Alert.alert(
        'Error',
        `Failed to ${isEditing ? 'update' : 'create'} home: ${
          error.message || 'Unknown error'
        }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoomList = () => (
    <View style={styles.roomSection}>
      <Text style={styles.label}>Rooms</Text>
      <View style={styles.roomList}>
        {rooms.map((room, index) => (
          <View key={index} style={styles.roomChip}>
            <Text style={styles.roomText}>{room}</Text>
            <TouchableOpacity
              onPress={() => removeRoom(room)}
              style={styles.removeButton}>
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.addRoomContainer}>
        <TextInput
          style={[styles.input, styles.roomInput]}
          placeholder="Enter room name"
          value={newRoom}
          onChangeText={setNewRoom}
          onSubmitEditing={addRoom}
        />
        <TouchableOpacity
          style={[
            styles.addButton,
            !newRoom.trim() && styles.addButtonDisabled,
          ]}
          onPress={addRoom}
          disabled={!newRoom.trim()}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Platform.OS === 'android' ? '#fff' : undefined}
        translucent={false}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Home' : 'Create Home'}
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Home Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter home name (max 25 characters)"
              value={homeName}
              onChangeText={setHomeName}
              maxLength={25}
            />
            <Text style={styles.characterCount}>{homeName.length}/25</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New York, NY"
              value={geoName}
              onChangeText={setGeoName}
            />
          </View>

          <View style={styles.locationSection}>
            <Text style={styles.label}>Coordinates *</Text>
            <View style={styles.coordinateRow}>
              <View style={styles.coordinateInput}>
                <Text style={styles.coordinateLabel}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 40.7128"
                  value={latitude}
                  onChangeText={setLatitude}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.coordinateInput}>
                <Text style={styles.coordinateLabel}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., -74.0060"
                  value={longitude}
                  onChangeText={setLongitude}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.locationButton,
                isGettingLocation && styles.locationButtonDisabled,
              ]}
              onPress={getCurrentLocation}
              disabled={isGettingLocation}>
              {isGettingLocation ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.locationButtonText}>
                  📍 Get Current Location
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {renderRoomList()}

          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Home' : 'Create Home'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
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
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  locationSection: {
    marginBottom: 20,
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  coordinateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationButton: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationButtonDisabled: {
    backgroundColor: '#d1d5db',
    borderColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  roomSection: {
    marginBottom: 20,
  },
  roomList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roomText: {
    fontSize: 14,
    color: '#374151',
    marginRight: 6,
  },
  removeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addRoomContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  roomInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
});

export default CreateHomeScreen;
