import { useState, useEffect, useCallback } from 'react';
import { budsConnection, BudsState } from '../bluetooth/connection';

export function useBuds() {
  const [state, setState] = useState<BudsState>(() => budsConnection.getState());
  const [isChangingAnc, setIsChangingAnc] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = budsConnection.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const connect = useCallback(async (mode: 'auto' | 'filtered' | 'unfiltered' = 'auto') => {
    try {
      await budsConnection.connect(mode);
    } catch (err) {
      console.error("Connect failed:", err);
      throw err;
    }
  }, []);

  const connectSimulation = useCallback(async () => {
    try {
      await budsConnection.connectSimulation();
    } catch (err) {
      console.error("Simulation connect failed:", err);
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await budsConnection.disconnect();
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  }, []);

  const setAnc = useCallback(async (mode: 'off' | 'transparent' | 'anc' | number) => {
    setIsChangingAnc(true);
    try {
      return await budsConnection.setAnc(mode);
    } finally {
      setIsChangingAnc(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await budsConnection.refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const refreshBattery = useCallback(async () => {
    await budsConnection.refreshBattery();
  }, []);

  const refreshFirmware = useCallback(async () => {
    await budsConnection.refreshFirmware();
  }, []);

  const refreshGestures = useCallback(async () => {
    await budsConnection.refreshGestures();
  }, []);

  const refreshDeviceInfo = useCallback(async () => {
    await budsConnection.refreshDeviceInfo();
  }, []);

  return {
    ...state,
    isChangingAnc,
    isRefreshing,
    connect,
    connectSimulation,
    disconnect,
    setAnc,
    refreshAll,
    refreshBattery,
    refreshFirmware,
    refreshGestures,
    refreshDeviceInfo,
  };
}
