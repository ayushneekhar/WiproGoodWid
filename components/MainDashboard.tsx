import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import TuyaHomeModule from '../utils/TuyaHomeModule';
import {HomeBean, WeatherBean} from '../types/TuyaTypes';

interface MainDashboardProps {
  activeHome: HomeBean;
  allHomes: HomeBean[];
  onHomeUpdate: (home: HomeBean) => void;
  onHomesRefresh: () => void;
  onSwitchHome: (home: HomeBean) => void;
  onEditHome: (home: HomeBean) => void;
  onCreateNewHome: () => void;
  onGoToDevicePairing?: () => void;
  onGoToDeviceControl?: () => void;
  onLogout?: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({
  activeHome,
  allHomes,
  onHomeUpdate,
  onHomesRefresh,
  onSwitchHome,
  onEditHome,
  onCreateNewHome,
  onGoToDevicePairing,
  onGoToDeviceControl,
  onLogout,
}) => {
  const [homeDetails, setHomeDetails] = useState<HomeBean>(activeHome);
  const [weather, setWeather] = useState<WeatherBean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  useEffect(() => {
    refreshHomeDetails();
    loadWeather();
  }, [activeHome.homeId]);

  const refreshHomeDetails = async () => {
    try {
      setIsLoading(true);
      const updatedHome = await TuyaHomeModule.getHomeDetail(activeHome.homeId);
      setHomeDetails(updatedHome);
      onHomeUpdate(updatedHome);
    } catch (error) {
      console.error('Error refreshing home details:', error);
      Alert.alert('Error', 'Failed to refresh home details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWeather = async () => {
    try {
      setIsLoadingWeather(true);
      const weatherData = await TuyaHomeModule.getHomeWeatherSketch(
        activeHome.homeId,
        activeHome.lon,
        activeHome.lat,
      );
      setWeather(weatherData);
    } catch (error) {
      console.error('Error loading weather:', error);
      // Weather is not critical, so we don't show an alert
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshHomeDetails(),
        loadWeather(),
        onHomesRefresh(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDismissHome = () => {
    Alert.alert(
      'Delete Home',
      `Are you sure you want to delete "${homeDetails.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await TuyaHomeModule.dismissHome(activeHome.homeId);
              Alert.alert('Success', 'Home deleted successfully');
              onHomesRefresh();
            } catch (error: any) {
              console.error('Error dismissing home:', error);
              Alert.alert(
                'Error',
                `Failed to delete home: ${error.message || 'Unknown error'}`,
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderWeatherWidget = () => {
    if (isLoadingWeather) {
      return (
        <View style={styles.weatherWidget}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.weatherText}>Loading weather...</Text>
        </View>
      );
    }

    if (!weather) {
      return null;
    }

    return (
      <View style={styles.weatherWidget}>
        <Text style={styles.weatherTemp}>{weather.temp}</Text>
        <Text style={styles.weatherCondition}>{weather.condition}</Text>
      </View>
    );
  };

  const renderHomeSwitcher = () => {
    if (allHomes.length <= 1) {
      return null;
    }

    return (
      <View style={styles.homeSwitcher}>
        <Text style={styles.sectionTitle}>Switch Home</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {allHomes.map(home => (
            <TouchableOpacity
              key={home.homeId}
              style={[
                styles.homeChip,
                home.homeId === activeHome.homeId && styles.activeHomeChip,
              ]}
              onPress={() => onSwitchHome(home)}>
              <Text
                style={[
                  styles.homeChipText,
                  home.homeId === activeHome.homeId &&
                    styles.activeHomeChipText,
                ]}>
                {home.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderRoomsSection = () => {
    if (!homeDetails.rooms || homeDetails.rooms.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rooms</Text>
          <Text style={styles.emptyText}>No rooms in this home</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Rooms ({homeDetails.rooms.length})
        </Text>
        <View style={styles.roomsGrid}>
          {homeDetails.rooms.map(room => (
            <View key={room.roomId} style={styles.roomCard}>
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={styles.roomId}>ID: {room.roomId}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHomeActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Home Management</Text>
      <View style={styles.actionButtons}>
        {onGoToDevicePairing && (
          <TouchableOpacity
            style={[styles.actionButton, styles.pairingButton]}
            onPress={onGoToDevicePairing}>
            <Text style={styles.pairingButtonText}>Add Device</Text>
          </TouchableOpacity>
        )}

        {onGoToDeviceControl && (
          <TouchableOpacity
            style={[styles.actionButton, styles.controlButton]}
            onPress={onGoToDeviceControl}>
            <Text style={styles.controlButtonText}>Device Control</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onEditHome(homeDetails)}>
          <Text style={styles.editButtonText}>Edit Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.createButton]}
          onPress={onCreateNewHome}>
          <Text style={styles.createButtonText}>Create New Home</Text>
        </TouchableOpacity>

        {homeDetails.admin && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDismissHome}>
            <Text style={styles.deleteButtonText}>Delete Home</Text>
          </TouchableOpacity>
        )}
      </View>

      {onLogout && (
        <View style={styles.accountSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={onLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading home details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }>
        {/* Home Header */}
        <View style={styles.header}>
          <View style={styles.homeInfo}>
            <Text style={styles.homeName}>{homeDetails.name}</Text>
            <Text style={styles.homeLocation}>{homeDetails.geoName}</Text>
            <View style={styles.homeStats}>
              <Text style={styles.homeStat}>
                Role: {homeDetails.admin ? 'Admin' : 'Member'}
              </Text>
              <Text style={styles.homeStat}>
                Status: {homeDetails.homeStatus === 1 ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          {renderWeatherWidget()}
        </View>

        {/* Home Switcher */}
        {renderHomeSwitcher()}

        {/* Rooms Section */}
        {renderRoomsSection()}

        {/* Home Actions */}
        {renderHomeActions()}

        {/* Debug Info */}
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Debug Information</Text>
          <Text style={styles.debugText}>Home ID: {homeDetails.homeId}</Text>
          <Text style={styles.debugText}>
            Coordinates: {homeDetails.lat.toFixed(4)},{' '}
            {homeDetails.lon.toFixed(4)}
          </Text>
          <Text style={styles.debugText}>Role Code: {homeDetails.role}</Text>
        </View>
      </ScrollView>
    </View>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  homeInfo: {
    flex: 1,
  },
  homeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  homeLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  homeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  homeStat: {
    fontSize: 14,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  weatherWidget: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    minWidth: 80,
  },
  weatherTemp: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  weatherCondition: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
  },
  weatherText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 8,
  },
  homeSwitcher: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  homeChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  activeHomeChip: {
    backgroundColor: '#007AFF',
  },
  homeChipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  activeHomeChipText: {
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roomCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roomId: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#34C759',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pairingButton: {
    backgroundColor: '#FF9500',
  },
  pairingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlButton: {
    backgroundColor: '#5856D6',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  accountSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logoutButton: {
    backgroundColor: '#8E8E93',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 1,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
});

export default MainDashboard;
