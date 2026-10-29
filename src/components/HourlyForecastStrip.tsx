import React from 'react';
import { Droplets, Clock, Wind } from 'lucide-react';
import { HourlyForecastItem, UnitType } from '../types/weather';
import { formatLocalTime, formatTemp, formatWindSpeed } from '../utils/weatherCalculations';
import { WeatherIcon } from './WeatherIcon';

interface HourlyForecastStripProps {
  hourly: HourlyForecastItem[];
  unit: UnitType;
  timezoneOffsetSec: number;
}

export const HourlyForecastStrip: React.FC<HourlyForecastStripProps> = ({
  hourly,
  unit,
  timezoneOffsetSec,
}) => {
  if (!hourly || hourly.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            24-Hour Forecast
          </h2>
        </div>
        <span className="text-xs text-slate-400">Scroll to view upcoming hours</span>
      </div>

      {/* Hourly scroll area */}
      <div className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
        {hourly.map((item, index) => {
          const isNow = index === 0;
          const timeLabel = isNow
            ? 'Now'
            : formatLocalTime(item.timestamp, timezoneOffsetSec, {
                includeMinutes: false,
                format12h: true,
              });

          return (
            <div
              key={`${item.timestamp}-${index}`}
              className={`flex flex-col items-center justify-between min-w-[78px] px-3 py-3 rounded-xl border transition-all text-center ${
                isNow
                  ? 'bg-sky-500/10 border-sky-500/40 text-white shadow-sm ring-1 ring-sky-500/30'
                  : 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-200'
              }`}
            >
              {/* Hour time */}
              <span className={`text-xs font-medium ${isNow ? 'text-sky-300 font-bold' : 'text-slate-400'}`}>
                {timeLabel}
              </span>

              {/* Weather icon */}
              <div className="my-2.5">
                <WeatherIcon condition={item.condition} className="w-6 h-6" />
              </div>

              {/* Temperature */}
              <span className="text-sm font-bold font-mono tabular-nums text-white">
                {formatTemp(item.tempCelsius, unit)}
              </span>

              {/* Precipitation chance */}
              <div className="mt-2 flex items-center gap-1 text-[11px] font-mono tabular-nums">
                {item.precipitationChance > 0 ? (
                  <span className="flex items-center gap-0.5 text-sky-400 font-semibold">
                    <Droplets className="w-3 h-3 text-sky-400" />
                    {item.precipitationChance}%
                  </span>
                ) : (
                  <span className="text-slate-500">0%</span>
                )}
              </div>

              {/* Wind speed */}
              <div className="mt-1 flex items-center gap-0.5 text-[10px] text-slate-400 font-mono">
                <Wind className="w-2.5 h-2.5 text-slate-500" />
                <span>{formatWindSpeed(item.windSpeedMs, unit)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
