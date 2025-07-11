import {
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
} from 'react-native';
import {
  WiFiEzPairingParams,
  PairedDevice,
  WiFiEzPairingStep,
} from '../types/TuyaTypes';

// Get the native pairing module
const {TuyaPairingModule} = NativeModules;

if (!TuyaPairingModule) {
  throw new Error(
    'TuyaPairingModule not found. Make sure the native module is properly linked.',
  );
}

class TuyaWiFiEzPairingUtils {
  private eventEmitter: NativeEventEmitter;
  private stepListeners: Set<(step: WiFiEzPairingStep, data?: any) => void> =
    new Set();

  constructor() {
    this.eventEmitter = new NativeEventEmitter(TuyaPairingModule);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for WiFi EZ pairing step updates
    DeviceEventEmitter.addListener('onEzPairingStep', (eventData: any) => {
      console.log('WiFi EZ pairing step:', eventData);
      const step = this.mapNativeStepToStep(eventData.step);
      this.stepListeners.forEach(listener => listener(step, eventData));
    });
  }

  private mapNativeStepToStep(nativeStep: string): WiFiEzPairingStep {
    // Map native step names to our defined step types
    switch (nativeStep) {
      case 'getting_token':
      case 'token_retrieved':
        return 'getting_token';
      case 'broadcasting':
      case 'broadcasting_ssid':
        return 'broadcasting_ssid';
      case 'connecting':
      case 'device_connecting':
        return 'device_connecting';
      case 'binding':
      case 'device_binding':
        return 'device_binding';
      case 'success':
      case 'completed':
        return 'success';
      default:
        return 'broadcasting_ssid'; // Default fallback
    }
  }

  /**
   * Gets a pairing token required for WiFi EZ mode pairing.
   * The token is valid for 10 minutes.
   * @param homeId The ID of the home where the device will be added.
   */
  async getEzPairingToken(homeId: number): Promise<string> {
    try {
      console.log(`Getting EZ pairing token for home: ${homeId}`);
      const token = await TuyaPairingModule.getEzPairingToken(homeId);
      console.log('EZ pairing token retrieved successfully');
      return token;
    } catch (error: any) {
      console.error('Failed to get EZ pairing token:', error.message);
      throw error;
    }
  }

  /**
   * Starts WiFi EZ Mode (SmartConfig) pairing.
   * The device must be in pairing mode (usually fast blinking LED).
   * @param params Pairing parameters for WiFi EZ mode.
   */
  async startEzPairing(params: WiFiEzPairingParams): Promise<PairedDevice> {
    try {
      console.log('Starting WiFi EZ pairing with params:', {
        ...params,
        password: '***', // Hide password in logs
        token: '***', // Hide token in logs
      });

      const pairedDevice = await TuyaPairingModule.startEzPairing(params);
      console.log('WiFi EZ pairing completed successfully:', pairedDevice);
      return pairedDevice;
    } catch (error: any) {
      console.error('WiFi EZ pairing failed:', error.message);
      throw error;
    }
  }

  /**
   * Stops an ongoing WiFi EZ Mode pairing process.
   */
  async stopEzPairing(): Promise<boolean> {
    try {
      console.log('Stopping WiFi EZ pairing...');
      const result = await TuyaPairingModule.stopEzPairing();
      console.log('WiFi EZ pairing stopped');
      return result;
    } catch (error: any) {
      console.error('Failed to stop WiFi EZ pairing:', error.message);
      throw error;
    }
  }

  /**
   * Adds a listener for WiFi EZ pairing step updates.
   * @param listener Function to call when a pairing step occurs.
   */
  addStepListener(
    listener: (step: WiFiEzPairingStep, data?: any) => void,
  ): void {
    this.stepListeners.add(listener);
  }

  /**
   * Removes a WiFi EZ pairing step listener.
   * @param listener The listener function to remove.
   */
  removeStepListener(
    listener: (step: WiFiEzPairingStep, data?: any) => void,
  ): void {
    this.stepListeners.delete(listener);
  }

  /**
   * Removes all WiFi EZ pairing step listeners.
   */
  removeAllStepListeners(): void {
    this.stepListeners.clear();
  }

  /**
   * Gets the event emitter for direct event listening.
   */
  getEventEmitter(): NativeEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Gets friendly step descriptions for UI display.
   */
  getStepDescription(step: WiFiEzPairingStep): string {
    switch (step) {
      case 'getting_token':
        return 'Getting pairing token...';
      case 'broadcasting_ssid':
        return 'Broadcasting WiFi credentials...';
      case 'device_connecting':
        return 'Device connecting to WiFi...';
      case 'device_binding':
        return 'Binding device to account...';
      case 'success':
        return 'Device paired successfully!';
      default:
        return 'Processing...';
    }
  }
}

// Create and export a singleton instance
export const tuyaWiFiEzPairingUtils = new TuyaWiFiEzPairingUtils();

// Export helper functions with proper context binding
export const getEzPairingToken = (homeId: number) =>
  tuyaWiFiEzPairingUtils.getEzPairingToken(homeId);
export const startEzPairing = (params: WiFiEzPairingParams) =>
  tuyaWiFiEzPairingUtils.startEzPairing(params);
export const stopEzPairing = () => tuyaWiFiEzPairingUtils.stopEzPairing();
export const addEzStepListener = (
  listener: (step: WiFiEzPairingStep, data?: any) => void,
) => tuyaWiFiEzPairingUtils.addStepListener(listener);
export const removeEzStepListener = (
  listener: (step: WiFiEzPairingStep, data?: any) => void,
) => tuyaWiFiEzPairingUtils.removeStepListener(listener);
export const removeAllEzStepListeners = () =>
  tuyaWiFiEzPairingUtils.removeAllStepListeners();
export const getEzStepDescription = (step: WiFiEzPairingStep) =>
  tuyaWiFiEzPairingUtils.getStepDescription(step);

export default tuyaWiFiEzPairingUtils;
