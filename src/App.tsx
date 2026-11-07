import React, { useState } from 'react';
import { CityScene3D, HUB_PINS, HubPinData } from './components/CityScene3D';

interface SectionMetrics {
  points: string;
  pointsLabel: string[];
  emissions: number;
  electricPct: number;
  headlineTop: string;
  headlineBottom: string;
  ridersCount: string;
  description: string;
}

const SECTION_METRICS: Record<string, SectionMetrics> = {
  Home: {
    points: '4K',
    pointsLabel: ['Connected', 'Mobility', 'Points'],
    emissions: -42,
    electricPct: 88,
    headlineTop: 'Less friction.',
    headlineBottom: 'More possibility.',
    ridersCount: '20K+ Riders',
    description:
      'One connected network for a city in motion. Axle brings clean transport and convenient charging closer to every neighbourhood.',
  },
  'City Mobility': {
    points: '6.4K',
    pointsLabel: ['Autonomous', 'Transit', 'Nodes'],
    emissions: -54,
    electricPct: 92,
    headlineTop: 'Synchronized flow.',
    headlineBottom: 'Zero gridlock.',
    ridersCount: '34K+ Commuters',
    description:
      'High-frequency articulated trams and micro-mobility docks coordinate dynamically with real-time passenger demand.',
  },
  'Energy Hubs': {
    points: '1.8K',
    pointsLabel: ['Bidirectional', 'Charging', 'Bays'],
    emissions: -61,
    electricPct: 95,
    headlineTop: 'Stored solar.',
    headlineBottom: 'Shared urban power.',
    ridersCount: '18.4 MWh Buffer',
    description:
      'Every transit terminal doubles as a neighbourhood microgrid battery, balancing peak loads across surrounding residential blocks.',
  },
  'Our Progress': {
    points: '12M',
    pointsLabel: ['Zero-Carbon', 'Kilometres', 'Logged'],
    emissions: -68,
    electricPct: 97,
    headlineTop: 'Measured impact.',
    headlineBottom: 'Cleaner air daily.',
    ridersCount: '99.4% Uptime',
    description:
      'Continuous telemetry verifies particulate reduction, acoustic dampening, and renewable dispatch across all twelve districts.',
  },
  'Better Journeys': {
    points: '4.9',
    pointsLabel: ['Minute', 'Average', 'Transfer'],
    emissions: -49,
    electricPct: 91,
    headlineTop: 'Seamless transfers.',
    headlineBottom: 'Door to destination.',
    ridersCount: '20K+ Riders',
    description:
      'Single-tap multimodal routing links regional rail, autonomous trams, and neighbourhood e-bikes under one unified fare cap.',
  },
};

const ConcentricEmissionsGauge: React.FC<{ value: number }> = ({ value }) => {
  const rings = [42, 49, 56, 63, 70];
  const progressRatio = Math.min(0.92, Math.max(0.25, Math.abs(value) / 85));
  const outerRadius = 77;
  const circumference = 2 * Math.PI * outerRadius;
  const arcLength = circumference * progressRatio;

  // Endpoint coordinates for the orange indicator dot on the outer arc
  const startAngleDeg = -90;
  const endAngleRad = ((startAngleDeg + progressRatio * 360) * Math.PI) / 180;
  const dotX = 95 + outerRadius * Math.cos(endAngleRad);
  const dotY = 95 + outerRadius * Math.sin(endAngleRad);

  return (
    <div className="relative flex items-center justify-center w-[186px] h-[186px]">
      <svg width="186" height="186" viewBox="0 0 190 190" className="overflow-visible">
        {rings.map((r, idx) => (
          <circle
            key={r}
            cx="95"
            cy="95"
            r={r}
            fill="none"
            stroke="#3A424A"
            strokeOpacity={0.35 + idx * 0.08}
            strokeWidth="1.7"
            strokeDasharray="1.5 4.4"
            strokeLinecap="round"
          />
        ))}

        {/* Subtle outer track */}
        <circle
          cx="95"
          cy="95"
          r={outerRadius}
          fill="none"
          stroke="#4A525A"
          strokeOpacity="0.22"
          strokeWidth="1.6"
          strokeDasharray="1.5 4.2"
        />

        {/* Active Orange Dotted Arc */}
        <circle
          cx="95"
          cy="95"
          r={outerRadius}
          fill="none"
          stroke="#F26522"
          strokeWidth="2.4"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 95 95)"
          className="transition-all duration-700 ease-out"
        />

        {/* Glowing endpoint dot */}
        <circle
          cx={dotX}
          cy={dotY}
          r="3.6"
          fill="#F26522"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[34px] font-normal tracking-tight text-[#1E2328]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value}
        </span>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('Home');
  const [cameraPreset, setCameraPreset] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(0);
  const [renderLayer, setRenderLayer] = useState<'realistic' | 'energy' | 'lidar'>('realistic');
  const [showCommuterFlow, setShowCommuterFlow] = useState<boolean>(true);
  const [isometricMode, setIsometricMode] = useState<boolean>(false);
  const [selectedPin, setSelectedPin] = useState<HubPinData | null>(null);
  const [networkDrawerOpen, setNetworkDrawerOpen] = useState<boolean>(false);

  const metrics = SECTION_METRICS[activeSection] || SECTION_METRICS.Home;
  const adjustedEmissions = metrics.emissions - cameraPreset * 4;

  const handleCycleLayer = () => {
    setRenderLayer((prev) =>
      prev === 'realistic' ? 'energy' : prev === 'energy' ? 'lidar' : 'realistic'
    );
  };

  return (
    <div className="min-h-screen w-full p-2.5 sm:p-3.5 grid grid-cols-1 lg:grid-cols-[252px_1fr] gap-3.5 items-stretch">
      {/* LEFT COLUMN: 3 Stacked Bento Cards */}
      <aside className="flex flex-col gap-3.5 justify-between">
        {/* Card 1: Brand + Camera Preset Dots + 4K Connected Mobility Points */}
        <div className="bg-[#1F2428] rounded-[28px] p-6 text-white flex flex-col justify-between min-h-[258px] shadow-xl">
          {/* Top Brand Lockup */}
          <div className="flex items-center gap-3.5">
            <svg width="36" height="32" viewBox="0 0 38 34" fill="none" aria-hidden="true">
              <path
                d="M19 2L2 32H10.2L19 16.4L27.8 32H36L19 2Z"
                fill="#F26522"
              />
              <path d="M12.5 23.5H25.5L22.5 18.2H15.5L12.5 23.5Z" fill="#F26522" />
            </svg>
            <span
              className="text-[26px] font-normal tracking-tight text-white/95"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Axle
            </span>
          </div>

          {/* Middle 3 Circular Camera Preset Indicators */}
          <div className="flex items-center gap-2.5 my-6" role="group" aria-label="City Sector Camera Presets">
            {[0, 1, 2].map((idx) => {
              const isActive = cameraPreset === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCameraPreset(idx)}
                  aria-label={`Select Sector View ${idx + 1}`}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#F26522] shadow-[0_0_12px_rgba(242,101,34,0.75)]'
                      : 'border border-white/40 hover:border-white/75 bg-transparent'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-white' : 'bg-white/60'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Bottom Metric: 4K | Connected Mobility Points */}
          <div className="flex items-center gap-4 pt-1">
            <span
              className="text-[48px] leading-none font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {metrics.points}
            </span>
            <div className="h-10 w-px bg-white/20 shrink-0" />
            <div className="text-[12px] leading-[1.3] text-slate-300 font-normal">
              {metrics.pointsLabel.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Frosted Glass Emissions Radial Gauge */}
        <div
          className=" rounded-[28px] p-5 text-[#1F2428] flex flex-col items-center justify-between min-h-[252px] border border-white/45 shadow-lg relative overflow-hidden"
          style={{
            background:
              'radial-gradient(circle at 50% 55%, rgba(235,240,245,0.92) 0%, rgba(190,198,207,0.82) 68%, rgba(164,173,182,0.88) 100%)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <span className="text-[14px] font-medium text-[#2A3036] tracking-tight">
            Emissions
          </span>
          <ConcentricEmissionsGauge value={adjustedEmissions} />
          <span className="text-[11px] text-[#3B424A]/80 font-medium">
            CO2e Index vs Baseline
          </span>
        </div>

        {/* Card 3: Electric Journeys 88% Card */}
        <div className="bg-[#1F2428] rounded-[28px] p-6 text-white flex flex-col justify-between min-h-[256px] shadow-xl">
          <div className="text-[16px] leading-[1.22] font-normal text-white/95">
            <div>Electric</div>
            <div>Journeys</div>
          </div>

          {/* Orange Circle with White Leaf Icon */}
          <div className="my-3">
            <div className="w-11 h-11 rounded-full bg-[#F26522] flex items-center justify-center shadow-lg shadow-[#F26522]/30">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
          </div>

          <div>
            <div
              className="text-[46px] leading-none font-bold tracking-tight mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {metrics.electricPct}%
            </div>
            {/* Horizontal Progress Bar with Orange Fill and Soft Glow */}
            <div className="relative h-4 w-full rounded-[5px] bg-white/25 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E65514] to-[#FF7835] transition-all duration-700 rounded-l-[5px] shadow-[0_0_16px_#F26522]"
                style={{ width: `${metrics.electricPct * 0.65}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT COLUMN: Top Pill Navigation Bar + Main 3D Viewport */}
      <main className="flex flex-col gap-3.5 min-w-0">
        {/* Top Pill Navigation Bar */}
        <header className="flex flex-wrap xl:flex-nowrap items-center gap-2.5">
          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setNetworkDrawerOpen(true)}
            aria-label="Open Network Telemetry Drawer"
            className="w-14 h-14 rounded-full bg-[#1F2428] text-white flex items-center justify-center shrink-0 hover:bg-[#2B3137] transition cursor-pointer shadow-md"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="2" y1="2" x2="18" y2="2" />
              <line x1="2" y1="7" x2="18" y2="7" />
              <line x1="2" y1="12" x2="18" y2="12" />
            </svg>
          </button>

          {/* Navigation Pill Tabs */}
          {(['Home', 'City Mobility', 'Energy Hubs', 'Our Progress'] as const).map((tab) => {
            const isActive = activeSection === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSection(tab)}
                className={`h-14 px-8 rounded-full text-[14px] font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#1F2428] text-white shadow-md border border-transparent'
                    : 'border border-white/60 bg-white/10 backdrop-blur-md text-white hover:bg-white/20'
                }`}
              >
                {tab}
              </button>
            );
          })}

          {/* Better Journeys Wide Dark Pill with 2x3 Dot Grid */}
          <button
            type="button"
            onClick={() => setActiveSection('Better Journeys')}
            className={`h-14 px-7 rounded-full flex items-center justify-between gap-8 shrink-0 xl:flex-1 max-w-[270px] transition cursor-pointer shadow-md ${
              activeSection === 'Better Journeys'
                ? 'bg-[#F26522] text-white'
                : 'bg-[#1F2428] text-white hover:bg-[#2A3036]'
            }`}
          >
            <span className="text-[14px] font-medium whitespace-nowrap">Better Journeys</span>
            <span className="grid grid-cols-3 gap-1" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
              ))}
            </span>
          </button>

          {/* Right 3 Circular Action Icons */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Compass / Navigation A Button */}
            <button
              type="button"
              onClick={() => {
                setCameraPreset((prev) => (prev + 1) % 3);
                setZoomLevel(0);
              }}
              aria-label="Cycle Camera Angle"
              title="Cycle Camera Angle"
              className="w-14 h-14 rounded-full bg-[#1F2428] text-white flex items-center justify-center hover:bg-[#2B3137] transition cursor-pointer shadow-md"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 19 21 12 17 5 21 12 2" />
              </svg>
            </button>

            {/* Riders / Commuter Flow Toggle */}
            <button
              type="button"
              onClick={() => setShowCommuterFlow((prev) => !prev)}
              aria-label="Toggle Commuter Flow Telemetry"
              title="Toggle Commuter Flow Telemetry"
              className={`w-14 h-14 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
                showCommuterFlow
                  ? 'bg-[#1F2428] text-white hover:bg-[#2B3137]'
                  : 'bg-white/25 text-[#1F2428] border border-white/60'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="3" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>

            {/* 3D Isometric Cube Toggle */}
            <button
              type="button"
              onClick={() => setIsometricMode((prev) => !prev)}
              aria-label="Toggle Isometric 3D Projection"
              title="Toggle Isometric 3D Projection"
              className={`w-14 h-14 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
                isometricMode
                  ? 'bg-[#F26522] text-white'
                  : 'bg-[#1F2428] text-white hover:bg-[#2B3137]'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main 3D City Viewport */}
        <section className="relative flex-1 rounded-[32px] border border-white/60 overflow-hidden shadow-2xl min-h-[650px] bg-[#9BA4AE]">
          <CityScene3D
            activeSection={activeSection}
            cameraPreset={cameraPreset}
            zoomLevel={zoomLevel}
            renderLayer={renderLayer}
            showCommuterFlow={showCommuterFlow}
            isometricMode={isometricMode}
            selectedPinId={selectedPin?.id || null}
            onSelectPin={(pin) => setSelectedPin(pin)}
          />

          {/* Top-Right Floating Vertical Pill Control (+ Zoom & Layer Switcher) */}
          <div className="absolute right-5 top-5 z-20 bg-[#1F2428]/55 backdrop-blur-md p-2 rounded-full flex flex-col items-center gap-3 border border-white/15 shadow-xl">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => (prev >= 2 ? 0 : prev + 1))}
              aria-label="Zoom 3D Viewport"
              title="Zoom 3D Viewport"
              className="w-10 h-10 rounded-full bg-white text-[#1F2428] flex items-center justify-center hover:bg-slate-100 transition cursor-pointer shadow"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleCycleLayer}
              aria-label="Switch 3D Atmospheric Layer"
              title={`Current Layer: ${renderLayer}`}
              className="w-10 h-10 rounded-full bg-[#1A1E22] text-white flex items-center justify-center hover:bg-[#2B3137] transition cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 12 12 17 22 12" />
                <polyline points="2 17 12 22 22 17" />
              </svg>
            </button>
          </div>

          {/* Selected Hub Pin Live Telemetry Card */}
          {selectedPin && (
            <div className="absolute left-8 top-6 z-30 bg-[#1F2428]/90 backdrop-blur-xl text-white rounded-2xl p-4 w-72 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-wider text-[#F26522] font-semibold">
                  {selectedPin.status}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPin(null)}
                  aria-label="Close Station Telemetry"
                  className="text-white/60 hover:text-white text-xs px-1.5 py-0.5 cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="text-sm font-semibold text-white">{selectedPin.title}</div>
              <div className="text-xs text-slate-300 mt-0.5">{selectedPin.subtitle}</div>
              <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between">
                <span className="text-xs text-slate-400">Live Telemetry</span>
                <span className="text-sm font-bold text-[#F26522]">{selectedPin.metric}</span>
              </div>
            </div>
          )}

          {/* Bottom-Left Headline & Discover Our Network Pill CTA */}
          <div className="absolute left-8 sm:left-11 bottom-7 z-20 max-w-xl pointer-events-none">
            <h1
              className="text-[42px] sm:text-[56px] leading-[1.05] font-normal tracking-[-0.03em] text-[#1D2226]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="block">{metrics.headlineTop}</span>
              <span className="block">{metrics.headlineBottom}</span>
            </h1>

            <button
              type="button"
              onClick={() => setNetworkDrawerOpen(true)}
              className="pointer-events-auto mt-5 border border-white/75 bg-white/15 backdrop-blur-md rounded-full p-1.5 pr-12 inline-flex items-center gap-6 hover:bg-white/30 transition cursor-pointer shadow-lg"
            >
              <span className="w-11 h-11 rounded-full bg-[#1F2428] text-white flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
              <span className="text-[14px] font-medium text-[#1F2428] tracking-tight">
                Discover Our Network
              </span>
            </button>
          </div>

          {/* Bottom-Right 20K+ Riders Badge & Description Paragraph */}
          <div className="absolute right-8 sm:right-10 bottom-7 z-20 max-w-[335px] flex flex-col items-start">
            <div className="bg-[#565E66]/75 backdrop-blur-md text-white rounded-full p-1 pr-4 inline-flex items-center gap-2.5 border border-white/25 shadow-md">
              <div className="flex -space-x-2">
                <svg width="26" height="26" viewBox="0 0 32 32" className="rounded-full ring-1 ring-white">
                  <rect width="32" height="32" rx="16" fill="#D8B4A0" />
                  <circle cx="16" cy="12" r="5.5" fill="#3B2A22" />
                  <path d="M6 28c1.5-5.5 6-8 10-8s8.5 2.5 10 8" fill="#2A343D" />
                </svg>
                <svg width="26" height="26" viewBox="0 0 32 32" className="rounded-full ring-1 ring-white">
                  <rect width="32" height="32" rx="16" fill="#E2C6B2" />
                  <circle cx="16" cy="12" r="5.5" fill="#221C18" />
                  <path d="M6 28c1.5-5.5 6-8 10-8s8.5 2.5 10 8" fill="#F26522" />
                </svg>
              </div>
              <span className="text-[12px] font-medium tracking-tight">{metrics.ridersCount}</span>
            </div>

            <p className="mt-3 text-[12.5px] leading-[1.42] text-[#262C32] font-medium">
              {metrics.description}
            </p>
          </div>

          {/* Interactive Network Drawer Modal */}
          {networkDrawerOpen && (
            <div className="absolute inset-0 z-40 bg-black/45 backdrop-blur-sm flex items-center justify-end p-4">
              <div className="bg-[#1F2428] text-white rounded-[26px] p-6 w-full max-w-md h-full flex flex-col justify-between border border-white/15 shadow-2xl">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-white/15">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-[#F26522] font-semibold">
                        Axle Live Grid
                      </span>
                      <h2 className="text-xl font-semibold mt-0.5">
                        Connected Transit & Charging Nodes
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNetworkDrawerOpen(false)}
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {HUB_PINS.map((pin) => (
                      <button
                        key={pin.id}
                        type="button"
                        onClick={() => {
                          setSelectedPin(pin);
                          setNetworkDrawerOpen(false);
                        }}
                        className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="text-xs text-[#F26522] font-semibold">{pin.status}</div>
                          <div className="text-sm font-semibold mt-0.5">{pin.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{pin.subtitle}</div>
                        </div>
                        <span className="text-sm font-bold text-white bg-[#F26522]/20 border border-[#F26522]/40 px-3 py-1 rounded-full">
                          {pin.metric}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed">
                  All 3 articulated tram lines and 4,000+ micro-mobility charging docks are operating on 100% municipal solar and kinetic regenerative braking.
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
