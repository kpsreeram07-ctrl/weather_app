import React from 'react';
import { Calendar, Droplets } from 'lucide-react';
import { DailyForecastItem, UnitType } from '../types/weather';
import { formatDayName, formatTemp } from '../utils/weatherCalculations';
import { WeatherIcon } from './WeatherIcon';

interface DailyForecastListProps {
  daily: DailyForecastItem[];
  unit: UnitType;
  timezoneOffsetSec: number;
}

export const DailyForecastList: React.FC<DailyForecastListProps> = ({
  daily,
  unit,
  timezoneOffsetSec,
}) => {
  if (!daily || daily.length === 0) return null;

  // Calculate weekly overall min and max for proportional range bar
  const allMins = daily.map((d) => d.tempMinCelsius);
  const allMaxs = daily.map((d) => d.tempMaxCelsius);
  const weekMin = Math.min(...allMins);
  const weekMax = Math.max(...allMaxs);
  const weekSpread = Math.max(1, weekMax - weekMin);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            7-Day Forecast
          </h2>
        </div>
        <span className="text-xs text-slate-400">Weekly outlook</span>
      </div>

      <div className="divide-y divide-slate-800/80">
        {daily.map((day, idx) => {
          const isToday = idx === 0;
          const dayName = formatDayName(day.dateTimestamp, timezoneOffsetSec, isToday);

          // Calculate visual temp bar offsets
          const leftPercent = Math.max(
            0,
            Math.min(100, ((day.tempMinCelsius - weekMin) / weekSpread) * 100)
          );
          const rightPercent = Math.max(
            0,
            Math.min(100, ((day.tempMaxCelsius - weekMin) / weekSpread) * 100)
          );
          const barWidthPercent = Math.max(8, rightPercent - leftPercent);

          // Format month and day
          const dateObj = new Date((day.dateTimestamp + timezoneOffsetSec) * 1000);
          const dateStr = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          });

          return (
            <div
              key={`${day.dateTimestamp}-${idx}`}
              className="py-3 px-2 sm:px-3 flex items-center justify-between gap-2 sm:gap-3 text-sm hover:bg-slate-800/40 rounded-lg transition-colors"
            >
              {/* Day title & date */}
              <div className="w-20 sm:w-24 shrink-0">
                <div className={`font-semibold ${isToday ? 'text-sky-400 font-bold' : 'text-slate-100'}`}>
                  {dayName}
                </div>
                <div className="text-[11px] text-slate-400">{dateStr}</div>
              </div>

              {/* Condition icon & summary */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 max-w-[140px]">
                <WeatherIcon condition={day.condition} className="w-5 h-5 shrink-0" />
                <span className="text-xs text-slate-300 truncate font-medium">
                  {day.condition.title}
                </span>
              </div>

              {/* Rain chance */}
              <div className="w-12 sm:w-16 text-right shrink-0">
                {day.precipitationChance > 10 ? (
                  <span className="inline-flex items-center gap-0.5 text-xs text-sky-400 font-mono font-medium tabular-nums">
                    <Droplets className="w-3 h-3 text-sky-400" />
                    {day.precipitationChance}%
                  </span>
                ) : (
                  <span className="text-xs text-slate-600 font-mono">—</span>
                )}
              </div>

              {/* Min temp */}
              <span className="w-8 sm:w-10 text-right text-xs font-mono tabular-nums text-slate-400">
                {formatTemp(day.tempMinCelsius, unit)}
              </span>

              {/* Proportional visual range bar */}
              <div className="flex-1 max-w-xs mx-2 h-2 bg-slate-800 rounded-full relative overflow-hidden hidden sm:block">
                <div
                  className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${barWidthPercent}%`,
                  }}
                />
              </div>

              {/* Max temp */}
              <span className="w-8 sm:w-10 text-right text-xs font-bold font-mono tabular-nums text-white">
                {formatTemp(day.tempMaxCelsius, unit)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
