import {MMKV} from 'react-native-mmkv';
import {User} from '../types/TuyaTypes';

// Initialize MMKV storage
const storage = new MMKV();

// Storage keys
const STORAGE_KEYS = {
  USER_DATA: 'user_data',
  IS_LOGGED_IN: 'is_logged_in',
  LOGIN_METHOD: 'login_method',
  USER_CREDENTIALS: 'user_credentials', // For auto-login
  APP_SETTINGS: 'app_settings',
  DEVICE_LIST: 'device_list',
} as const;

export interface StoredCredentials {
  phoneNumber?: string;
  email?: string;
  // Note: We don't store passwords for security reasons
}

export interface AppSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  autoLogin: boolean;
}

export class StorageService {
  // User Authentication Methods
  static saveUserData(user: User): void {
    try {
      storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      storage.set(STORAGE_KEYS.IS_LOGGED_IN, true);
      console.log('User data saved to storage');
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  }

  static getUserData(): User | null {
    try {
      const userData = storage.getString(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  static saveLoginMethod(method: string): void {
    try {
      storage.set(STORAGE_KEYS.LOGIN_METHOD, method);
    } catch (error) {
      console.error('Failed to save login method:', error);
    }
  }

  static setLoginMethod(method: string): void {
    // Alias for saveLoginMethod for better semantic naming
    this.saveLoginMethod(method);
  }

  static getLoginMethod(): string | null {
    try {
      return storage.getString(STORAGE_KEYS.LOGIN_METHOD) || null;
    } catch (error) {
      console.error('Failed to get login method:', error);
      return null;
    }
  }

  static saveCredentials(credentials: StoredCredentials): void {
    try {
      storage.set(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify(credentials));
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }

  static getCredentials(): StoredCredentials | null {
    try {
      const credentials = storage.getString(STORAGE_KEYS.USER_CREDENTIALS);
      return credentials ? JSON.parse(credentials) : null;
    } catch (error) {
      console.error('Failed to get credentials:', error);
      return null;
    }
  }

  static isLoggedIn(): boolean {
    try {
      return storage.getBoolean(STORAGE_KEYS.IS_LOGGED_IN) || false;
    } catch (error) {
      console.error('Failed to check login status:', error);
      return false;
    }
  }

  static setLoggedIn(isLoggedIn: boolean): void {
    try {
      storage.set(STORAGE_KEYS.IS_LOGGED_IN, isLoggedIn);
    } catch (error) {
      console.error('Failed to set login status:', error);
    }
  }

  static logout(): void {
    try {
      // Clear user-related data
      storage.delete(STORAGE_KEYS.USER_DATA);
      storage.delete(STORAGE_KEYS.IS_LOGGED_IN);
      storage.delete(STORAGE_KEYS.LOGIN_METHOD);
      storage.delete(STORAGE_KEYS.USER_CREDENTIALS);
      console.log('User data cleared from storage');
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  static clearUserData(): void {
    // Alias for logout() method for better semantic naming
    this.logout();
  }

  // App Settings Methods
  static saveAppSettings(settings: Partial<AppSettings>): void {
    try {
      const currentSettings = this.getAppSettings();
      const updatedSettings = {...currentSettings, ...settings};
      storage.set(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to save app settings:', error);
    }
  }

  static getAppSettings(): AppSettings {
    try {
      const settings = storage.getString(STORAGE_KEYS.APP_SETTINGS);
      const defaultSettings: AppSettings = {
        theme: 'light',
        notifications: true,
        autoLogin: true,
      };
      return settings
        ? {...defaultSettings, ...JSON.parse(settings)}
        : defaultSettings;
    } catch (error) {
      console.error('Failed to get app settings:', error);
      return {
        theme: 'light',
        notifications: true,
        autoLogin: true,
      };
    }
  }

  // Device Management Methods
  static saveDeviceList(devices: string[]): void {
    try {
      storage.set(STORAGE_KEYS.DEVICE_LIST, JSON.stringify(devices));
    } catch (error) {
      console.error('Failed to save device list:', error);
    }
  }

  static getDeviceList(): string[] {
    try {
      const devices = storage.getString(STORAGE_KEYS.DEVICE_LIST);
      return devices ? JSON.parse(devices) : [];
    } catch (error) {
      console.error('Failed to get device list:', error);
      return [];
    }
  }

  static addDevice(deviceId: string): void {
    try {
      const devices = this.getDeviceList();
      if (!devices.includes(deviceId)) {
        devices.push(deviceId);
        this.saveDeviceList(devices);
      }
    } catch (error) {
      console.error('Failed to add device:', error);
    }
  }

  static removeDevice(deviceId: string): void {
    try {
      const devices = this.getDeviceList();
      const filteredDevices = devices.filter(id => id !== deviceId);
      this.saveDeviceList(filteredDevices);
    } catch (error) {
      console.error('Failed to remove device:', error);
    }
  }

  // Utility Methods
  static clearAllData(): void {
    try {
      storage.clearAll();
      console.log('All storage data cleared');
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }

  static getAllKeys(): readonly string[] {
    try {
      return storage.getAllKeys();
    } catch (error) {
      console.error('Failed to get all keys:', error);
      return [];
    }
  }

  static getStorageSize(): number {
    try {
      const keys = storage.getAllKeys();
      let totalSize = 0;
      keys.forEach(key => {
        const value = storage.getString(key);
        if (value) {
          totalSize += value.length;
        }
      });
      return totalSize;
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
      return 0;
    }
  }

  // Development/Debug Methods
  static printAllStorageData(): void {
    try {
      const keys = storage.getAllKeys();
      console.log('=== MMKV Storage Contents ===');
      keys.forEach(key => {
        const value = storage.getString(key);
        console.log(`${key}:`, value);
      });
      console.log('=== End Storage Contents ===');
    } catch (error) {
      console.error('Failed to print storage data:', error);
    }
  }
}

export default StorageService;
