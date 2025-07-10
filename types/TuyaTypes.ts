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

// App State Types
export interface AppState {
  isLoggedIn: boolean;
  user: User | null;
  homes: HomeBean[];
  activeHome: HomeBean | null;
  isLoadingHomes: boolean;
}
