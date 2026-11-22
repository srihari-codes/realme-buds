import React from 'react';
import { BatteryLevel } from '../protocol/types';
import { RefreshCw, Power, Zap, Shield, Volume2, ShieldOff, Loader2 } from 'lucide-react';

interface MinimalDashboardProps {
  ancMode: number | null; // 0x01: off, 0x02: transparent, 0x08: anc
  batteryLeft?: BatteryLevel;
  batteryRight?: BatteryLevel;
  batteryCase?: BatteryLevel;
  isChangingAnc: boolean;
  isRefreshing: boolean;
  onSelectAnc: (mode: 'off' | 'transparent' | 'anc') => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}

export const MinimalDashboard: React.FC<MinimalDashboardProps> = ({
  ancMode,
  batteryLeft,
  batteryRight,
  batteryCase,
  isChangingAnc,
  isRefreshing,
  onSelectAnc,
  onRefresh,
  onDisconnect,
}) => {
  const isAnc = ancMode === 0x08;
  const isTransparent = ancMode === 0x02;
  const isOff = ancMode === 0x01 || (!isAnc && !isTransparent);

  const renderBatteryValue = (level?: BatteryLevel, label: string = '') => {
    const isCharging = level?.charging ?? false;
    const pct = level?.percent;

    return (
      <div className="flex flex-col items-center mt-2.5">
        <span className="text-[10px] font-medium tracking-wider text-white/40 uppercase mb-0.5">{label}</span>
        <div className="flex items-center gap-1">
          {isCharging && <Zap className="w-2.5 h-2.5 text-[#30d158] fill-[#30d158] animate-pulse" />}
          <span className="text-xs font-semibold tracking-tight text-white/90">
            {pct !== undefined ? `${pct}%` : '—'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-dvh max-h-dvh w-full flex flex-col justify-between p-4 max-w-sm mx-auto select-none safe-top safe-bottom bg-[#000000] overflow-hidden">
      {/* Subtle Ambient Liquid Lighting Mesh - Transitions smoothly for each mode */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full pointer-events-none transition-all duration-1000 ease-in-out ${
          isAnc
            ? 'bg-gradient-to-tr from-cyan-500/12 via-teal-400/8 to-transparent blur-[90px] scale-110 animate-liquid-mesh opacity-90'
            : isTransparent
            ? 'bg-gradient-to-tr from-amber-200/10 via-white/8 to-transparent blur-[90px] scale-105 animate-liquid-mesh opacity-85'
            : 'bg-gradient-to-tr from-white/4 via-slate-400/3 to-transparent blur-[90px] scale-95 opacity-50'
        }`}
      />

      {/* Top Floating Glass Header (Pinned at top, zero scroll) */}
      <header className="relative z-10 flex items-center justify-between pt-1 shrink-0 w-full">
        <div className="flex items-center gap-2 py-1.5 px-3 rounded-full liquid-glass">
          <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158]" />
          <span className="text-[11px] font-medium tracking-wide text-white/80">Connected</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/60 hover:text-white active:scale-90 transition-all focus:outline-none"
            title="Refresh Battery"
            aria-label="Refresh Battery"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
          </button>
          <button
            onClick={onDisconnect}
            className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/40 hover:text-rose-400 active:scale-90 transition-all focus:outline-none"
            title="Disconnect"
            aria-label="Disconnect"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Center Hero: Highly Realistic 3D Rendered Earbuds & Case (Flexible scaling, strictly no overflow) */}
      <section className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center my-auto py-2 w-full overflow-hidden">
        <div className="w-full max-h-[38vh] flex items-end justify-between px-2 gap-2">
          {/* Left Earbud */}
          <div className="flex-1 flex flex-col items-center justify-end h-full group">
            <div className="relative w-full max-w-[84px] h-[25vh] max-h-[148px] flex items-center justify-center drop-shadow-[0_16px_32px_rgba(0,0,0,0.9)]">
              <svg viewBox="0 0 80 140" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  {/* Studio 3D Graphite Body Gradient */}
                  <linearGradient id="budBodyGradL" x1="15%" y1="0%" x2="85%" y2="100%">
                    <stop offset="0%" stopColor="#3d4350" />
                    <stop offset="22%" stopColor="#292e39" />
                    <stop offset="55%" stopColor="#181c24" />
                    <stop offset="100%" stopColor="#0b0d13" />
                  </linearGradient>

                  {/* Specular Crown Rim Highlight */}
                  <linearGradient id="specularCrownL" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                    <stop offset="40%" stopColor="rgba(255,255,255,0.15)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                  </linearGradient>

                  {/* Stem Cylindrical Specular Highlight */}
                  <linearGradient id="stemSpecularL" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                    <stop offset="35%" stopColor="rgba(255,255,255,0.03)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
                  </linearGradient>

                  {/* Translucent Silicone Eartip Gradient */}
                  <radialGradient id="siliconeFlangeL" cx="60%" cy="40%" r="65%">
                    <stop offset="0%" stopColor="#3a4252" />
                    <stop offset="45%" stopColor="#222733" />
                    <stop offset="85%" stopColor="#12151c" />
                    <stop offset="100%" stopColor="#080a0e" />
                  </radialGradient>

                  {/* Acoustic Mesh Pattern */}
                  <pattern id="acousticMeshL" width="2" height="2" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.5" fill="#181d26" />
                  </pattern>

                  {/* Platinum Contacts Gradient */}
                  <linearGradient id="platinumContactL" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="50%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#64748b" />
                  </linearGradient>
                </defs>

                {/* Ergonomic Silicone Ear Tip (Underlying the nozzle) */}
                <g className="silicone-tip">
                  {/* Outer Translucent Flange */}
                  <ellipse
                    cx="57"
                    cy="35"
                    rx="12"
                    ry="17"
                    transform="rotate(8 57 35)"
                    fill="url(#siliconeFlangeL)"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="0.8"
                  />
                  {/* Flange Soft Edge Specular Arc */}
                  <path
                    d="M 52,20 C 60,22 68,28 68,36 C 68,44 60,49 52,50"
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="0.75"
                    strokeLinecap="round"
                  />
                  {/* Inner Sound Bore */}
                  <ellipse
                    cx="58"
                    cy="35"
                    rx="6.5"
                    ry="10.5"
                    transform="rotate(8 58 35)"
                    fill="#07080c"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="0.6"
                  />
                  {/* Inner Wax Guard Mesh */}
                  <ellipse
                    cx="58"
                    cy="35"
                    rx="4.5"
                    ry="8"
                    transform="rotate(8 58 35)"
                    fill="url(#acousticMeshL)"
                  />
                </g>

                {/* Seamless Unified Ergonomic Earbud Body */}
                <path
                  d="M 22.5,124 
                     A 5.5,5.5 0 0,0 33.5,124 
                     L 33.5,66 
                     C 33.5,58 37,53 44,50 
                     C 49,48 53,45 53,40 
                     L 53,30 
                     C 53,25 48,20 42,17 
                     C 33,13 23,15 17,23 
                     C 12,30 12,43 17,53 
                     C 20,59 22.5,62 22.5,66 
                     Z"
                  fill="url(#budBodyGradL)"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="0.85"
                />

                {/* Specular Crown & Shoulder Light Curve */}
                <path
                  d="M 18,25 C 24,16 34,14 42,17 C 47,19 51,23 52,28"
                  fill="none"
                  stroke="url(#specularCrownL)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />

                {/* Stem Cylindrical 3D Specular Highlight */}
                <rect
                  x="22.5"
                  y="66"
                  width="11"
                  height="58"
                  rx="5.5"
                  fill="url(#stemSpecularL)"
                  pointerEvents="none"
                />

                {/* Outer Acoustic Anti-Wind Mesh Grille (ANC/Transparency Mic Port) */}
                <g>
                  <rect
                    x="18"
                    y="32"
                    width="4.5"
                    height="14"
                    rx="2.25"
                    fill="#06070a"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="0.6"
                  />
                  <rect
                    x="18.5"
                    y="32.5"
                    width="3.5"
                    height="13"
                    rx="1.75"
                    fill="url(#acousticMeshL)"
                  />
                </g>

                {/* Optical In-Ear Wear Detection Sensor */}
                <g>
                  <ellipse
                    cx="40"
                    cy="38"
                    rx="2.2"
                    ry="3.2"
                    fill="#050608"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="0.5"
                  />
                  <circle cx="39.5" cy="37" r="0.6" fill="rgba(255,255,255,0.4)" />
                </g>

                {/* Pressure Equalization Bleed Vent */}
                <ellipse cx="32" cy="22" rx="1.5" ry="1" fill="#080a0f" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />

                {/* Force Sensor Indentation (Tactile Stem Squeeze Bar) */}
                <g>
                  <rect
                    x="26"
                    y="80"
                    width="3.5"
                    height="22"
                    rx="1.75"
                    fill="#0a0c10"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="0.6"
                  />
                  <line
                    x1="27.75"
                    y1="82"
                    x2="27.75"
                    y2="100"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                  />
                </g>

                {/* Platinum Charging Contacts & Microphone Port at Base */}
                <ellipse cx="25.5" cy="126" rx="1.4" ry="1.4" fill="url(#platinumContactL)" />
                <circle cx="28" cy="127" r="0.9" fill="#050608" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
                <ellipse cx="30.5" cy="126" rx="1.4" ry="1.4" fill="url(#platinumContactL)" />
              </svg>
            </div>
            {renderBatteryValue(batteryLeft, 'L')}
          </div>

          {/* Center Charging Case */}
          <div className="flex-1 flex flex-col items-center justify-end h-full group">
            <div className="relative w-full max-w-[114px] h-[25vh] max-h-[148px] flex items-center justify-center drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)]">
              <svg viewBox="0 0 100 110" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="appleCaseGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                    <stop offset="0%" stopColor="#353b47" />
                    <stop offset="25%" stopColor="#222630" />
                    <stop offset="65%" stopColor="#13161c" />
                    <stop offset="100%" stopColor="#08090d" />
                  </linearGradient>
                  <linearGradient id="caseHingeHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.28)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
                  </linearGradient>
                </defs>

                {/* Case Pebble Curvature Body */}
                <rect
                  x="10"
                  y="14"
                  width="80"
                  height="82"
                  rx="28"
                  fill="url(#appleCaseGrad)"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1"
                />

                {/* Top Specular Curved Highlight */}
                <path
                  d="M 28,16 C 42,14 58,14 72,16"
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />

                {/* Precision Lid Seam */}
                <path
                  d="M 10,48 Q 50,50 90,48"
                  fill="none"
                  stroke="#06070a"
                  strokeWidth="1.6"
                />
                <path
                  d="M 10,48.6 Q 50,50.6 90,48.6"
                  fill="none"
                  stroke="url(#caseHingeHighlight)"
                  strokeWidth="0.8"
                />

                {/* Stainless Steel Hinge Indentation Sheen */}
                <rect
                  x="38"
                  y="46.5"
                  width="24"
                  height="3"
                  rx="1"
                  fill="#161920"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="0.5"
                />

                {/* Micro Battery Status LED with Bloom */}
                <circle
                  cx="50"
                  cy="66"
                  r="2.2"
                  fill={
                    batteryCase?.charging
                      ? '#30d158'
                      : (batteryCase?.percent ?? 50) > 20
                      ? '#30d158'
                      : '#ff453a'
                  }
                  className={batteryCase?.charging ? 'animate-pulse' : ''}
                  style={{
                    filter: `drop-shadow(0 0 6px ${
                      (batteryCase?.percent ?? 50) > 20 ? '#30d158' : '#ff453a'
                    })`
                  }}
                />
              </svg>
            </div>
            {renderBatteryValue(batteryCase, 'Case')}
          </div>

          {/* Right Earbud (Symmetrically facing inwards) */}
          <div className="flex-1 flex flex-col items-center justify-end h-full group">
            <div className="relative w-full max-w-[84px] h-[25vh] max-h-[148px] flex items-center justify-center drop-shadow-[0_16px_32px_rgba(0,0,0,0.9)]">
              <svg viewBox="0 0 80 140" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  {/* Studio 3D Graphite Body Gradient for Right Bud */}
                  <linearGradient id="budBodyGradR" x1="85%" y1="0%" x2="15%" y2="100%">
                    <stop offset="0%" stopColor="#3d4350" />
                    <stop offset="22%" stopColor="#292e39" />
                    <stop offset="55%" stopColor="#181c24" />
                    <stop offset="100%" stopColor="#0b0d13" />
                  </linearGradient>

                  {/* Specular Crown Rim Highlight for Right Bud */}
                  <linearGradient id="specularCrownR" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                    <stop offset="40%" stopColor="rgba(255,255,255,0.15)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                  </linearGradient>
                </defs>

                {/* Symmetrical Mirrored Rendering for Right Earbud */}
                <g transform="translate(80, 0) scale(-1, 1)">
                  {/* Ergonomic Silicone Ear Tip */}
                  <g className="silicone-tip">
                    <ellipse
                      cx="57"
                      cy="35"
                      rx="12"
                      ry="17"
                      transform="rotate(8 57 35)"
                      fill="url(#siliconeFlangeL)"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M 52,20 C 60,22 68,28 68,36 C 68,44 60,49 52,50"
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="0.75"
                      strokeLinecap="round"
                    />
                    <ellipse
                      cx="58"
                      cy="35"
                      rx="6.5"
                      ry="10.5"
                      transform="rotate(8 58 35)"
                      fill="#07080c"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="0.6"
                    />
                    <ellipse
                      cx="58"
                      cy="35"
                      rx="4.5"
                      ry="8"
                      transform="rotate(8 58 35)"
                      fill="url(#acousticMeshL)"
                    />
                  </g>

                  {/* Seamless Unified Body */}
                  <path
                    d="M 22.5,124 
                       A 5.5,5.5 0 0,0 33.5,124 
                       L 33.5,66 
                       C 33.5,58 37,53 44,50 
                       C 49,48 53,45 53,40 
                       L 53,30 
                       C 53,25 48,20 42,17 
                       C 33,13 23,15 17,23 
                       C 12,30 12,43 17,53 
                       C 20,59 22.5,62 22.5,66 
                       Z"
                    fill="url(#budBodyGradR)"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="0.85"
                  />

                  {/* Specular Crown Curve */}
                  <path
                    d="M 18,25 C 24,16 34,14 42,17 C 47,19 51,23 52,28"
                    fill="none"
                    stroke="url(#specularCrownR)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />

                  {/* Stem Specular */}
                  <rect
                    x="22.5"
                    y="66"
                    width="11"
                    height="58"
                    rx="5.5"
                    fill="url(#stemSpecularL)"
                    pointerEvents="none"
                  />

                  {/* Outer Acoustic Anti-Wind Mesh Grille */}
                  <g>
                    <rect
                      x="18"
                      y="32"
                      width="4.5"
                      height="14"
                      rx="2.25"
                      fill="#06070a"
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="0.6"
                    />
                    <rect
                      x="18.5"
                      y="32.5"
                      width="3.5"
                      height="13"
                      rx="1.75"
                      fill="url(#acousticMeshL)"
                    />
                  </g>

                  {/* Optical Sensor */}
                  <g>
                    <ellipse
                      cx="40"
                      cy="38"
                      rx="2.2"
                      ry="3.2"
                      fill="#050608"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="0.5"
                    />
                    <circle cx="39.5" cy="37" r="0.6" fill="rgba(255,255,255,0.4)" />
                  </g>

                  {/* Pressure Equalization Bleed Vent */}
                  <ellipse cx="32" cy="22" rx="1.5" ry="1" fill="#080a0f" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />

                  {/* Force Sensor Indentation */}
                  <g>
                    <rect
                      x="26"
                      y="80"
                      width="3.5"
                      height="22"
                      rx="1.75"
                      fill="#0a0c10"
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth="0.6"
                    />
                    <line
                      x1="27.75"
                      y1="82"
                      x2="27.75"
                      y2="100"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="0.8"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Platinum Charging Contacts & Mic */}
                  <ellipse cx="25.5" cy="126" rx="1.4" ry="1.4" fill="url(#platinumContactL)" />
                  <circle cx="28" cy="127" r="0.9" fill="#050608" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
                  <ellipse cx="30.5" cy="126" rx="1.4" ry="1.4" fill="url(#platinumContactL)" />
                </g>
              </svg>
            </div>
            {renderBatteryValue(batteryRight, 'R')}
          </div>
        </div>
      </section>

      {/* Bottom Pinned: Apple AirPods Style 3-Segment Liquid Glass Mode Slider */}
      <footer className="relative z-10 w-full shrink-0 pb-1">
        <div className="relative p-1 rounded-2xl liquid-glass-pill flex items-center">
          {/* Noise Cancellation */}
          <button
            onClick={() => onSelectAnc('anc')}
            disabled={isChangingAnc}
            className={`flex-1 py-3 px-1 rounded-xl flex flex-col items-center justify-center transition-all duration-300 focus:outline-none ${
              isAnc
                ? 'liquid-glass-active text-white'
                : 'text-white/40 hover:text-white/70 active:scale-95'
            }`}
          >
            <Shield className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-medium tracking-tight">Noise Cancellation</span>
          </button>

          {/* Off */}
          <button
            onClick={() => onSelectAnc('off')}
            disabled={isChangingAnc}
            className={`flex-1 py-3 px-1 rounded-xl flex flex-col items-center justify-center transition-all duration-300 focus:outline-none ${
              isOff
                ? 'liquid-glass-active text-white'
                : 'text-white/40 hover:text-white/70 active:scale-95'
            }`}
          >
            <ShieldOff className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-medium tracking-tight">Off</span>
          </button>

          {/* Transparency */}
          <button
            onClick={() => onSelectAnc('transparent')}
            disabled={isChangingAnc}
            className={`flex-1 py-3 px-1 rounded-xl flex flex-col items-center justify-center transition-all duration-300 focus:outline-none ${
              isTransparent
                ? 'liquid-glass-active text-white'
                : 'text-white/40 hover:text-white/70 active:scale-95'
            }`}
          >
            <Volume2 className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-medium tracking-tight">Transparency</span>
          </button>
        </div>

        {/* Minimal Feedback Spinner */}
        {isChangingAnc && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] tracking-wide text-white/50">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Updating Mode</span>
          </div>
        )}
      </footer>
    </div>
  );
};
