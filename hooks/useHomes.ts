import {useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import {
  HomeBean,
  HomeChangeEventData,
  HomeEventNames,
} from '../types/TuyaTypes';
import TuyaHomeModule from '../utils/TuyaHomeModule';

export interface UseHomesReturn {
  homes: HomeBean[];
  activeHome: HomeBean | null;
  isLoading: boolean;
  error: string | null;
  // Actions
  loadHomes: () => Promise<void>;
  refreshHomes: () => Promise<void>;
  setActiveHome: (home: HomeBean) => void;
  createHome: (
    name: string,
    lon: number,
    lat: number,
    geoName: string,
    rooms: string[],
  ) => Promise<HomeBean>;
  updateHome: (
    homeId: number,
    name: string,
    lon: number,
    lat: number,
    geoName: string,
    rooms: string[],
    overwriteRooms: boolean,
  ) => Promise<void>;
  dismissHome: (homeId: number) => Promise<void>;
  getHomeDetail: (homeId: number) => Promise<HomeBean>;
  clearError: () => void;
}

export const useHomes = (): UseHomesReturn => {
  const [homes, setHomes] = useState<HomeBean[]>([]);
  const [activeHome, setActiveHomeState] = useState<HomeBean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set up home change listeners
  useEffect(() => {
    let eventListenerCleanup: (() => void) | undefined;

    const setupHomeListeners = async () => {
      try {
        // Register the listener - TuyaHomeModule handles reference counting
        await TuyaHomeModule.registerHomeChangeListener();

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
            if (data.homeId) {
              // Refresh home details regardless of which home it is
              getHomeDetail(data.homeId)
                .then(updatedHome => {
                  setHomes(prev =>
                    prev.map(h =>
                      h.homeId === updatedHome.homeId ? updatedHome : h,
                    ),
                  );

                  // Update active home if it's the one that changed
                  setActiveHomeState(prev =>
                    prev && prev.homeId === updatedHome.homeId
                      ? updatedHome
                      : prev,
                  );
                })
                .catch(error => {
                  console.error('Error fetching updated home details:', error);
                });
            }
          },
        );

        eventListenerCleanup = () => {
          onHomeAdded.remove();
          onHomeRemoved.remove();
          onHomeInfoChanged.remove();
        };
      } catch (error) {
        console.error('Error setting up home listeners:', error);
      }
    };

    setupHomeListeners();

    return () => {
      // Clean up event listeners
      if (eventListenerCleanup) {
        eventListenerCleanup();
      }

      // Unregister with reference counting - only actually unregisters when no more refs
      TuyaHomeModule.unregisterHomeChangeListener().catch(console.error);
    };
  }, []); // Remove activeHome dependency to prevent re-registration

  const loadHomes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading user homes...');
      const userHomes = await TuyaHomeModule.queryHomeList();
      console.log('User homes loaded:', userHomes);

      setHomes(userHomes);

      // Set active home to first one if none is set
      if (userHomes.length > 0 && !activeHome) {
        setActiveHomeState(userHomes[0]);
      }

      // If current active home was deleted, switch to first available
      if (activeHome && !userHomes.find(h => h.homeId === activeHome.homeId)) {
        setActiveHomeState(userHomes.length > 0 ? userHomes[0] : null);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load homes';
      setError(errorMessage);
      console.error('Error loading homes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeHome]);

  const refreshHomes = useCallback(async () => {
    setIsLoading(true);
    try {
      const userHomes = await TuyaHomeModule.queryHomeList();
      setHomes(userHomes);

      // If the active home was deleted, switch to the first available home
      if (activeHome && !userHomes.find(h => h.homeId === activeHome.homeId)) {
        setActiveHomeState(userHomes.length > 0 ? userHomes[0] : null);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to refresh homes';
      setError(errorMessage);
      console.error('Error refreshing homes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeHome]);

  const setActiveHome = useCallback((home: HomeBean) => {
    setActiveHomeState(home);
  }, []);

  const createHome = useCallback(
    async (
      name: string,
      lon: number,
      lat: number,
      geoName: string,
      rooms: string[],
    ): Promise<HomeBean> => {
      setIsLoading(true);
      setError(null);

      try {
        const homeId = await TuyaHomeModule.createHome(
          name,
          lon,
          lat,
          geoName,
          rooms,
        );

        // Get the created home details
        const newHome = await TuyaHomeModule.getHomeDetail(homeId);

        // Update homes list
        setHomes(prev => [...prev, newHome]);

        // Set as active home
        setActiveHomeState(newHome);

        console.log('Home created successfully:', newHome);
        return newHome;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to create home';
        setError(errorMessage);
        console.error('Error creating home:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateHome = useCallback(
    async (
      homeId: number,
      name: string,
      lon: number,
      lat: number,
      geoName: string,
      rooms: string[],
      overwriteRooms: boolean,
    ) => {
      setIsLoading(true);
      setError(null);

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

        // Get updated home details
        const updatedHome = await TuyaHomeModule.getHomeDetail(homeId);

        // Update homes list
        setHomes(prev =>
          prev.map(h => (h.homeId === homeId ? updatedHome : h)),
        );

        // Update active home if it's the one being updated
        if (activeHome && activeHome.homeId === homeId) {
          setActiveHomeState(updatedHome);
        }

        console.log('Home updated successfully:', updatedHome);
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to update home';
        setError(errorMessage);
        console.error('Error updating home:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [activeHome],
  );

  const dismissHome = useCallback(
    async (homeId: number) => {
      setIsLoading(true);
      setError(null);

      try {
        await TuyaHomeModule.dismissHome(homeId);

        // Remove from homes list
        const updatedHomes = homes.filter(h => h.homeId !== homeId);
        setHomes(updatedHomes);

        // If the dismissed home was active, switch to first available
        if (activeHome && activeHome.homeId === homeId) {
          setActiveHomeState(updatedHomes.length > 0 ? updatedHomes[0] : null);
        }

        console.log('Home dismissed successfully');
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to dismiss home';
        setError(errorMessage);
        console.error('Error dismissing home:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [homes, activeHome],
  );

  const getHomeDetail = useCallback(
    async (homeId: number): Promise<HomeBean> => {
      try {
        const homeDetail = await TuyaHomeModule.getHomeDetail(homeId);
        return homeDetail;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to get home details';
        setError(errorMessage);
        console.error('Error getting home detail:', error);
        throw error;
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    homes,
    activeHome,
    isLoading,
    error,
    loadHomes,
    refreshHomes,
    setActiveHome,
    createHome,
    updateHome,
    dismissHome,
    getHomeDetail,
    clearError,
  };
};

export default useHomes;
