import React, { useState } from 'react';
import { Bluetooth, Loader2, ChevronLeft } from 'lucide-react';

interface MinimalConnectProps {
  isConnecting: boolean;
  onConnect: (mode: 'auto' | 'unfiltered') => void;
}

export const MinimalConnect: React.FC<MinimalConnectProps> = ({
  isConnecting,
  onConnect,
}) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="relative h-dvh max-h-dvh w-full flex flex-col items-center justify-center px-6 select-none bg-[#000000] overflow-hidden">
      {/* Dynamic Ambient Flowing Liquid Lighting Mesh */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-gradient-to-tr from-cyan-500/10 via-white/5 to-transparent blur-[80px] pointer-events-none animate-liquid-mesh" />

      {!showOptions ? (
        /* The Single 3D Liquid Glass Orb */
        <div className="relative flex flex-col items-center z-10 animate-fade-in">
          <button
            onClick={() => setShowOptions(true)}
            disabled={isConnecting}
            className="group relative w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-500 active:scale-95 focus:outline-none"
            aria-label="Connect Earbuds"
          >
            {/* Outer Subtle Liquid Glass Halo Rings */}
            <div className="absolute -inset-3.5 rounded-full border border-white/[0.04] group-hover:scale-105 group-hover:border-white/[0.1] transition-all duration-700 pointer-events-none" />
            <div className="absolute -inset-1 rounded-full border border-white/[0.08] group-hover:border-white/[0.2] transition-all duration-500 pointer-events-none" />

            {/* 3D Volumetric Liquid Glass Sphere with Flowing Caustics */}
            <div className="relative w-32 h-32 rounded-full orb-3d liquid-sheen-container flex flex-col items-center justify-center transition-all duration-500 group-hover:shadow-[0_25px_60px_rgba(255,255,255,0.1)]">
              {isConnecting ? (
                <Loader2 className="w-8 h-8 text-white/90 animate-spin" />
              ) : (
                <Bluetooth className="w-8 h-8 text-white/90 drop-shadow-[0_2px_10px_rgba(255,255,255,0.45)] group-hover:scale-105 transition-transform duration-300" />
              )}
              <span className="mt-2 text-[10px] font-medium tracking-[0.22em] text-white/70 uppercase">
                {isConnecting ? 'Connecting' : 'Connect'}
              </span>
            </div>
          </button>
        </div>
      ) : (
        /* The Two Clean Frosted Glass Options */
        <div className="relative w-full max-w-[280px] flex flex-col items-center gap-3.5 z-10 animate-fade-in">
          {/* For Android Button */}
          <button
            onClick={() => onConnect('unfiltered')}
            disabled={isConnecting}
            className="w-full py-4 px-6 rounded-2xl liquid-glass-elevated hover:bg-white/15 text-white font-semibold text-sm tracking-tight active:scale-[0.98] transition-all flex items-center justify-center gap-2 group focus:outline-none"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 group-hover:bg-white transition-colors" />
            )}
            <span className="text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.3)]">For Android</span>
          </button>

          {/* For PC Button */}
          <button
            onClick={() => onConnect('auto')}
            disabled={isConnecting}
            className="w-full py-3.5 px-6 rounded-2xl liquid-glass hover:bg-white/10 text-white/80 hover:text-white font-medium text-xs tracking-tight active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus:outline-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span>For PC</span>
          </button>

          {/* Clean Back Pill */}
          <button
            onClick={() => setShowOptions(false)}
            className="mt-3 py-1.5 px-4 rounded-full text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1 active:scale-95 focus:outline-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>
      )}
    </div>
  );
};
