import {useState, useEffect, useCallback} from 'react';
import {NativeModules, NativeEventEmitter} from 'react-native';
import {
  DeviceStatus,
  TuyaEventData,
  DeviceControlState,
} from '../types/TuyaTypes';
import StorageService from '../utils/StorageService';

const {TuyaModule} = NativeModules;
const tuyaEventEmitter = new NativeEventEmitter(TuyaModule);

export interface UseDevicesReturn extends DeviceControlState {
  // Actions
  sendCommand: (
    deviceId: string,
    command: Record<string, any>,
  ) => Promise<void>;
  registerDeviceListener: (deviceId: string) => Promise<void>;
  unregisterDeviceListener: (deviceId: string) => Promise<void>;
  toggleDeviceListener: (deviceId: string) => Promise<void>;
  turnDeviceOn: (deviceId: string) => Promise<void>;
  turnDeviceOff: (deviceId: string) => Promise<void>;
  setDeviceBrightness: (deviceId: string, brightness: number) => Promise<void>;
  addRecentDevice: (deviceId: string) => void;
  removeRecentDevice: (deviceId: string) => void;
  clearError: () => void;
}

export const useDevices = (): UseDevicesReturn => {
  const [deviceControlState, setDeviceControlState] =
    useState<DeviceControlState>({
      deviceStatuses: [],
      listenedDevices: new Set(),
      recentDevices: [],
      isLoading: false,
      error: null,
    });

  // Load recent devices on initialization
  useEffect(() => {
    const loadRecentDevices = () => {
      try {
        const devices = StorageService.getDeviceList();
        console.log('Loaded recent devices:', devices);
        setDeviceControlState(prev => ({
          ...prev,
          recentDevices: devices,
        }));
      } catch (error) {
        console.error('Error loading recent devices:', error);
      }
    };

    loadRecentDevices();
  }, []);

  // Set up device event listeners
  useEffect(() => {
    const dpUpdateSubscription = tuyaEventEmitter.addListener(
      'onDpUpdate',
      (data: TuyaEventData) => {
        console.log('DP Update:', data);
        updateDeviceStatus(data.devId, {dpStr: data.dpStr, online: true});
      },
    );

    const statusChangedSubscription = tuyaEventEmitter.addListener(
      'onStatusChanged',
      (data: TuyaEventData) => {
        console.log('Status Changed:', data);
        updateDeviceStatus(data.devId, {online: data.online});
      },
    );

    const deviceRemovedSubscription = tuyaEventEmitter.addListener(
      'onDeviceRemoved',
      (data: TuyaEventData) => {
        console.log('Device Removed:', data);
        removeDeviceStatus(data.devId);
        setDeviceControlState(prev => {
          const newListenedDevices = new Set(prev.listenedDevices);
          newListenedDevices.delete(data.devId);
          return {
            ...prev,
            listenedDevices: newListenedDevices,
          };
        });
      },
    );

    return () => {
      dpUpdateSubscription.remove();
      statusChangedSubscription.remove();
      deviceRemovedSubscription.remove();
    };
  }, []);

  const updateDeviceStatus = useCallback(
    (devId: string, updates: Partial<DeviceStatus>) => {
      setDeviceControlState(prev => {
        const existing = prev.deviceStatuses.find(
          status => status.devId === devId,
        );

        if (existing) {
          return {
            ...prev,
            deviceStatuses: prev.deviceStatuses.map(status =>
              status.devId === devId
                ? {
                    ...status,
                    ...updates,
                    lastUpdate: new Date().toISOString(),
                  }
                : status,
            ),
          };
        } else {
          return {
            ...prev,
            deviceStatuses: [
              ...prev.deviceStatuses,
              {
                devId,
                online: false,
                dpStr: '',
                lastUpdate: new Date().toISOString(),
                ...updates,
              },
            ],
          };
        }
      });
    },
    [],
  );

  const removeDeviceStatus = useCallback((devId: string) => {
    setDeviceControlState(prev => ({
      ...prev,
      deviceStatuses: prev.deviceStatuses.filter(
        status => status.devId !== devId,
      ),
    }));
  }, []);

  const sendCommand = useCallback(
    async (deviceId: string, command: Record<string, any>) => {
      setDeviceControlState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const commandJson = JSON.stringify(command);
        await TuyaModule.publishDps(deviceId, commandJson);
        console.log('Successfully sent command to', deviceId, command);

        // Add to recent devices if not already there
        addRecentDevice(deviceId);
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to send command';
        setDeviceControlState(prev => ({
          ...prev,
          error: errorMessage,
        }));
        console.error('Failed to send command:', error);
        throw error;
      } finally {
        setDeviceControlState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    },
    [],
  );

  const registerDeviceListener = useCallback(async (deviceId: string) => {
    setDeviceControlState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      await TuyaModule.registerDeviceListener(deviceId);
      setDeviceControlState(prev => ({
        ...prev,
        listenedDevices: new Set(prev.listenedDevices).add(deviceId),
        isLoading: false,
      }));
      console.log('Started listening to device:', deviceId);
    } catch (error: any) {
      const errorMessage =
        error.message || 'Failed to register device listener';
      setDeviceControlState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      console.error('Failed to register device listener:', error);
      throw error;
    }
  }, []);

  const unregisterDeviceListener = useCallback(async (deviceId: string) => {
    setDeviceControlState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      await TuyaModule.unregisterDeviceListener(deviceId);
      setDeviceControlState(prev => {
        const newListenedDevices = new Set(prev.listenedDevices);
        newListenedDevices.delete(deviceId);
        return {
          ...prev,
          listenedDevices: newListenedDevices,
          isLoading: false,
        };
      });
      console.log('Stopped listening to device:', deviceId);
    } catch (error: any) {
      const errorMessage =
        error.message || 'Failed to unregister device listener';
      setDeviceControlState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      console.error('Failed to unregister device listener:', error);
      throw error;
    }
  }, []);

  const toggleDeviceListener = useCallback(
    async (deviceId: string) => {
      const isListening = deviceControlState.listenedDevices.has(deviceId);

      if (isListening) {
        await unregisterDeviceListener(deviceId);
      } else {
        await registerDeviceListener(deviceId);
      }
    },
    [
      deviceControlState.listenedDevices,
      registerDeviceListener,
      unregisterDeviceListener,
    ],
  );

  const turnDeviceOn = useCallback(
    async (deviceId: string) => {
      await sendCommand(deviceId, {'1': true});
    },
    [sendCommand],
  );

  const turnDeviceOff = useCallback(
    async (deviceId: string) => {
      await sendCommand(deviceId, {'1': false});
    },
    [sendCommand],
  );

  const setDeviceBrightness = useCallback(
    async (deviceId: string, brightness: number) => {
      if (brightness < 0 || brightness > 1000) {
        throw new Error('Brightness must be between 0 and 1000');
      }
      await sendCommand(deviceId, {'2': brightness});
    },
    [sendCommand],
  );

  const addRecentDevice = useCallback((deviceId: string) => {
    setDeviceControlState(prev => {
      if (!prev.recentDevices.includes(deviceId)) {
        const newRecentDevices = [deviceId, ...prev.recentDevices.slice(0, 9)];
        StorageService.saveDeviceList(newRecentDevices);
        return {
          ...prev,
          recentDevices: newRecentDevices,
        };
      }
      return prev;
    });
  }, []);

  const removeRecentDevice = useCallback((deviceId: string) => {
    setDeviceControlState(prev => {
      const newRecentDevices = prev.recentDevices.filter(id => id !== deviceId);
      StorageService.saveDeviceList(newRecentDevices);
      return {
        ...prev,
        recentDevices: newRecentDevices,
      };
    });
  }, []);

  const clearError = useCallback(() => {
    setDeviceControlState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      // Unregister all device listeners on cleanup
      deviceControlState.listenedDevices.forEach(async deviceId => {
        try {
          await TuyaModule.unregisterDeviceListener(deviceId);
        } catch (error) {
          console.error(`Error unregistering listener for ${deviceId}:`, error);
        }
      });
    };
  }, []);

  return {
    ...deviceControlState,
    sendCommand,
    registerDeviceListener,
    unregisterDeviceListener,
    toggleDeviceListener,
    turnDeviceOn,
    turnDeviceOff,
    setDeviceBrightness,
    addRecentDevice,
    removeRecentDevice,
    clearError,
  };
};

export default useDevices;
