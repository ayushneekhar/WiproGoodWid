import {Platform, PermissionsAndroid, Alert} from 'react-native';

export interface PermissionResult {
  granted: boolean;
  message?: string;
}

export class PermissionUtils {
  /**
   * Request location permission (required for Bluetooth scanning on Android)
   */
  static async requestLocationPermission(): Promise<PermissionResult> {
    if (Platform.OS !== 'android') {
      return {granted: true};
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Required',
          message:
            'This app needs location access to scan for nearby Bluetooth devices. ' +
            'This is required by Android for Bluetooth scanning.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        },
      );

      return {
        granted: granted === PermissionsAndroid.RESULTS.GRANTED,
        message:
          granted !== PermissionsAndroid.RESULTS.GRANTED
            ? 'Location permission is required for Bluetooth device scanning'
            : undefined,
      };
    } catch (err) {
      console.warn('Location permission error:', err);
      return {
        granted: false,
        message: 'Failed to request location permission',
      };
    }
  }

  /**
   * Request Bluetooth permissions for Android 31+ (API 31+)
   */
  static async requestBluetoothPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'android') {
      return {granted: true};
    }

    try {
      // For Android 12+ (API 31+), we need BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      if (Platform.Version >= 31) {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions, {
          title: 'Bluetooth Permissions Required',
          message:
            'This app needs Bluetooth access to scan for and connect to smart devices.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        });

        const allGranted = Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED,
        );

        return {
          granted: allGranted,
          message: !allGranted
            ? 'Bluetooth permissions are required to scan for devices'
            : undefined,
        };
      } else {
        // For older Android versions, these permissions are granted at install time
        return {granted: true};
      }
    } catch (err) {
      console.warn('Bluetooth permission error:', err);
      return {
        granted: false,
        message: 'Failed to request Bluetooth permissions',
      };
    }
  }

  /**
   * Request all permissions required for Bluetooth device scanning
   */
  static async requestBluetoothScanPermissions(): Promise<PermissionResult> {
    console.log('PermissionUtils: Requesting Bluetooth scan permissions...');

    // First request location permission (always required for BLE scanning)
    const locationResult = await this.requestLocationPermission();
    if (!locationResult.granted) {
      return locationResult;
    }

    // Then request Bluetooth permissions (Android 31+ only)
    const bluetoothResult = await this.requestBluetoothPermissions();
    if (!bluetoothResult.granted) {
      return bluetoothResult;
    }

    console.log(
      'PermissionUtils: All Bluetooth scan permissions granted successfully',
    );
    return {granted: true};
  }

  /**
   * Check if all required permissions are already granted
   */
  static async checkBluetoothScanPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Check location permission
      const locationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (!locationGranted) {
        return false;
      }

      // Check Bluetooth permissions for Android 31+
      if (Platform.Version >= 31) {
        const bluetoothScanGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        );
        const bluetoothConnectGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );

        return bluetoothScanGranted && bluetoothConnectGranted;
      }

      return true;
    } catch (error) {
      console.warn('Error checking Bluetooth permissions:', error);
      return false;
    }
  }

  /**
   * Show an alert explaining why permissions are needed and offer to request them
   */
  static showPermissionExplanation(
    onRequestPermissions: () => void,
    onCancel?: () => void,
  ): void {
    Alert.alert(
      'Permissions Required',
      'To scan for nearby smart devices, this app needs:\n\n' +
        '• Location permission (required by Android for Bluetooth scanning)\n' +
        '• Bluetooth permissions (to discover and connect to devices)\n\n' +
        'Your location data is not collected or stored.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Grant Permissions',
          onPress: onRequestPermissions,
        },
      ],
    );
  }
}
