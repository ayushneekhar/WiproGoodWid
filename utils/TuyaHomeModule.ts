import {NativeModules, NativeEventEmitter} from 'react-native';
import {
  TuyaHomeModuleInterface,
  HomeBean,
  WeatherBean,
  DeviceAndGroupSortItem,
  HomeEventNames,
} from '../types/TuyaTypes';

// Get the native module - it should be registered as "TuyaConnectionModule"
// based on the getName() method in the Kotlin code
const {TuyaConnectionModule} = NativeModules;

if (!TuyaConnectionModule) {
  throw new Error(
    'TuyaConnectionModule not found. Make sure the native module is properly linked.',
  );
}

class TuyaHomeModule implements TuyaHomeModuleInterface {
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(TuyaConnectionModule);
  }

  /**
   * Creates a new home.
   * @param name The name of the home (up to 25 characters).
   * @param lon The longitude of the home.
   * @param lat The latitude of the home.
   * @param geoName The geographical location name of the home.
   * @param rooms A list of room names to be created in the home.
   * @returns Promise that resolves with the new home's ID
   */
  async createHome(
    name: string,
    lon: number,
    lat: number,
    geoName: string,
    rooms: string[],
  ): Promise<number> {
    try {
      const homeId = await TuyaConnectionModule.createHome(
        name,
        lon,
        lat,
        geoName,
        rooms,
      );
      return homeId;
    } catch (error) {
      console.error('TuyaHomeModule.createHome error:', error);
      throw error;
    }
  }

  /**
   * Queries the list of homes associated with the current user account.
   * @returns Promise that resolves with an array of home objects
   */
  async queryHomeList(): Promise<HomeBean[]> {
    try {
      const homes = await TuyaConnectionModule.queryHomeList();
      return homes || [];
    } catch (error) {
      console.error('TuyaHomeModule.queryHomeList error:', error);
      throw error;
    }
  }

  /**
   * Retrieves the detailed information for a specific home, including devices, groups, and rooms.
   * @param homeId The ID of the home to query.
   * @returns Promise that resolves with the detailed home object
   */
  async getHomeDetail(homeId: number): Promise<HomeBean> {
    try {
      const homeDetail = await TuyaConnectionModule.getHomeDetail(homeId);
      return homeDetail;
    } catch (error) {
      console.error('TuyaHomeModule.getHomeDetail error:', error);
      throw error;
    }
  }

  /**
   * Retrieves the detailed information for a specific home from the local cache.
   * @param homeId The ID of the home to query.
   * @returns Promise that resolves with the cached detailed home object
   */
  async getHomeLocalCache(homeId: number): Promise<HomeBean> {
    try {
      const homeDetail = await TuyaConnectionModule.getHomeLocalCache(homeId);
      return homeDetail;
    } catch (error) {
      console.error('TuyaHomeModule.getHomeLocalCache error:', error);
      throw error;
    }
  }

  /**
   * Updates the information for a specific home.
   * @param homeId The ID of the home to update.
   * @param name The new name for the home.
   * @param lon The new longitude for the home.
   * @param lat The new latitude for the home.
   * @param geoName The new geographical name for the home.
   * @param rooms The new list of room names.
   * @param overwriteRooms Whether to overwrite existing rooms or merge.
   * @returns Promise that resolves on success
   */
  async updateHome(
    homeId: number,
    name: string,
    lon: number,
    lat: number,
    geoName: string,
    rooms: string[],
    overwriteRooms: boolean,
  ): Promise<void> {
    try {
      await TuyaConnectionModule.updateHome(
        homeId,
        name,
        lon,
        lat,
        geoName,
        rooms,
        overwriteRooms,
      );
    } catch (error) {
      console.error('TuyaHomeModule.updateHome error:', error);
      throw error;
    }
  }

  /**
   * Dismisses a home, effectively deleting it. Only the home owner can perform this action.
   * @param homeId The ID of the home to dismiss.
   * @returns Promise that resolves on success
   */
  async dismissHome(homeId: number): Promise<void> {
    try {
      await TuyaConnectionModule.dismissHome(homeId);
    } catch (error) {
      console.error('TuyaHomeModule.dismissHome error:', error);
      throw error;
    }
  }

  /**
   * Queries the weather overview for the home's location.
   * @param homeId The ID of the home.
   * @param lon The longitude for the weather query.
   * @param lat The latitude for the weather query.
   * @returns Promise that resolves with the weather sketch object
   */
  async getHomeWeatherSketch(
    homeId: number,
    lon: number,
    lat: number,
  ): Promise<WeatherBean | null> {
    try {
      const weather = await TuyaConnectionModule.getHomeWeatherSketch(
        homeId,
        lon,
        lat,
      );
      return weather;
    } catch (error) {
      console.error('TuyaHomeModule.getHomeWeatherSketch error:', error);
      throw error;
    }
  }

  /**
   * Sorts the devices and groups within a home.
   * @param homeId The ID of the home.
   * @param sortList An array of objects, each with 'bizId' (String) and 'bizType' (String: "DEVICE" or "GROUP").
   * @returns Promise that resolves on success
   */
  async sortDevInHome(
    homeId: number,
    sortList: DeviceAndGroupSortItem[],
  ): Promise<void> {
    try {
      await TuyaConnectionModule.sortDevInHome(homeId, sortList);
    } catch (error) {
      console.error('TuyaHomeModule.sortDevInHome error:', error);
      throw error;
    }
  }

  /**
   * Registers a listener for global home information changes (added, removed, info changed, etc.).
   * Events are sent to JavaScript via the DeviceEventEmitter.
   * @returns Promise that resolves if the listener is registered, rejects if already registered.
   */
  async registerHomeChangeListener(): Promise<boolean> {
    try {
      const result = await TuyaConnectionModule.registerHomeChangeListener();
      return result;
    } catch (error) {
      console.error('TuyaHomeModule.registerHomeChangeListener error:', error);
      throw error;
    }
  }

  /**
   * Unregisters the global home information change listener.
   * @returns Promise that resolves on success
   */
  async unregisterHomeChangeListener(): Promise<boolean> {
    try {
      const result = await TuyaConnectionModule.unregisterHomeChangeListener();
      return result;
    } catch (error) {
      console.error(
        'TuyaHomeModule.unregisterHomeChangeListener error:',
        error,
      );
      throw error;
    }
  }

  /**
   * Required for new NativeEventEmitter syntax - adds a listener for the specified event
   * @param eventName The name of the event to listen for
   */
  addListener(eventName: string): void {
    TuyaConnectionModule.addListener(eventName);
  }

  /**
   * Required for new NativeEventEmitter syntax - removes listeners
   * @param count The number of listeners to remove
   */
  removeListeners(count: number): void {
    TuyaConnectionModule.removeListeners(count);
  }

  /**
   * Subscribe to home change events
   * @param eventName The event to listen for
   * @param listener The callback function
   * @returns The subscription object with a remove() method
   */
  addHomeEventListener(
    eventName: HomeEventNames,
    listener: (data: any) => void,
  ) {
    return this.eventEmitter.addListener(eventName, listener);
  }

  /**
   * Get the event emitter instance for advanced usage
   * @returns The NativeEventEmitter instance
   */
  getEventEmitter(): NativeEventEmitter {
    return this.eventEmitter;
  }
}

// Export singleton instance
const tuyaHomeModule = new TuyaHomeModule();
export default tuyaHomeModule;
