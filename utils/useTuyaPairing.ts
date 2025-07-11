import {useState, useEffect, useCallback, useRef} from 'react';
import {
  ScannedDevice,
  DeviceInfo,
  PairedDevice,
  BlePairingParams,
  ComboPairingParams,
} from '../types/TuyaTypes';
import {
  tuyaPairingUtils,
  addScanListener,
  removeScanListener,
  startLeScan,
  manuallyStopScanning,
  getDeviceInfo,
  startBleDevicePairing,
  startComboDevicePairing,
  stopBleDevicePairing,
  stopComboDevicePairing,
  getDevicePairingType,
  isDeviceBound,
  isSharedDevice,
  getEzPairingToken,
} from './TuyaPairingUtils';

export interface UseTuyaPairingOptions {
  autoStartScanning?: boolean;
  scanTimeout?: number;
  onDevicePaired?: (device: PairedDevice) => void;
  onScanComplete?: (devices: ScannedDevice[]) => void;
  onError?: (error: Error) => void;
}

export interface UseTuyaPairingReturn {
  // Scanning state
  isScanning: boolean;
  scannedDevices: ScannedDevice[];
  scanError: string | null;

  // Pairing state
  isPairing: boolean;
  pairingProgress: string;
  pairingError: string | null;
  pairedDevice: PairedDevice | null;

  // Methods
  startScanning: (timeout?: number) => Promise<void>;
  stopScanning: () => Promise<void>;
  clearScannedDevices: () => void;

  pairBleDevice: (
    device: ScannedDevice,
    params?: Partial<BlePairingParams>,
  ) => Promise<PairedDevice>;
  pairComboDevice: (
    device: ScannedDevice,
    wifiCredentials: {ssid: string; password: string},
    params?: Partial<ComboPairingParams>,
  ) => Promise<PairedDevice>;
  stopCurrentPairing: () => Promise<void>;

  getDeviceInfo: (device: ScannedDevice) => Promise<DeviceInfo>;

  // Utility methods
  getDevicePairingType: (device: ScannedDevice) => 'ble' | 'combo';
  isDeviceBound: (device: ScannedDevice) => boolean;
  isSharedDevice: (device: ScannedDevice) => boolean;

  // Reset methods
  reset: () => void;
  clearErrors: () => void;
}

export const useTuyaPairing = (
  homeId: number,
  options: UseTuyaPairingOptions = {},
): UseTuyaPairingReturn => {
  const {
    autoStartScanning = false,
    scanTimeout = 30000,
    onDevicePaired,
    onScanComplete,
    onError,
  } = options;

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  // Pairing state
  const [isPairing, setIsPairing] = useState(false);
  const [pairingProgress, setPairingProgress] = useState('');
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(null);

  // Refs to track current operations
  const currentPairingDevice = useRef<ScannedDevice | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Device discovery handler
  const handleDeviceDiscovered = useCallback((device: ScannedDevice) => {
    setScannedDevices(prev => {
      const existingIndex = prev.findIndex(d => d.uuid === device.uuid);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = device;
        return updated;
      } else {
        return [...prev, device];
      }
    });
  }, []);

  // Set up device discovery listener
  useEffect(() => {
    addScanListener(handleDeviceDiscovered);
    return () => removeScanListener(handleDeviceDiscovered);
  }, [handleDeviceDiscovered]);

  // Auto-start scanning if requested
  useEffect(() => {
    if (autoStartScanning) {
      startScanningInternal(scanTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        manuallyStopScanning().catch(console.error);
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [isScanning]);

  const startScanningInternal = async (timeout: number = scanTimeout) => {
    try {
      setScanError(null);
      setIsScanning(true);
      setScannedDevices([]);

      await startLeScan(timeout);

      // Set up auto-stop timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      scanTimeoutRef.current = setTimeout(() => {
        setIsScanning(false);
        onScanComplete?.(scannedDevices);
      }, timeout);
    } catch (error: any) {
      const errorMessage = `Failed to start scanning: ${error.message}`;
      setScanError(errorMessage);
      setIsScanning(false);
      onError?.(new Error(errorMessage));
    }
  };

  const startScanningMethod = useCallback(
    async (timeout?: number) => {
      return startScanningInternal(timeout || scanTimeout);
    },
    [scanTimeout],
  );

  const stopScanningMethod = useCallback(async () => {
    try {
      setIsScanning(false);
      await manuallyStopScanning();

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }

      onScanComplete?.(scannedDevices);
    } catch (error: any) {
      const errorMessage = `Failed to stop scanning: ${error.message}`;
      setScanError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  }, [scannedDevices, onScanComplete, onError]);

  const clearScannedDevicesMethod = useCallback(() => {
    setScannedDevices([]);
  }, []);

  const pairBleDeviceMethod = useCallback(
    async (
      device: ScannedDevice,
      params: Partial<BlePairingParams> = {},
    ): Promise<PairedDevice> => {
      if (isPairing) {
        throw new Error('Another pairing operation is already in progress');
      }

      if (isDeviceBound(device)) {
        throw new Error('Device is already bound to another account');
      }

      setIsPairing(true);
      setPairingError(null);
      setPairingProgress('Starting BLE pairing...');
      currentPairingDevice.current = device;

      try {
        const pairingParams: BlePairingParams = {
          homeId,
          uuid: device.uuid,
          deviceType: device.deviceType,
          productId: device.productId,
          address: device.address,
          isShare: isSharedDevice(device),
          timeout: 100000,
          ...params,
        };

        setPairingProgress('Connecting to device...');
        const result = await startBleDevicePairing(pairingParams);

        setPairingProgress('Pairing successful!');
        setPairedDevice(result);
        onDevicePaired?.(result);

        return result;
      } catch (error: any) {
        const errorMessage = `BLE pairing failed: ${error.message}`;
        setPairingError(errorMessage);
        onError?.(new Error(errorMessage));
        throw error;
      } finally {
        setIsPairing(false);
        currentPairingDevice.current = null;
      }
    },
    [homeId, isPairing, onDevicePaired, onError],
  );

  const pairComboDeviceMethod = useCallback(
    async (
      device: ScannedDevice,
      wifiCredentials: {ssid: string; password: string},
      params: Partial<ComboPairingParams> = {},
    ): Promise<PairedDevice> => {
      if (isPairing) {
        throw new Error('Another pairing operation is already in progress');
      }

      if (isDeviceBound(device)) {
        throw new Error('Device is already bound to another account');
      }

      if (!wifiCredentials.ssid || !wifiCredentials.password) {
        throw new Error(
          'WiFi credentials are required for combo device pairing',
        );
      }

      setIsPairing(true);
      setPairingError(null);
      setPairingProgress('Starting combo pairing...');
      currentPairingDevice.current = device;

      try {
        // TODO: This should be obtained from the home
        const token = await getEzPairingToken(homeId);

        const pairingParams: ComboPairingParams = {
          homeId,
          uuid: device.uuid,
          deviceType: device.deviceType,
          token,
          ssid: wifiCredentials.ssid,
          password: wifiCredentials.password,
          mac: device.mac,
          address: device.address,
          timeout: 120000,
          ...params,
        };

        setPairingProgress('Connecting to WiFi...');
        const result = await startComboDevicePairing(pairingParams);

        setPairingProgress('Pairing successful!');
        setPairedDevice(result);
        onDevicePaired?.(result);

        return result;
      } catch (error: any) {
        const errorMessage = `Combo pairing failed: ${error.message}`;
        setPairingError(errorMessage);
        onError?.(new Error(errorMessage));
        throw error;
      } finally {
        setIsPairing(false);
        currentPairingDevice.current = null;
      }
    },
    [homeId, isPairing, onDevicePaired, onError],
  );

  const stopCurrentPairingMethod = useCallback(async () => {
    if (!isPairing || !currentPairingDevice.current) {
      return;
    }

    try {
      const device = currentPairingDevice.current;
      const pairingType = getDevicePairingType(device);

      if (pairingType === 'ble') {
        await stopBleDevicePairing(device.uuid);
      } else {
        await stopComboDevicePairing(device.uuid);
      }

      setPairingProgress('Pairing cancelled');
    } catch (error: any) {
      console.error('Failed to stop pairing:', error);
    } finally {
      setIsPairing(false);
      currentPairingDevice.current = null;
    }
  }, [isPairing]);

  const getDeviceInfoMethod = useCallback(
    async (device: ScannedDevice): Promise<DeviceInfo> => {
      try {
        return await getDeviceInfo(device.productId, device.uuid, device.mac);
      } catch (error: any) {
        onError?.(new Error(`Failed to get device info: ${error.message}`));
        throw error;
      }
    },
    [onError],
  );

  const reset = useCallback(() => {
    setScannedDevices([]);
    setPairedDevice(null);
    setPairingProgress('');
    setScanError(null);
    setPairingError(null);
    currentPairingDevice.current = null;

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

  const clearErrors = useCallback(() => {
    setScanError(null);
    setPairingError(null);
  }, []);

  return {
    // State
    isScanning,
    scannedDevices,
    scanError,
    isPairing,
    pairingProgress,
    pairingError,
    pairedDevice,

    // Methods
    startScanning: startScanningMethod,
    stopScanning: stopScanningMethod,
    clearScannedDevices: clearScannedDevicesMethod,

    pairBleDevice: pairBleDeviceMethod,
    pairComboDevice: pairComboDeviceMethod,
    stopCurrentPairing: stopCurrentPairingMethod,

    getDeviceInfo: getDeviceInfoMethod,

    // Utility methods
    getDevicePairingType,
    isDeviceBound,
    isSharedDevice,

    // Reset methods
    reset,
    clearErrors,
  };
};

export default useTuyaPairing;
