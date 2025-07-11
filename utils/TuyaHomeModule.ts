import {NativeModules, NativeEventEmitter} from 'react-native';
import {
  TuyaHomeModuleInterface,
  HomeBean,
  WeatherBean,
  DeviceAndGroupSortItem,
  HomeEventNames,
} from '../types/TuyaTypes';

// Get the native module - it should be registered as "TuyaHomeModule"
// based on the getName() method in the Kotlin code
const {TuyaHomeModule} = NativeModules;

if (!TuyaHomeModule) {
  throw new Error(
    'TuyaHomeModule not found. Make sure the native module is properly linked.',
  );
}

// Global listener management
let isHomeListenerRegistered = false;
let listenerRefCount = 0;

class TuyaHomeModuleClass implements TuyaHomeModuleInterface {
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(TuyaHomeModule);
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
      const homeId = await TuyaHomeModule.createHome(
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
      const homes = await TuyaHomeModule.queryHomeList();
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
      const homeDetail = await TuyaHomeModule.getHomeDetail(homeId);
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
      const homeDetail = await TuyaHomeModule.getHomeLocalCache(homeId);
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
      await TuyaHomeModule.updateHome(
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
      await TuyaHomeModule.dismissHome(homeId);
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
      const weather = await TuyaHomeModule.getHomeWeatherSketch(
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
      await TuyaHomeModule.sortDevInHome(homeId, sortList);
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
      // Increment reference count
      listenerRefCount++;

      // Only register if not already registered
      if (!isHomeListenerRegistered) {
        const result = await TuyaHomeModule.registerHomeChangeListener();
        isHomeListenerRegistered = true;
        console.log('Global home change listener registered successfully');
        return result;
      } else {
        console.log(
          'Home change listener already registered globally, reusing existing listener',
        );
        return true;
      }
    } catch (error) {
      // Decrement ref count if registration failed
      listenerRefCount = Math.max(0, listenerRefCount - 1);
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
      // Decrement reference count
      listenerRefCount = Math.max(0, listenerRefCount - 1);

      // Only unregister if no more references and currently registered
      if (listenerRefCount === 0 && isHomeListenerRegistered) {
        const result = await TuyaHomeModule.unregisterHomeChangeListener();
        isHomeListenerRegistered = false;
        console.log('Global home change listener unregistered');
        return result;
      } else {
        console.log(
          `Home change listener still in use (${listenerRefCount} references remaining)`,
        );
        return true;
      }
    } catch (error) {
      console.error(
        'TuyaHomeModule.unregisterHomeChangeListener error:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get current listener status
   */
  isListenerRegistered(): boolean {
    return isHomeListenerRegistered;
  }

  /**
   * Get current reference count
   */
  getListenerRefCount(): number {
    return listenerRefCount;
  }

  /**
   * Required for new NativeEventEmitter syntax - adds a listener for the specified event
   * @param eventName The name of the event to listen for
   */
  addListener(eventName: string): void {
    TuyaHomeModule.addListener(eventName);
  }

  /**
   * Required for new NativeEventEmitter syntax - removes listeners
   * @param count The number of listeners to remove
   */
  removeListeners(count: number): void {
    TuyaHomeModule.removeListeners(count);
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
   * Get the event emitter instance
   * @returns The NativeEventEmitter instance
   */
  getEventEmitter(): NativeEventEmitter {
    return this.eventEmitter;
  }
}

// Export a singleton instance
const TuyaHomeModuleInstance = new TuyaHomeModuleClass();
export default TuyaHomeModuleInstance;
