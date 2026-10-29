import React from 'react';
import { UnitType, WeatherLayerType } from '../types/weather';
import { WEATHER_LAYERS } from '../utils/layerConfigs';

interface WeatherLegendProps {
  activeLayer: WeatherLayerType;
  unit: UnitType;
}

export const WeatherLegend: React.FC<WeatherLegendProps> = ({
  activeLayer,
  unit,
}) => {
  const config = WEATHER_LAYERS[activeLayer];
  const unitLabel = unit === 'imperial' ? config.unitImperial : config.unitMetric;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[450] hidden sm:block animate-in fade-in duration-200 pointer-events-auto">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 px-3.5 text-white w-80">
        <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <span>{config.label}</span>
            <span className="text-[11px] text-sky-400 font-mono">({unitLabel})</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Scale</span>
        </div>

        {/* Color bar gradient */}
        <div className="flex items-center h-2.5 rounded-full overflow-hidden border border-slate-700/60 shadow-inner">
          {config.steps.map((step, idx) => (
            <div
              key={idx}
              className="flex-1 h-full"
              style={{ backgroundColor: step.color }}
              title={`${step.label} ${unitLabel}`}
            />
          ))}
        </div>

        {/* Labels underneath */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
          {config.steps.map((step, idx) => (
            <span key={idx} className="tabular-nums">
              {step.label}
            </span>
          ))}
        </div>

        {/* Description caption */}
        <div className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800 line-clamp-1">
          {config.description}
        </div>
      </div>
    </div>
  );
};
