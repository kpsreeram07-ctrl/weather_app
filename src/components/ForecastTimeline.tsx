import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { HourlyForecastItem, UnitType } from '../types/weather';
import { formatLocalTime, formatTemp } from '../utils/weatherCalculations';
import { WeatherIcon } from './WeatherIcon';

interface ForecastTimelineProps {
  hourly: HourlyForecastItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  timezoneOffsetSec: number;
  unit: UnitType;
}

export const ForecastTimeline: React.FC<ForecastTimelineProps> = ({
  hourly,
  selectedIndex,
  onSelectIndex,
  timezoneOffsetSec,
  unit,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Play animation loop
  useEffect(() => {
    if (!isPlaying || !hourly || hourly.length === 0) return;

    const timer = setInterval(() => {
      const next = (selectedIndex + 1) % hourly.length;
      onSelectIndex(next);
    }, 1200);

    return () => clearInterval(timer);
  }, [isPlaying, hourly, selectedIndex, onSelectIndex]);

  if (!hourly || hourly.length === 0) return null;

  const activeItem = hourly[selectedIndex] || hourly[0];
  const isNow = selectedIndex === 0;

  const activeDateObj = new Date((activeItem.timestamp + timezoneOffsetSec) * 1000);
  const activeDateFormatted = activeDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const activeTimeFormatted = formatLocalTime(activeItem.timestamp, timezoneOffsetSec, {
    includeMinutes: true,
    format12h: true,
  });

  return (
    <div className="absolute bottom-4 left-4 right-4 sm:left-24 sm:right-24 z-[500] transition-all">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3 sm:p-4 text-white">
        {/* Top bar of timeline: controls, active step time, condition mini badge */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            {/* Play / Pause toggle */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-colors shadow"
              title={isPlaying ? 'Pause timeline' : 'Play forecast timeline'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Reset to Now */}
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onSelectIndex(0);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Reset to current time"
              aria-label="Reset to current time"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Selected timestamp */}
            <div className="flex items-baseline gap-2 ml-1 text-xs">
              <span className="font-bold text-white text-sm">{activeDateFormatted}</span>
              <span className="text-sky-400 font-mono font-bold text-sm">{activeTimeFormatted}</span>
              {isNow && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  CURRENT
                </span>
              )}
            </div>
          </div>

          {/* Quick weather badge for this step */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <WeatherIcon condition={activeItem.condition} className="w-4 h-4" />
            <span className="font-bold font-mono text-white tabular-nums">
              {formatTemp(activeItem.tempCelsius, unit)}
            </span>
            <span className="text-slate-400 hidden sm:inline capitalize">
              · {activeItem.condition.title}
            </span>
          </div>
        </div>

        {/* Timeline Slider & Steps */}
        <div className="relative pt-1 pb-1">
          <input
            type="range"
            min={0}
            max={hourly.length - 1}
            value={selectedIndex}
            onChange={(e) => {
              setIsPlaying(false);
              onSelectIndex(parseInt(e.target.value, 10));
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
            aria-label="Forecast timeline slider"
          />

          {/* Hourly ticks */}
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1.5 px-1">
            {hourly.filter((_, idx) => idx % 3 === 0).map((item) => (
              <span key={item.timestamp} className="tabular-nums">
                {formatLocalTime(item.timestamp, timezoneOffsetSec, {
                  includeMinutes: false,
                  format12h: true,
                })}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
