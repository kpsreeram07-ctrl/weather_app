import React from 'react';
import {
  Wind,
  Droplets,
  Sun,
  Eye,
  Gauge,
  Sunrise,
  Sunset,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { AirQualityData, CurrentWeather, UnitType } from '../types/weather';
import {
  calculateDaylightProgress,
  formatLocalTime,
  formatPressure,
  formatVisibility,
  formatWindSpeed,
  getUvIndexCategory,
  getWindDirection,
} from '../utils/weatherCalculations';

interface AtmosphericDetailsGridProps {
  current: CurrentWeather;
  airQuality?: AirQualityData;
  unit: UnitType;
}

export const AtmosphericDetailsGrid: React.FC<AtmosphericDetailsGridProps> = ({
  current,
  airQuality,
  unit,
}) => {
  const uvInfo = getUvIndexCategory(current.uvIndex ?? 4.0);
  const windDirLabel = getWindDirection(current.windDeg);
  const daylightProgress = calculateDaylightProgress(
    current.sunriseTimestamp,
    current.sunsetTimestamp,
    current.timestamp
  );

  const sunriseTime = formatLocalTime(
    current.sunriseTimestamp,
    current.timezoneOffsetSec
  );
  const sunsetTime = formatLocalTime(
    current.sunsetTimestamp,
    current.timezoneOffsetSec
  );

  // Approximate dew point using Magnus formula
  const tempC = current.tempCelsius;
  const rh = current.humidity;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(rh / 100.0);
  const dewPointC = Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
  const dewPointDisplay =
    unit === 'imperial'
      ? `${Math.round((dewPointC * 9) / 5 + 32)}°F`
      : `${Math.round(dewPointC)}°C`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Wind & Gusts Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-3">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Wind & Gusts
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-slate-400">
            {windDirLabel} ({current.windDeg}°)
          </span>
        </div>

        <div className="flex items-center justify-between my-2">
          <div>
            <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
              {formatWindSpeed(current.windSpeedMs, unit)}
            </div>
            {current.windGustMs && (
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Gusts up to {formatWindSpeed(current.windGustMs, unit)}
              </div>
            )}
          </div>

          {/* Visual compass circle */}
          <div className="relative w-16 h-16 rounded-full border border-slate-700 bg-slate-800/80 flex items-center justify-center">
            <span className="absolute top-1 text-[9px] font-bold text-slate-500">N</span>
            <span className="absolute bottom-1 text-[9px] font-bold text-slate-500">S</span>
            <span className="absolute left-1.5 text-[9px] font-bold text-slate-500">W</span>
            <span className="absolute right-1.5 text-[9px] font-bold text-slate-500">E</span>
            <div
              className="w-10 h-10 flex items-center justify-center transition-transform duration-500"
              style={{ transform: `rotate(${current.windDeg}deg)` }}
            >
              <Compass className="w-7 h-7 text-sky-400" />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
          Steady breeze from the {windDirLabel}
        </div>
      </div>

      {/* 2. Humidity & Dew Point Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Humidity
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Dew point: {dewPointDisplay}
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
            {current.humidity}%
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-400 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${current.humidity}%` }}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
          {current.humidity > 70
            ? 'High humidity makes air feel warmer than actual.'
            : current.humidity < 35
            ? 'Dry air; hydration and moisturizer recommended.'
            : 'Comfortable indoor and outdoor humidity levels.'}
        </div>
      </div>

      {/* 3. UV Index Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              UV Index
            </span>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${uvInfo.color}20`,
              color: uvInfo.color,
            }}
          >
            {uvInfo.label}
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
            {current.uvIndex ? current.uvIndex.toFixed(1) : '4.2'}
            <span className="text-sm font-normal text-slate-400 ml-1.5">/ 11+</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, ((current.uvIndex || 4) / 11) * 100)}%`,
                backgroundColor: uvInfo.color,
              }}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 line-clamp-1">
          {uvInfo.advice}
        </div>
      </div>

      {/* 4. Sunrise & Sunset Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <Sunrise className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Sun & Daylight
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {daylightProgress}% of daylight
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 my-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-400/10 text-amber-400">
              <Sunrise className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Sunrise</div>
              <div className="text-sm font-bold text-white font-mono tabular-nums">
                {sunriseTime}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-400/10 text-indigo-400">
              <Sunset className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Sunset</div>
              <div className="text-sm font-bold text-white font-mono tabular-nums">
                {sunsetTime}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-500 h-1.5 rounded-full"
              style={{ width: `${daylightProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. Pressure & Visibility Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Pressure & Visibility
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 my-2">
          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-slate-400" />
              Barometer
            </div>
            <div className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">
              {formatPressure(current.pressure, unit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {current.pressure > 1013 ? 'High pressure (Stable)' : 'Low pressure'}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Eye className="w-3 h-3 text-slate-400" />
              Visibility
            </div>
            <div className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">
              {formatVisibility(current.visibilityMeters, unit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {current.visibilityMeters >= 10000 ? 'Clear distance' : 'Reduced sight'}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
          Cloud coverage currently at {current.clouds}%
        </div>
      </div>

      {/* 6. Air Quality Index Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Air Quality
            </span>
          </div>
          {airQuality && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${airQuality.color}20`,
                color: airQuality.color,
              }}
            >
              {airQuality.label}
            </span>
          )}
        </div>

        {airQuality ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
                AQI {airQuality.aqi}
              </span>
              <span className="text-xs text-slate-400">
                (Scale 1-5)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-1">
              {airQuality.summary}
            </p>

            {/* Pollutants mini breakdown */}
            <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-800 text-[11px] font-mono">
              {airQuality.pollutants.slice(0, 3).map((p) => (
                <div key={p.code} className="bg-slate-800/60 p-1.5 rounded">
                  <div className="text-slate-400 text-[10px]">{p.code}</div>
                  <div className="text-slate-200 font-bold tabular-nums">
                    {p.value.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 my-auto">
            Air quality data unavailable for this area.
          </div>
        )}
      </div>
    </div>
  );
};
