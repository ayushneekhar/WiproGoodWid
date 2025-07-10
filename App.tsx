/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  NativeModules,
  NativeEventEmitter,
  Switch,
  Platform,
} from 'react-native';
import {
  User,
  DeviceStatus,
  TuyaEventData,
  LoginMethod,
  HomeBean,
  HomeEventNames,
  HomeChangeEventData,
} from './types/TuyaTypes';
import StorageService from './utils/StorageService';
import TuyaHomeModule from './utils/TuyaHomeModule';
import CreateHomeScreen from './components/CreateHomeScreen';
import MainDashboard from './components/MainDashboard';

const {TuyaModule} = NativeModules;
const tuyaEventEmitter = new NativeEventEmitter(TuyaModule);

function App(): React.JSX.Element {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isCheckingStoredLogin, setIsCheckingStoredLogin] = useState(true);

  // Device control state
  const [deviceId, setDeviceId] = useState('');
  const [commandJson, setCommandJson] = useState('{"1": true}');
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [listenedDevices, setListenedDevices] = useState<Set<string>>(
    new Set(),
  );
  const [recentDevices, setRecentDevices] = useState<string[]>([]);

  // Home management state
  const [homes, setHomes] = useState<HomeBean[]>([]);
  const [activeHome, setActiveHome] = useState<HomeBean | null>(null);
  const [isLoadingHomes, setIsLoadingHomes] = useState(false);
  const [isCheckingHomes, setIsCheckingHomes] = useState(false);
  const [showCreateHome, setShowCreateHome] = useState(false);
  const [showMainDashboard, setShowMainDashboard] = useState(false);

  // Check for stored login on app startup
  useEffect(() => {
    const checkStoredLogin = async () => {
      try {
        const storedUser = StorageService.getUserData();
        const isStoredLoggedIn = StorageService.isLoggedIn();
        const storedLoginMethod = StorageService.getLoginMethod();
        const storedCredentials = StorageService.getCredentials();

        if (storedUser && isStoredLoggedIn) {
          setUser(storedUser);
          setIsLoggedIn(true);

          // Restore form data if available
          if (storedLoginMethod) {
            setLoginMethod(storedLoginMethod as LoginMethod);
          }
          if (storedCredentials) {
            if (storedCredentials.phoneNumber) {
              setPhoneNumber(storedCredentials.phoneNumber);
            }
            if (storedCredentials.email) {
              setEmail(storedCredentials.email);
            }
          }

          console.log('User auto-logged in:', storedUser.username);

          // Check user homes for auto-logged in user
          await checkUserHomes();
        }

        // Load recent devices
        const devices = StorageService.getDeviceList();
        setRecentDevices(devices);
      } catch (error) {
        console.error('Error checking stored login:', error);
      } finally {
        setIsCheckingStoredLogin(false);
      }
    };

    checkStoredLogin();
  }, []);

  useEffect(() => {
    // Subscribe to device events
    const dpUpdateSubscription = tuyaEventEmitter.addListener(
      'onDpUpdate',
      data => {
        console.log('DP Update:', data);
        updateDeviceStatus(data.devId, {dpStr: data.dpStr, online: true});
      },
    );

    const statusChangedSubscription = tuyaEventEmitter.addListener(
      'onStatusChanged',
      data => {
        console.log('Status Changed:', data);
        updateDeviceStatus(data.devId, {online: data.online});
      },
    );

    const deviceRemovedSubscription = tuyaEventEmitter.addListener(
      'onDeviceRemoved',
      data => {
        console.log('Device Removed:', data);
        removeDeviceStatus(data.devId);
        setListenedDevices(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.devId);
          return newSet;
        });
      },
    );

    return () => {
      dpUpdateSubscription.remove();
      statusChangedSubscription.remove();
      deviceRemovedSubscription.remove();
    };
  }, []);

  // Set up home change listeners when user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      const setupHomeListeners = async () => {
        try {
          await TuyaHomeModule.registerHomeChangeListener();
          console.log('Home change listener registered');

          const homeEventEmitter = TuyaHomeModule.getEventEmitter();

          const onHomeAdded = homeEventEmitter.addListener(
            'onHomeAdded',
            (data: HomeChangeEventData) => {
              console.log('Home added:', data);
              refreshHomes();
            },
          );

          const onHomeRemoved = homeEventEmitter.addListener(
            'onHomeRemoved',
            (data: HomeChangeEventData) => {
              console.log('Home removed:', data);
              refreshHomes();
            },
          );

          const onHomeInfoChanged = homeEventEmitter.addListener(
            'onHomeInfoChanged',
            (data: HomeChangeEventData) => {
              console.log('Home info changed:', data);
              if (
                data.homeId &&
                activeHome &&
                data.homeId === activeHome.homeId
              ) {
                // Refresh current home details if it's the active home
                TuyaHomeModule.getHomeDetail(data.homeId)
                  .then(updatedHome => {
                    handleHomeUpdate(updatedHome);
                  })
                  .catch(error => {
                    console.error(
                      'Error fetching updated home details:',
                      error,
                    );
                  });
              }
            },
          );

          const onServerConnectSuccess = homeEventEmitter.addListener(
            'onServerConnectSuccess',
            () => {
              console.log('Server connection successful');
            },
          );

          // Return cleanup function
          return () => {
            onHomeAdded.remove();
            onHomeRemoved.remove();
            onHomeInfoChanged.remove();
            onServerConnectSuccess.remove();
          };
        } catch (error) {
          console.error('Error setting up home listeners:', error);
        }
      };

      const cleanup = setupHomeListeners();

      return () => {
        if (cleanup && typeof cleanup === 'object' && 'then' in cleanup) {
          cleanup.then(cleanupFn => cleanupFn?.());
        }
      };
    }
  }, [isLoggedIn, activeHome]);

  const updateDeviceStatus = (
    devId: string,
    updates: Partial<DeviceStatus>,
  ) => {
    setDeviceStatuses(prev => {
      const existing = prev.find(device => device.devId === devId);
      if (existing) {
        return prev.map(device =>
          device.devId === devId
            ? {
                ...device,
                ...updates,
                lastUpdate: new Date().toLocaleTimeString(),
              }
            : device,
        );
      } else {
        return [
          ...prev,
          {
            devId,
            online: false,
            dpStr: '',
            lastUpdate: new Date().toLocaleTimeString(),
            ...updates,
          },
        ];
      }
    });
  };

  const removeDeviceStatus = (devId: string) => {
    setDeviceStatuses(prev => prev.filter(device => device.devId !== devId));
  };

  // Home management functions
  const checkUserHomes = async () => {
    console.log('Checking user homes...');
    setIsCheckingHomes(true);
    setIsLoadingHomes(true);

    try {
      const homeList = await TuyaHomeModule.queryHomeList();
      console.log('Retrieved homes:', homeList);

      setHomes(homeList);

      if (homeList && homeList.length > 0) {
        // User has homes, set the first one as active and show main dashboard
        const firstHome = homeList[0];
        setActiveHome(firstHome);
        setShowMainDashboard(true);
        setShowCreateHome(false);
        console.log(
          'User has homes, navigating to dashboard with home:',
          firstHome.name,
        );
      } else {
        // User has no homes, show create home screen
        setActiveHome(null);
        setShowCreateHome(true);
        setShowMainDashboard(false);
        console.log('User has no homes, showing create home screen');
      }
    } catch (error) {
      console.error('Error checking user homes:', error);
      Alert.alert('Error', 'Failed to fetch home list. Please try again.');
      // On error, default to create home screen
      setShowCreateHome(true);
      setShowMainDashboard(false);
    } finally {
      setIsLoadingHomes(false);
      setIsCheckingHomes(false);
    }
  };

  const refreshHomes = async () => {
    try {
      setIsLoadingHomes(true);
      const homeList = await TuyaHomeModule.queryHomeList();
      setHomes(homeList);

      // If we currently have no active home and homes exist, set the first one
      if (!activeHome && homeList.length > 0) {
        setActiveHome(homeList[0]);
        setShowMainDashboard(true);
        setShowCreateHome(false);
      } else if (homeList.length === 0) {
        // If no homes exist, show create home screen
        setActiveHome(null);
        setShowCreateHome(true);
        setShowMainDashboard(false);
      }
    } catch (error) {
      console.error('Error refreshing homes:', error);
    } finally {
      setIsLoadingHomes(false);
    }
  };

  const handleHomeCreated = async (newHome: HomeBean) => {
    console.log('Home created successfully:', newHome);
    setActiveHome(newHome);
    setHomes([newHome]); // For now, just set the new home as the only home
    setShowCreateHome(false);
    setShowMainDashboard(true);

    // Refresh the home list to get the most up-to-date information
    await refreshHomes();
  };

  const handleSwitchHome = (home: HomeBean) => {
    setActiveHome(home);
  };

  const handleHomeUpdate = (updatedHome: HomeBean) => {
    setActiveHome(updatedHome);
    setHomes(prev =>
      prev.map(h => (h.homeId === updatedHome.homeId ? updatedHome : h)),
    );
  };

  const handleEditHome = (home: HomeBean) => {
    // For now, just log that edit was requested
    // In a full implementation, you'd show an edit home screen
    console.log('Edit home requested for:', home.name);
    Alert.alert(
      'Edit Home',
      'Edit home functionality would be implemented here',
    );
  };

  const handleCreateNewHome = () => {
    setShowCreateHome(true);
    setShowMainDashboard(false);
  };

  const handlePhoneLogin = async () => {
    if (!phoneNumber || !password) {
      Alert.alert('Error', 'Please enter phone number and password');
      return;
    }

    setIsLoading(true);
    try {
      const userData = await TuyaModule.loginWithPhone(phoneNumber, password);
      setUser(userData);
      setIsLoggedIn(true);

      // Save to storage
      StorageService.saveUserData(userData);
      StorageService.saveLoginMethod('phone');
      StorageService.saveCredentials({phoneNumber});

      Alert.alert('Success', `Welcome ${userData.username}!`);

      // Check user homes after successful login
      await checkUserHomes();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const userData = await TuyaModule.loginWithEmail(email, password);
      setUser(userData);
      setIsLoggedIn(true);

      // Save to storage
      StorageService.saveUserData(userData);
      StorageService.saveLoginMethod('email');
      StorageService.saveCredentials({email});

      Alert.alert('Success', `Welcome ${userData.username}!`);

      // Check user homes after successful login
      await checkUserHomes();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerificationCode = async (isRegister: boolean = false) => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await TuyaModule.sendVerificationCodeToEmail(email, isRegister);
      setCodeSent(true);
      const action = isRegister ? 'registration' : 'login';
      Alert.alert(
        'Success',
        `Verification code sent to your email for ${action}!`,
      );
    } catch (error: any) {
      Alert.alert(
        'Failed to Send Code',
        error.message || 'Unknown error occurred',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!email || !verificationCode) {
      Alert.alert('Error', 'Please enter email and verification code');
      return;
    }

    setIsLoading(true);
    try {
      const userData = await TuyaModule.verifyEmailCode(
        email,
        verificationCode,
      );
      setUser(userData);
      setIsLoggedIn(true);

      // Save to storage
      StorageService.saveUserData(userData);
      StorageService.saveLoginMethod('emailCode');
      StorageService.saveCredentials({email});

      Alert.alert('Success', `Welcome ${userData.username}!`);

      // Check user homes after successful login
      await checkUserHomes();
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.message || 'Unknown error occurred',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterUser = async () => {
    if (!email || !password || !verificationCode) {
      Alert.alert(
        'Error',
        'Please enter email, password, and verification code',
      );
      return;
    }

    setIsLoading(true);
    try {
      const userData = await TuyaModule.registerUsingEmail(
        email,
        password,
        verificationCode,
      );
      setUser(userData);
      setIsLoggedIn(true);

      // Save to storage
      StorageService.saveUserData(userData);
      StorageService.saveLoginMethod('register');
      StorageService.saveCredentials({email});

      Alert.alert(
        'Success',
        `Registration successful! Welcome ${userData.username}!`,
      );

      // Check user homes after successful registration
      await checkUserHomes();
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.message || 'Unknown error occurred',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    switch (loginMethod) {
      case 'phone':
        handlePhoneLogin();
        break;
      case 'email':
        handleEmailLogin();
        break;
      case 'emailCode':
        if (codeSent) {
          handleVerifyEmailCode();
        } else {
          handleSendVerificationCode(false);
        }
        break;
      case 'register':
        if (codeSent) {
          handleRegisterUser();
        } else {
          handleSendVerificationCode(true);
        }
        break;
    }
  };

  const handleLogout = async () => {
    // Unregister all device listeners before logout
    listenedDevices.forEach(async devId => {
      try {
        await TuyaModule.unregisterDeviceListener(devId);
      } catch (error) {
        console.warn(`Failed to unregister listener for ${devId}:`, error);
      }
    });

    // Unregister home change listeners
    try {
      await TuyaHomeModule.unregisterHomeChangeListener();
    } catch (error) {
      console.warn('Failed to unregister home change listener:', error);
    }

    // Clear storage
    StorageService.logout();

    setIsLoggedIn(false);
    setUser(null);
    setDeviceStatuses([]);
    setListenedDevices(new Set());
    setRecentDevices([]);
    setPhoneNumber('');
    setEmail('');
    setPassword('');
    setVerificationCode('');
    setCodeSent(false);
    setLoginMethod('phone');

    // Clear home-related state
    setHomes([]);
    setActiveHome(null);
    setIsLoadingHomes(false);
    setIsCheckingHomes(false);
    setShowCreateHome(false);
    setShowMainDashboard(false);
  };

  const sendCommand = async () => {
    if (!deviceId || !commandJson) {
      Alert.alert('Error', 'Please enter device ID and command JSON');
      return;
    }

    try {
      await TuyaModule.publishDps(deviceId, commandJson);

      // Save device to recent list
      StorageService.addDevice(deviceId);

      // Update local recent devices list
      const updatedDevices = StorageService.getDeviceList();
      setRecentDevices(updatedDevices);

      Alert.alert('Success', 'Command sent successfully');
    } catch (error: any) {
      Alert.alert('Command Failed', error.message || 'Unknown error occurred');
    }
  };

  const toggleDeviceListener = async (devId: string) => {
    if (!devId) {
      Alert.alert('Error', 'Please enter a device ID');
      return;
    }

    try {
      if (listenedDevices.has(devId)) {
        await TuyaModule.unregisterDeviceListener(devId);
        setListenedDevices(prev => {
          const newSet = new Set(prev);
          newSet.delete(devId);
          return newSet;
        });
        Alert.alert('Success', `Stopped listening to ${devId}`);
      } else {
        await TuyaModule.registerDeviceListener(devId);
        setListenedDevices(prev => new Set(prev).add(devId));
        Alert.alert('Success', `Started listening to ${devId}`);
      }
    } catch (error: any) {
      Alert.alert('Listener Error', error.message || 'Unknown error occurred');
    }
  };

  const renderLoginMethodSelector = () => (
    <View style={styles.methodSelector}>
      <Text style={styles.methodSelectorTitle}>Choose Login Method</Text>
      <View style={styles.methodOptions}>
        {[
          {key: 'phone' as LoginMethod, label: '📱 Phone & Password'},
          {key: 'email' as LoginMethod, label: '📧 Email & Password'},
          {
            key: 'emailCode' as LoginMethod,
            label: '🔐 Email & Verification Code',
          },
          {key: 'register' as LoginMethod, label: '✨ Register with Email'},
        ].map(method => (
          <TouchableOpacity
            key={method.key}
            style={[
              styles.methodOption,
              loginMethod === method.key && styles.methodOptionSelected,
            ]}
            onPress={() => {
              setLoginMethod(method.key);
              setCodeSent(false);
              setVerificationCode('');
            }}>
            <Text
              style={[
                styles.methodOptionText,
                loginMethod === method.key && styles.methodOptionTextSelected,
              ]}>
              {method.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPhoneLoginForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Enter phone number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          placeholderTextColor="#999"
          secureTextEntry
        />
      </View>
    </>
  );

  const renderEmailLoginForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email address"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          placeholderTextColor="#999"
          secureTextEntry
        />
      </View>
    </>
  );

  const renderEmailCodeLoginForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email address"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!codeSent}
        />
      </View>

      {codeSent && (
        <>
          <View style={styles.codeStatusContainer}>
            <Text style={styles.codeStatusText}>
              ✅ Verification code sent to {email}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="Enter verification code"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>
        </>
      )}

      {codeSent && (
        <TouchableOpacity
          style={styles.resendButton}
          onPress={() => {
            setCodeSent(false);
            setVerificationCode('');
          }}>
          <Text style={styles.resendButtonText}>Send New Code</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const renderRegisterForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email address"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!codeSent}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          placeholderTextColor="#999"
          secureTextEntry
          editable={!codeSent}
        />
      </View>

      {codeSent && (
        <>
          <View style={styles.codeStatusContainer}>
            <Text style={styles.codeStatusText}>
              ✅ Verification code sent to {email} for registration
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="Enter verification code"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>
        </>
      )}

      {codeSent && (
        <TouchableOpacity
          style={styles.resendButton}
          onPress={() => {
            setCodeSent(false);
            setVerificationCode('');
          }}>
          <Text style={styles.resendButtonText}>Send New Code</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const getLoginButtonText = () => {
    if (loginMethod === 'emailCode') {
      return codeSent ? 'Verify Code' : 'Send Code';
    }
    if (loginMethod === 'register') {
      return codeSent ? 'Complete Registration' : 'Send Verification Code';
    }
    return 'Login';
  };

  const renderLoginScreen = () => (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.loginContainer}>
        <Text style={styles.title}>
          {loginMethod === 'register'
            ? 'Create Tuya Account'
            : 'Tuya IoT Login'}
        </Text>

        {renderLoginMethodSelector()}

        {loginMethod === 'phone' && renderPhoneLoginForm()}
        {loginMethod === 'email' && renderEmailLoginForm()}
        {loginMethod === 'emailCode' && renderEmailCodeLoginForm()}
        {loginMethod === 'register' && renderRegisterForm()}

        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={handleLogin}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{getLoginButtonText()}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDashboard = () => (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome, {user?.username}</Text>
          <Text style={styles.userIdText}>User ID: {user?.userId}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Device Control Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Control</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Device ID</Text>
          <TextInput
            style={styles.input}
            value={deviceId}
            onChangeText={setDeviceId}
            placeholder="Enter device ID"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Command JSON</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={commandJson}
            onChangeText={setCommandJson}
            placeholder='{"1": true, "2": 50}'
            placeholderTextColor="#999"
            multiline
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={sendCommand}>
          <Text style={styles.buttonText}>Send Command</Text>
        </TouchableOpacity>

        <View style={styles.listenerContainer}>
          <Text style={styles.label}>Device Listener</Text>
          <View style={styles.listenerRow}>
            <Text style={styles.listenerText}>
              {listenedDevices.has(deviceId) ? 'Listening' : 'Not Listening'}
            </Text>
            <Switch
              value={listenedDevices.has(deviceId)}
              onValueChange={() => toggleDeviceListener(deviceId)}
              trackColor={{false: '#767577', true: '#81b0ff'}}
              thumbColor={listenedDevices.has(deviceId) ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {/* Recent Devices Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Recent Devices ({recentDevices.length})
        </Text>

        {recentDevices.length === 0 ? (
          <Text style={styles.emptyText}>No recent devices</Text>
        ) : (
          <View style={styles.recentDevicesContainer}>
            {recentDevices.slice(0, 5).map((devId, index) => (
              <TouchableOpacity
                key={devId}
                style={styles.recentDeviceChip}
                onPress={() => setDeviceId(devId)}>
                <Text style={styles.recentDeviceText}>{devId}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Device Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Device Status ({deviceStatuses.length})
        </Text>

        {deviceStatuses.length === 0 ? (
          <Text style={styles.emptyText}>No device status available</Text>
        ) : (
          deviceStatuses.map(device => (
            <View key={device.devId} style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceId}>{device.devId}</Text>
                <View
                  style={[
                    styles.statusIndicator,
                    {backgroundColor: device.online ? '#4CAF50' : '#F44336'},
                  ]}>
                  <Text style={styles.statusText}>
                    {device.online ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>

              <Text style={styles.deviceLabel}>Data Points:</Text>
              <Text style={styles.deviceData}>{device.dpStr || 'No data'}</Text>

              <Text style={styles.lastUpdate}>
                Last Update: {device.lastUpdate}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Active Listeners Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Active Listeners ({listenedDevices.size})
        </Text>

        {listenedDevices.size === 0 ? (
          <Text style={styles.emptyText}>No active listeners</Text>
        ) : (
          Array.from(listenedDevices).map(devId => (
            <View key={devId} style={styles.listenerCard}>
              <Text style={styles.listenerDeviceId}>{devId}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => toggleDeviceListener(devId)}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  // Loading screen while checking stored login
  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  if (isCheckingStoredLogin) {
    return (
      <>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#f5f5f5"
          translucent={false}
          hidden={false}
          animated={true}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>{renderLoadingScreen()}</View>
        </SafeAreaView>
      </>
    );
  }

  // Determine what screen to show based on app state
  const renderCurrentScreen = () => {
    if (!isLoggedIn) {
      return renderLoginScreen();
    }

    if (isCheckingHomes || isLoadingHomes) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {isCheckingHomes ? 'Checking your homes...' : 'Loading...'}
          </Text>
        </View>
      );
    }

    if (showCreateHome) {
      return (
        <CreateHomeScreen
          onHomeCreated={handleHomeCreated}
          onCancel={() => {
            // If user has existing homes, go back to dashboard
            if (homes.length > 0 && homes[0]) {
              setActiveHome(homes[0]);
              setShowCreateHome(false);
              setShowMainDashboard(true);
            }
            // If no homes exist, user must create one, so don't allow cancel
          }}
        />
      );
    }

    if (showMainDashboard && activeHome) {
      return (
        <MainDashboard
          activeHome={activeHome}
          allHomes={homes}
          onHomeUpdate={handleHomeUpdate}
          onHomesRefresh={refreshHomes}
          onSwitchHome={handleSwitchHome}
          onEditHome={handleEditHome}
          onCreateNewHome={handleCreateNewHome}
        />
      );
    }

    // Fallback to device control dashboard if for some reason we reach here
    return renderDashboard();
  };

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#f5f5f5"
        translucent={false}
        hidden={false}
        animated={true}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>{renderCurrentScreen()}</View>
      </SafeAreaView>
    </>
  );
}

// Calculate safe area padding
const statusBarHeight =
  Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
const safeAreaPadding = statusBarHeight + 10;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: safeAreaPadding,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    minHeight: 500,
    paddingTop: 40, // Extra padding to ensure content doesn't overlap
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userIdText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButton: {
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listenerContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  listenerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  listenerText: {
    fontSize: 16,
    color: '#333',
  },
  deviceCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deviceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  deviceData: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  listenerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  listenerDeviceId: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Recent devices styles
  recentDevicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentDeviceChip: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  recentDeviceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  // Login method selector styles
  methodSelector: {
    marginBottom: 20,
  },
  methodSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  methodOptions: {
    gap: 8,
  },
  methodOption: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  methodOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  methodOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  methodOptionTextSelected: {
    color: '#007AFF',
  },
  // Email verification styles
  codeStatusContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c3e6c3',
  },
  codeStatusText: {
    fontSize: 14,
    color: '#2e7d32',
    textAlign: 'center',
    fontWeight: '500',
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Loading screen styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default App;
