export interface User {
  username: string;
  userId: string;
}

export interface DeviceStatus {
  devId: string;
  online: boolean;
  dpStr: string;
  lastUpdate: string;
}

export interface TuyaEventData {
  devId: string;
  dpStr?: string;
  online?: boolean;
}

// Home Management Types
export interface Room {
  name: string;
  roomId: number;
}

export interface WeatherBean {
  condition: string;
  temp: string;
  iconUrl: string;
  inIconUrl: string;
}

export interface DeviceBean {
  devId: string;
  name: string;
  mac: string;
  isOnline: boolean;
  accessType: number;
  dpName: string;
  communicationId: string;
  connectionStatus: number;
  iconUrl: string;
  productId: string;
}

export interface HomeBean {
  lat: number;
  lon: number;
  homeId: number;
  geoName: string;
  name: string;
  admin: boolean;
  homeStatus: number;
  role: number;
  rooms: Room[];
  devices: DeviceBean[];
}

export interface DeviceAndGroupSortItem {
  bizId: string;
  bizType: 'DEVICE' | 'GROUP';
}

export interface HomeChangeEventData {
  homeId?: number;
  homeName?: string;
  deviceIds?: string[];
  groupIds?: number[];
}

// Home Management Module Interface
export interface TuyaHomeModuleInterface {
  createHome(
    name: string,
    lon: number,
    lat: number,
    geoName: string,
    rooms: string[],
  ): Promise<number>;
  queryHomeList(): Promise<HomeBean[]>;
  getHomeDetail(homeId: number): Promise<HomeBean>;
  getHomeLocalCache(homeId: number): Promise<HomeBean>;
  updateHome(
    homeId: number,
    name: string,
    lon: number,
    lat: number,
    geoName: string,
    rooms: string[],
    overwriteRooms: boolean,
  ): Promise<void>;
  dismissHome(homeId: number): Promise<void>;
  getHomeWeatherSketch(
    homeId: number,
    lon: number,
    lat: number,
  ): Promise<WeatherBean | null>;
  sortDevInHome(
    homeId: number,
    sortList: DeviceAndGroupSortItem[],
  ): Promise<void>;
  registerHomeChangeListener(): Promise<boolean>;
  unregisterHomeChangeListener(): Promise<boolean>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export interface TuyaModuleInterface {
  loginWithPhone(phoneNumber: string, password: string): Promise<User>;
  loginWithEmail(email: string, password: string): Promise<User>;
  sendVerificationCodeToEmail(
    email: string,
    isRegister: boolean,
  ): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<User>;
  registerUsingEmail(
    email: string,
    password: string,
    code: string,
  ): Promise<User>;
  publishDps(devId: string, dpsJson: string): Promise<void>;
  registerDeviceListener(devId: string): Promise<string>;
  unregisterDeviceListener(devId: string): Promise<string>;
}

export type TuyaEventNames =
  | 'onDpUpdate'
  | 'onStatusChanged'
  | 'onDeviceRemoved';

export type HomeEventNames =
  | 'onHomeAdded'
  | 'onHomeInvite'
  | 'onHomeRemoved'
  | 'onHomeInfoChanged'
  | 'onSharedDeviceList'
  | 'onSharedGroupList'
  | 'onServerConnectSuccess';

export type LoginMethod = 'phone' | 'email' | 'emailCode' | 'register';

// Pairing Types
export interface ScannedDevice {
  id: string;
  name: string;
  mac: string;
  rssi: number;
  address: string;
  uuid: string;
  deviceType: number;
  productId: string;
  configType: string; // 'config_type_single' or 'config_type_wifi'
  isBind: boolean;
  flag: number;
}

export interface DeviceInfo {
  name: string;
  icon: string;
  productId: string;
}

export interface PairedDevice {
  devId: string;
  name: string;
  iconUrl: string;
  productId: string;
  uuid: string;
  isOnline: boolean;
}

export interface BlePairingParams {
  homeId: number;
  uuid: string;
  deviceType: number;
  productId?: string;
  address?: string;
  isShare?: boolean;
  timeout?: number;
}

export interface ComboPairingParams {
  homeId: number;
  uuid: string;
  deviceType: number;
  token: string;
  ssid: string;
  password: string;
  mac?: string;
  address?: string;
  timeout?: number;
}

export interface WiFiEzPairingParams {
  homeId: number;
  ssid: string;
  password: string;
  token: string;
  timeout?: number;
}

export type PairingMode = 'ble' | 'combo' | 'wifi-ez';

export type WiFiEzPairingStep =
  | 'getting_token'
  | 'broadcasting_ssid'
  | 'device_connecting'
  | 'device_binding'
  | 'success';

export interface TuyaPairingModuleInterface {
  startLeScan(timeout: number): Promise<void>;
  getDeviceInfo(
    productId: string,
    uuid: string,
    mac: string,
  ): Promise<DeviceInfo>;
  manuallyStopScanning(): Promise<void>;
  startBleDevicePairing(params: BlePairingParams): Promise<PairedDevice>;
  stopBleDevicePairing(uuid: string): Promise<boolean>;
  startComboDevicePairing(params: ComboPairingParams): Promise<PairedDevice>;
  stopComboDevicePairing(uuid: string): Promise<boolean>;
  getCurrentWiFiSSID(): Promise<string | null>;
  getEzPairingToken(homeId: number): Promise<string>;
  startEzPairing(params: WiFiEzPairingParams): Promise<PairedDevice>;
  stopEzPairing(): Promise<boolean>;
}

export type PairingEventNames = 'onLeScan' | 'onEzPairingStep';

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  DeviceControl: undefined;
  DeviceDetailControl: {
    device: DeviceBean;
    homeId: number;
    homeName: string;
  };
  DevicePairing: {
    homeId: number;
    homeName: string;
  };
  CreateHome: undefined;
  EditHome: {
    home: HomeBean;
  };
};

// Auth Types
export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginFormState {
  method: LoginMethod;
  phoneNumber: string;
  email: string;
  password: string;
  verificationCode: string;
  codeSent: boolean;
  isLoading: boolean;
  error: string | null;
}

export type LoginFormAction =
  | {type: 'SET_METHOD'; payload: LoginMethod}
  | {type: 'SET_FIELD'; payload: {field: keyof LoginFormState; value: string}}
  | {type: 'SET_CODE_SENT'; payload: boolean}
  | {type: 'SET_LOADING'; payload: boolean}
  | {type: 'SET_ERROR'; payload: string | null}
  | {type: 'RESET_FORM'};

// Device Types
export interface DeviceControlState {
  deviceStatuses: DeviceStatus[];
  listenedDevices: Set<string>;
  recentDevices: string[];
  isLoading: boolean;
  error: string | null;
}

// App State Types
export interface AppState {
  isLoggedIn: boolean;
  user: User | null;
  homes: HomeBean[];
  activeHome: HomeBean | null;
  isLoadingHomes: boolean;
}
