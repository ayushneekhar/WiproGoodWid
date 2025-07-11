import {useState, useCallback} from 'react';
import {Alert} from 'react-native';
import {PermissionUtils, PermissionResult} from '../utils/PermissionUtils';

export interface BluetoothPermissionState {
  isChecking: boolean;
  isRequesting: boolean;
  hasPermissions: boolean | null;
}

export interface UseBluetoothPermissionsReturn {
  state: BluetoothPermissionState;
  checkPermissions: () => Promise<boolean>;
  requestPermissions: () => Promise<PermissionResult>;
  requestPermissionsWithUI: () => Promise<boolean>;
}

export const useBluetoothPermissions = (): UseBluetoothPermissionsReturn => {
  const [state, setState] = useState<BluetoothPermissionState>({
    isChecking: false,
    isRequesting: false,
    hasPermissions: null,
  });

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    setState(prev => ({...prev, isChecking: true}));

    try {
      const hasPermissions =
        await PermissionUtils.checkBluetoothScanPermissions();
      setState(prev => ({
        ...prev,
        isChecking: false,
        hasPermissions,
      }));
      return hasPermissions;
    } catch (error) {
      console.error('Error checking Bluetooth permissions:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
        hasPermissions: false,
      }));
      return false;
    }
  }, []);

  const requestPermissions =
    useCallback(async (): Promise<PermissionResult> => {
      setState(prev => ({...prev, isRequesting: true}));

      try {
        const result = await PermissionUtils.requestBluetoothScanPermissions();
        setState(prev => ({
          ...prev,
          isRequesting: false,
          hasPermissions: result.granted,
        }));
        return result;
      } catch (error) {
        console.error('Error requesting Bluetooth permissions:', error);
        const errorResult: PermissionResult = {
          granted: false,
          message: 'Failed to request permissions',
        };
        setState(prev => ({
          ...prev,
          isRequesting: false,
          hasPermissions: false,
        }));
        return errorResult;
      }
    }, []);

  const requestPermissionsWithUI = useCallback(async (): Promise<boolean> => {
    // First check if permissions are already granted
    const hasPermissions = await checkPermissions();
    if (hasPermissions) {
      return true;
    }

    // Request permissions
    const result = await requestPermissions();

    if (!result.granted) {
      // Show error dialog with options
      return new Promise<boolean>(resolve => {
        Alert.alert(
          'Permissions Required',
          result.message ||
            'Bluetooth and location permissions are required to scan for devices. ' +
              'Please grant these permissions to continue.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Retry',
              onPress: async () => {
                const retryResult = await requestPermissions();
                resolve(retryResult.granted);
              },
            },
            {
              text: 'Settings',
              onPress: () => {
                Alert.alert(
                  'Open Settings',
                  'Please go to Settings > Apps > WiproGoodWid > Permissions and enable:\n\n' +
                    '• Location (required for Bluetooth scanning)\n' +
                    '• Nearby devices/Bluetooth (for device discovery)',
                  [{text: 'OK', onPress: () => resolve(false)}],
                );
              },
            },
          ],
        );
      });
    }

    return result.granted;
  }, [checkPermissions, requestPermissions]);

  return {
    state,
    checkPermissions,
    requestPermissions,
    requestPermissionsWithUI,
  };
};
