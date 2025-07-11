# Bluetooth Permission Setup

This document explains the Bluetooth and location permission implementation for the WiproGoodWid app.

## Overview

Before scanning for Bluetooth devices, Android requires both location and Bluetooth permissions. iOS requires Bluetooth usage descriptions in the Info.plist file.

## Changes Made

### 1. Android Manifest Permissions (`android/app/src/main/AndroidManifest.xml`)

Added comprehensive Bluetooth permissions for both legacy and modern Android versions:

```xml
<!-- Legacy Bluetooth permissions for Android < 31 -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />

<!-- Modern Bluetooth permissions for Android 31+ -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
```

### 2. iOS Info.plist Permissions (`ios/WiproGoodWid/Info.plist`)

Added Bluetooth usage descriptions:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to discover and connect to smart home devices for setup and control.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app uses Bluetooth to discover and connect to smart home devices for setup and control.</string>
```

### 3. Permission Utilities (`utils/PermissionUtils.ts`)

Created a comprehensive utility class for handling runtime permissions:

- `requestLocationPermission()` - Request location permission (required for BLE scanning)
- `requestBluetoothPermissions()` - Request Bluetooth permissions (Android 31+)
- `requestBluetoothScanPermissions()` - Request all required permissions
- `checkBluetoothScanPermissions()` - Check if permissions are already granted
- `showPermissionExplanation()` - Show explanation dialog

### 4. React Hook (`hooks/useBluetoothPermissions.ts`)

Created a custom hook for easy permission management:

```typescript
const {state, requestPermissionsWithUI} = useBluetoothPermissions();

// Request permissions with UI handling
const hasPermissions = await requestPermissionsWithUI();
```

### 5. Updated Device Pairing Screen

Modified `components/DevicePairingScreen.tsx` to check and request permissions before starting Bluetooth scanning.

## Usage Examples

### Simple Permission Check

```typescript
import {PermissionUtils} from '../utils/PermissionUtils';

const startScanning = async () => {
  const hasPermissions = await PermissionUtils.checkBluetoothScanPermissions();
  if (!hasPermissions) {
    const result = await PermissionUtils.requestBluetoothScanPermissions();
    if (!result.granted) {
      Alert.alert('Error', result.message);
      return;
    }
  }

  // Start Bluetooth scanning...
};
```

### Using the Hook (Recommended)

```typescript
import {useBluetoothPermissions} from '../hooks/useBluetoothPermissions';

const MyComponent = () => {
  const {state, requestPermissionsWithUI} = useBluetoothPermissions();

  const handleScanDevices = async () => {
    const hasPermissions = await requestPermissionsWithUI();
    if (hasPermissions) {
      // Start scanning
    }
  };

  return (
    <TouchableOpacity onPress={handleScanDevices} disabled={state.isRequesting}>
      <Text>
        {state.isRequesting ? 'Requesting Permissions...' : 'Scan Devices'}
      </Text>
    </TouchableOpacity>
  );
};
```

## Permission Flow

1. **Check existing permissions** - Verify if required permissions are already granted
2. **Request location permission** - Always required for Bluetooth scanning on Android
3. **Request Bluetooth permissions** - Required on Android 12+ (API 31+)
4. **Handle permission denials** - Show user-friendly messages and guide to settings
5. **Start Bluetooth operations** - Only after all permissions are granted

## Important Notes

### Android API Levels

- **Android < 12 (API < 31)**: Only location permission is required at runtime (legacy Bluetooth permissions are install-time)
- **Android 12+ (API 31+)**: Both location and explicit Bluetooth permissions are required at runtime

### Location Permission

Location permission is required for Bluetooth scanning on Android due to the potential to determine device location through Bluetooth beacons. The app uses the `neverForLocation` flag to indicate we don't use Bluetooth for location purposes.

### iOS Considerations

iOS automatically handles Bluetooth permissions through the usage descriptions in Info.plist. The system will prompt users when the app first attempts to use Bluetooth.

## Testing

To test permission handling:

1. **Fresh install** - Install app and trigger device scanning
2. **Denied permissions** - Deny permissions and verify proper error handling
3. **Settings recovery** - Grant permissions in device settings and verify functionality
4. **Different Android versions** - Test on Android 11 and Android 12+ devices

## Troubleshooting

### Common Issues

1. **Scanning fails silently** - Check if all required permissions are granted
2. **Permission dialogs don't appear** - Verify permissions are declared in AndroidManifest.xml
3. **iOS Bluetooth issues** - Ensure usage descriptions are present in Info.plist

### Debug Steps

1. Check device logs for permission-related errors
2. Verify permission status using `PermissionUtils.checkBluetoothScanPermissions()`
3. Test on different Android API levels
4. Ensure Bluetooth is enabled on the device
