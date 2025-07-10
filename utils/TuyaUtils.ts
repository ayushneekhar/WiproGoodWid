import {NativeModules, DeviceEventEmitter} from 'react-native';
import {User, LoginMethod} from '../types/TuyaTypes';

// Get a reference to your native module
const {TuyaModule} = NativeModules;

// --- Login Methods ---

/**
 * Login with phone number and password
 */
export const loginWithPhone = async (
  phone: string,
  password: string,
): Promise<User> => {
  try {
    console.log('Attempting phone login...');
    const user = await TuyaModule.loginWithPhone(phone, password);
    console.log('Phone login successful!', user);
    return user;
  } catch (error: any) {
    console.error('Phone login failed:', error.message);
    throw error;
  }
};

/**
 * Login with email and password
 */
export const loginWithEmail = async (
  email: string,
  password: string,
): Promise<User> => {
  try {
    console.log('Attempting email login...');
    const user = await TuyaModule.loginWithEmail(email, password);
    console.log('Email login successful!', user);
    return user;
  } catch (error: any) {
    console.error('Email login failed:', error.message);
    throw error;
  }
};

/**
 * Send verification code to email
 */
export const sendVerificationCodeToEmail = async (
  email: string,
  isRegister: boolean = false,
): Promise<void> => {
  try {
    const action = isRegister ? 'registration' : 'login';
    console.log(`Sending verification code to email for ${action}...`);
    await TuyaModule.sendVerificationCodeToEmail(email, isRegister);
    console.log('Verification code sent successfully!');
  } catch (error: any) {
    console.error('Failed to send verification code:', error.message);
    throw error;
  }
};

/**
 * Verify email with code and login
 */
export const verifyEmailCode = async (
  email: string,
  code: string,
): Promise<User> => {
  try {
    console.log('Verifying email code...');
    const user = await TuyaModule.verifyEmailCode(email, code);
    console.log('Email verification successful!', user);
    return user;
  } catch (error: any) {
    console.error('Email verification failed:', error.message);
    throw error;
  }
};

/**
 * Register a new user with email, password, and verification code
 */
export const registerUsingEmail = async (
  email: string,
  password: string,
  code: string,
): Promise<User> => {
  try {
    console.log('Registering new user with email...');
    const user = await TuyaModule.registerUsingEmail(email, password, code);
    console.log('Registration successful!', user);
    return user;
  } catch (error: any) {
    console.error('Registration failed:', error.message);
    throw error;
  }
};

/**
 * Generic login method that routes to the appropriate login function
 */
export const loginToTuya = async (
  method: LoginMethod,
  credentials: {
    phone?: string;
    email?: string;
    password?: string;
    verificationCode?: string;
  },
): Promise<User> => {
  switch (method) {
    case 'phone':
      if (!credentials.phone || !credentials.password) {
        throw new Error('Phone and password are required for phone login');
      }
      return loginWithPhone(credentials.phone, credentials.password);

    case 'email':
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required for email login');
      }
      return loginWithEmail(credentials.email, credentials.password);

    case 'emailCode':
      if (!credentials.email || !credentials.verificationCode) {
        throw new Error(
          'Email and verification code are required for email code login',
        );
      }
      return verifyEmailCode(credentials.email, credentials.verificationCode);

    case 'register':
      if (
        !credentials.email ||
        !credentials.password ||
        !credentials.verificationCode
      ) {
        throw new Error(
          'Email, password, and verification code are required for registration',
        );
      }
      return registerUsingEmail(
        credentials.email,
        credentials.password,
        credentials.verificationCode,
      );

    default:
      throw new Error(`Unsupported login method: ${method}`);
  }
};

// --- Device Control Methods ---

/**
 * Send a command to a device
 */
export const sendDeviceCommand = async (
  deviceId: string,
  dpsCommand: Record<string, any>,
): Promise<void> => {
  try {
    const commandJson = JSON.stringify(dpsCommand);
    await TuyaModule.publishDps(deviceId, commandJson);
    console.log('Successfully sent command to', deviceId, dpsCommand);
  } catch (error: any) {
    console.error('Failed to send command:', error.message);
    throw error;
  }
};

/**
 * Turn device on (using DP 1, which is common for switches/lights)
 */
export const turnDeviceOn = async (deviceId: string): Promise<void> => {
  return sendDeviceCommand(deviceId, {'1': true});
};

/**
 * Turn device off (using DP 1, which is common for switches/lights)
 */
export const turnDeviceOff = async (deviceId: string): Promise<void> => {
  return sendDeviceCommand(deviceId, {'1': false});
};

/**
 * Set device brightness (using DP 2, common for dimmable lights)
 */
export const setDeviceBrightness = async (
  deviceId: string,
  brightness: number,
): Promise<void> => {
  if (brightness < 0 || brightness > 1000) {
    throw new Error('Brightness must be between 0 and 1000');
  }
  return sendDeviceCommand(deviceId, {'2': brightness});
};

/**
 * Set device color (using DP 5, common for RGB lights)
 */
export const setDeviceColor = async (
  deviceId: string,
  color: string,
): Promise<void> => {
  return sendDeviceCommand(deviceId, {'5': color});
};

// --- Device Listener Management ---

/**
 * Register a device listener
 */
export const registerDeviceListener = async (
  deviceId: string,
): Promise<string> => {
  try {
    const result = await TuyaModule.registerDeviceListener(deviceId);
    console.log('Device listener registered:', result);
    return result;
  } catch (error: any) {
    console.error('Failed to register device listener:', error.message);
    throw error;
  }
};

/**
 * Unregister a device listener
 */
export const unregisterDeviceListener = async (
  deviceId: string,
): Promise<string> => {
  try {
    const result = await TuyaModule.unregisterDeviceListener(deviceId);
    console.log('Device listener unregistered:', result);
    return result;
  } catch (error: any) {
    console.error('Failed to unregister device listener:', error.message);
    throw error;
  }
};

// --- React Hook for Device Status ---

import React, {useEffect, useState} from 'react';
import {DeviceStatus} from '../types/TuyaTypes';

/**
 * Custom hook for tracking device status
 */
export const useDeviceStatus = (deviceId: string) => {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!deviceId) return;

    let mounted = true;

    const startListening = async () => {
      try {
        await registerDeviceListener(deviceId);
        if (mounted) setIsListening(true);
      } catch (error) {
        console.error('Failed to start listening:', error);
      }
    };

    // Set up event listeners
    const dpUpdateSubscription = DeviceEventEmitter.addListener(
      'onDpUpdate',
      event => {
        if (event.devId === deviceId && mounted) {
          setStatus(prev => ({
            devId: deviceId,
            online: true,
            dpStr: event.dpStr,
            lastUpdate: new Date().toLocaleTimeString(),
            ...prev,
          }));
        }
      },
    );

    const statusChangeSubscription = DeviceEventEmitter.addListener(
      'onStatusChanged',
      event => {
        if (event.devId === deviceId && mounted) {
          setStatus(prev => ({
            devId: deviceId,
            online: event.online,
            dpStr: prev?.dpStr || '',
            lastUpdate: new Date().toLocaleTimeString(),
            ...prev,
          }));
        }
      },
    );

    startListening();

    // Cleanup function
    return () => {
      mounted = false;
      dpUpdateSubscription.remove();
      statusChangeSubscription.remove();
      if (isListening) {
        unregisterDeviceListener(deviceId).catch(err =>
          console.error('Failed to unregister listener:', err.message),
        );
      }
    };
  }, [deviceId]);

  return {status, isListening};
};

// --- Utility Functions ---

/**
 * Parse DP string to object
 */
export const parseDpString = (dpStr: string): Record<string, any> => {
  try {
    return JSON.parse(dpStr);
  } catch (error) {
    console.error('Failed to parse DP string:', dpStr);
    return {};
  }
};

/**
 * Format DP data for display
 */
export const formatDpData = (dpStr: string): string => {
  try {
    const parsed = parseDpString(dpStr);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return dpStr;
  }
};

/**
 * Common device commands
 */
export const DeviceCommands = {
  // Switch/Light commands
  TURN_ON: {'1': true},
  TURN_OFF: {'1': false},

  // Brightness commands (0-1000)
  BRIGHTNESS_25: {'2': 250},
  BRIGHTNESS_50: {'2': 500},
  BRIGHTNESS_75: {'2': 750},
  BRIGHTNESS_100: {'2': 1000},

  // Color commands (HSV format)
  COLOR_RED: {'5': 'ff00000000ff'},
  COLOR_GREEN: {'5': '00ff000000ff'},
  COLOR_BLUE: {'5': '007eff0000ff'},
  COLOR_WHITE: {'5': 'ffffff0000ff'},

  // Fan speed commands
  FAN_SPEED_LOW: {'3': '1'},
  FAN_SPEED_MEDIUM: {'3': '2'},
  FAN_SPEED_HIGH: {'3': '3'},
};
