import React, { useState, useCallback } from 'react';
import { useBuds } from './hooks/useBuds';
import { MinimalConnect } from './components/MinimalConnect';
import { MinimalDashboard } from './components/MinimalDashboard';
import { ToastContainer, ToastMessage } from './components/Toast';

export function App() {
  const buds = useBuds();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleConnect = async (mode: 'auto' | 'unfiltered') => {
    try {
      await buds.connect(mode);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('No port selected') && !msg.includes('cancelled')) {
        addToast('error', 'Connection Failed', msg);
      }
    }
  };

  const handleSelectAnc = async (mode: 'off' | 'transparent' | 'anc') => {
    try {
      const res = await buds.setAnc(mode);
      if (res && !res.success) {
        addToast('error', 'Wear Both Earbuds', 'Both earbuds must be in your ears to activate mode.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', 'Mode Change Failed', msg);
    }
  };

  const isConnected = buds.connectionState === 'connected';

  return (
    <div className="h-dvh max-h-dvh w-full bg-[#000000] text-slate-100 flex flex-col overflow-hidden relative">
      {!isConnected ? (
        <MinimalConnect
          isConnecting={buds.connectionState === 'connecting'}
          onConnect={handleConnect}
        />
      ) : (
        <MinimalDashboard
          ancMode={buds.ancMode}
          batteryLeft={buds.battery.left}
          batteryRight={buds.battery.right}
          batteryCase={buds.battery.case}
          isChangingAnc={buds.isChangingAnc}
          isRefreshing={buds.isRefreshing}
          onSelectAnc={handleSelectAnc}
          onRefresh={buds.refreshBattery}
          onDisconnect={buds.disconnect}
        />
      )}

      {/* Lightweight Dynamic Island Style Toast */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
