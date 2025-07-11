import {
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
} from 'react-native';
import {
  TuyaPairingModuleInterface,
  ScannedDevice,
  DeviceInfo,
  PairedDevice,
  BlePairingParams,
  ComboPairingParams,
  PairingEventNames,
} from '../types/TuyaTypes';

// Get the native pairing module
const {TuyaPairingModule} = NativeModules;

if (!TuyaPairingModule) {
  throw new Error(
    'TuyaPairingModule not found. Make sure the native module is properly linked.',
  );
}

class TuyaPairingUtils implements TuyaPairingModuleInterface {
  private eventEmitter: NativeEventEmitter;
  private scanListeners: Set<(device: ScannedDevice) => void> = new Set();

  constructor() {
    this.eventEmitter = new NativeEventEmitter(TuyaPairingModule);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for scanned devices
    DeviceEventEmitter.addListener('onLeScan', (deviceData: ScannedDevice) => {
      console.log('Device discovered:', deviceData);
      this.scanListeners.forEach(listener => listener(deviceData));
    });
  }

  /**
   * Starts scanning for nearby Tuya Bluetooth LE devices.
   * @param timeout The duration of the scan in milliseconds.
   */
  async startLeScan(timeout: number = 30000): Promise<void> {
    try {
      console.log(`Starting BLE scan for ${timeout}ms...`);
      await TuyaPairingModule.startLeScan(timeout);
      console.log('BLE scan started successfully');
    } catch (error: any) {
      console.error('Failed to start BLE scan:', error.message);
      throw error;
    }
  }

  /**
   * Manually stops the Bluetooth LE device scan.
   */
  async manuallyStopScanning(): Promise<void> {
    try {
      console.log('Stopping BLE scan...');
      await TuyaPairingModule.manuallyStopScanning();
      console.log('BLE scan stopped successfully');
    } catch (error: any) {
      console.error('Failed to stop BLE scan:', error.message);
      throw error;
    }
  }

  /**
   * Fetches detailed product information for a discovered device before pairing.
   * @param productId The product ID from the scan result.
   * @param uuid The UUID from the scan result.
   * @param mac The MAC address from the scan result.
   */
  async getDeviceInfo(
    productId: string,
    uuid: string,
    mac: string,
  ): Promise<DeviceInfo> {
    try {
      console.log('Getting device info for:', {productId, uuid, mac});
      const deviceInfo = await TuyaPairingModule.getDeviceInfo(
        productId,
        uuid,
        mac,
      );
      console.log('Device info retrieved:', deviceInfo);
      return deviceInfo;
    } catch (error: any) {
      console.error('Failed to get device info:', error.message);
      throw error;
    }
  }

  /**
   * Starts pairing a single Bluetooth LE device (configType: 'config_type_single').
   * @param params Pairing parameters for BLE device.
   */
  async startBleDevicePairing(params: BlePairingParams): Promise<PairedDevice> {
    try {
      console.log('Starting BLE device pairing with params:', params);
      const pairedDevice = await TuyaPairingModule.startBleDevicePairing(
        params,
      );
      console.log('BLE device paired successfully:', pairedDevice);
      return pairedDevice;
    } catch (error: any) {
      console.error('BLE device pairing failed:', error.message);
      throw error;
    }
  }

  /**
   * Stops an ongoing Bluetooth LE device pairing process.
   * @param uuid The UUID of the device for which to stop pairing.
   */
  async stopBleDevicePairing(uuid: string): Promise<boolean> {
    try {
      console.log('Stopping BLE device pairing for UUID:', uuid);
      const result = await TuyaPairingModule.stopBleDevicePairing(uuid);
      console.log('BLE device pairing stopped');
      return result;
    } catch (error: any) {
      console.error('Failed to stop BLE device pairing:', error.message);
      throw error;
    }
  }

  /**
   * Starts pairing for a combo (Wi-Fi + Bluetooth) device (configType: 'config_type_wifi').
   * @param params Pairing parameters for combo device.
   */
  async startComboDevicePairing(
    params: ComboPairingParams,
  ): Promise<PairedDevice> {
    try {
      console.log('Starting combo device pairing with params:', {
        ...params,
        password: '***', // Hide password in logs
      });
      const pairedDevice = await TuyaPairingModule.startComboDevicePairing(
        params,
      );
      console.log('Combo device paired successfully:', pairedDevice);
      return pairedDevice;
    } catch (error: any) {
      console.error('Combo device pairing failed:', error.message);
      throw error;
    }
  }

  /**
   * Stops an ongoing combo device pairing process.
   * @param uuid The UUID of the device for which to stop pairing.
   */
  async stopComboDevicePairing(uuid: string): Promise<boolean> {
    try {
      console.log('Stopping combo device pairing for UUID:', uuid);
      const result = await TuyaPairingModule.stopComboDevicePairing(uuid);
      console.log('Combo device pairing stopped');
      return result;
    } catch (error: any) {
      console.error('Failed to stop combo device pairing:', error.message);
      throw error;
    }
  }

  /**
   * Gets the current WiFi network SSID that the device is connected to.
   */
  async getCurrentWiFiSSID(): Promise<string | null> {
    try {
      console.log('Getting current WiFi SSID...');
      const ssid = await TuyaPairingModule.getCurrentWiFiSSID();
      console.log('Current WiFi SSID:', ssid);
      return ssid;
    } catch (error: any) {
      console.error('Failed to get current WiFi SSID:', error.message);
      return null; // Return null instead of throwing to avoid breaking the UI
    }
  }

  /**
   * Adds a listener for device scan results.
   * @param listener Function to call when a device is discovered.
   */
  addScanListener(listener: (device: ScannedDevice) => void): void {
    this.scanListeners.add(listener);
  }

  /**
   * Removes a scan listener.
   * @param listener The listener function to remove.
   */
  removeScanListener(listener: (device: ScannedDevice) => void): void {
    this.scanListeners.delete(listener);
  }

  /**
   * Removes all scan listeners.
   */
  removeAllScanListeners(): void {
    this.scanListeners.clear();
  }

  /**
   * Checks if a device is already bound (paired to another account).
   * @param device The scanned device to check.
   */
  isDeviceBound(device: ScannedDevice): boolean {
    return device.isBind;
  }

  /**
   * Determines if a device supports BLE-only pairing or requires combo pairing.
   * @param device The scanned device to check.
   */
  getDevicePairingType(device: ScannedDevice): 'ble' | 'combo' {
    return device.configType === 'config_type_single' ? 'ble' : 'combo';
  }

  /**
   * Calculates if device is shared based on flag bits.
   * @param device The scanned device to check.
   */
  isSharedDevice(device: ScannedDevice): boolean {
    // Based on flag bit analysis from native code
    return (device.flag & 0x01) !== 0;
  }

  /**
   * Gets the event emitter for direct event listening.
   */
  getEventEmitter(): NativeEventEmitter {
    return this.eventEmitter;
  }
}

// Create and export a singleton instance
export const tuyaPairingUtils = new TuyaPairingUtils();

// Export helper functions with proper context binding
export const startLeScan = (timeout?: number) =>
  tuyaPairingUtils.startLeScan(timeout);
export const manuallyStopScanning = () =>
  tuyaPairingUtils.manuallyStopScanning();
export const getDeviceInfo = (productId: string, uuid: string, mac: string) =>
  tuyaPairingUtils.getDeviceInfo(productId, uuid, mac);
export const startBleDevicePairing = (params: BlePairingParams) =>
  tuyaPairingUtils.startBleDevicePairing(params);
export const stopBleDevicePairing = (uuid: string) =>
  tuyaPairingUtils.stopBleDevicePairing(uuid);
export const startComboDevicePairing = (params: ComboPairingParams) =>
  tuyaPairingUtils.startComboDevicePairing(params);
export const stopComboDevicePairing = (uuid: string) =>
  tuyaPairingUtils.stopComboDevicePairing(uuid);
export const getCurrentWiFiSSID = () => tuyaPairingUtils.getCurrentWiFiSSID();
export const addScanListener = (listener: (device: ScannedDevice) => void) =>
  tuyaPairingUtils.addScanListener(listener);
export const removeScanListener = (listener: (device: ScannedDevice) => void) =>
  tuyaPairingUtils.removeScanListener(listener);
export const removeAllScanListeners = () =>
  tuyaPairingUtils.removeAllScanListeners();
export const isDeviceBound = (device: ScannedDevice) =>
  tuyaPairingUtils.isDeviceBound(device);
export const getDevicePairingType = (device: ScannedDevice) =>
  tuyaPairingUtils.getDevicePairingType(device);
export const isSharedDevice = (device: ScannedDevice) =>
  tuyaPairingUtils.isSharedDevice(device);

export default tuyaPairingUtils;
