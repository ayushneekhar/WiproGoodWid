import React from 'react';
import {Alert} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList, PairedDevice} from '../types/TuyaTypes';
import DevicePairingScreenComponent from '../components/DevicePairingScreen';
import StorageService from '../utils/StorageService';

type DevicePairingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DevicePairing'
>;

type DevicePairingScreenRouteProp = RouteProp<
  RootStackParamList,
  'DevicePairing'
>;

interface Props {
  navigation: DevicePairingScreenNavigationProp;
  route: DevicePairingScreenRouteProp;
}

const DevicePairingScreen: React.FC<Props> = ({navigation, route}) => {
  const {homeId, homeName} = route.params;

  const handleDevicePaired = (device: PairedDevice) => {
    StorageService.addDevice(device.devId);
    Alert.alert(
      'Device Paired Successfully!',
      `${device.name} has been added to your home.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Create the activeHome object from route parameters
  const activeHome = {
    homeId,
    name: homeName,
    // These are placeholder values since DevicePairingScreen only needs homeId and name
    lat: 0,
    lon: 0,
    geoName: '',
    admin: true,
    homeStatus: 1,
    role: 1,
    rooms: [],
  };

  return (
    <DevicePairingScreenComponent
      activeHome={activeHome}
      onDevicePaired={handleDevicePaired}
      onBack={handleBack}
    />
  );
};

export default DevicePairingScreen;
