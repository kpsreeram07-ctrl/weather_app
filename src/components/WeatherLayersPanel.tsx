import React, { useState } from 'react';
import {
  Thermometer,
  CloudRain,
  Cloud,
  Droplets,
  Gauge,
  Radio,
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { WeatherLayerType } from '../types/weather';
import { WEATHER_LAYERS } from '../utils/layerConfigs';

interface WeatherLayersPanelProps {
  activeLayer: WeatherLayerType;
  onSelectLayer: (layer: WeatherLayerType) => void;
  hasOwmKey: boolean;
  isLayerLoading?: boolean;
  layerError?: string | null;
}

export const WeatherLayersPanel: React.FC<WeatherLayersPanelProps> = ({
  activeLayer,
  onSelectLayer,
  hasOwmKey,
  isLayerLoading = false,
  layerError = null,
}) => {
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  const getLayerIcon = (layer: WeatherLayerType) => {
    switch (layer) {
      case 'temperature':
        return <Thermometer className="w-4 h-4" />;
      case 'rain':
        return <CloudRain className="w-4 h-4" />;
      case 'clouds':
        return <Cloud className="w-4 h-4" />;
      case 'humidity':
        return <Droplets className="w-4 h-4" />;
      case 'pressure':
        return <Gauge className="w-4 h-4" />;
      case 'radar':
        return <Radio className="w-4 h-4" />;
    }
  };

  const layersList: WeatherLayerType[] = [
    'temperature',
    'rain',
    'clouds',
    'humidity',
    'pressure',
    'radar',
  ];

  return (
    <aside
      aria-label="Weather layers"
      className="absolute top-16 sm:top-20 right-2 sm:right-4 z-[500] transition-all duration-300 pointer-events-auto"
    >
      <div
        className={`bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 sm:p-2 text-white transition-all ${
          collapsed ? 'w-11 overflow-hidden' : 'w-48 sm:w-52'
        }`}
      >
        {/* Header toggle on right side */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mr-1"
            title={collapsed ? 'Expand weather layers' : 'Collapse weather layers'}
            aria-label={collapsed ? 'Expand weather layers' : 'Collapse weather layers'}
          >
            {collapsed ? (
              <ChevronLeft className="w-4 h-4 text-sky-400" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {!collapsed && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider ml-auto">
              <span>Weather Layers</span>
              <Layers className="w-3.5 h-3.5 text-sky-400" />
            </div>
          )}
        </div>

        {/* Layer Buttons */}
        <div className="flex flex-col gap-1">
          {layersList.map((layerId) => {
            const config = WEATHER_LAYERS[layerId];
            const isActive = activeLayer === layerId;

            return (
              <button
                key={layerId}
                type="button"
                onClick={() => onSelectLayer(layerId)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all group relative text-left ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 shadow-md ring-1 ring-sky-300 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title={config.description}
                aria-pressed={isActive}
              >
                <div
                  className={`p-1 rounded-lg transition-colors shrink-0 ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'text-sky-400 group-hover:text-sky-300'
                  }`}
                >
                  {getLayerIcon(layerId)}
                </div>

                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 gap-1.5 whitespace-nowrap overflow-hidden">
                    <span className="truncate">{config.label}</span>

                    {/* Active Layer Status Indicators */}
                    {isActive && isLayerLoading && (
                      <Loader2 className="w-3 h-3 animate-spin text-slate-950 shrink-0" />
                    )}

                    {!isActive && (layerId === 'radar' || layerId === 'rain') && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/15 text-emerald-400">
                        LIVE
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Layer Note or Warning */}
        {!collapsed && layerError && (
          <div className="mt-2 p-2 rounded-xl bg-amber-950/80 border border-amber-600/40 text-[11px] text-amber-200 flex items-start gap-1.5 leading-snug">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>{layerError}</span>
          </div>
        )}

        {!collapsed && !layerError && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 px-1 text-[10px] text-slate-400 leading-tight">
            <span>{WEATHER_LAYERS[activeLayer].description}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
