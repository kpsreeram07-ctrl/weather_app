import React, { useState } from 'react';
import {
  MapPin,
  Star,
  Droplets,
  Gauge,
  Eye,
  Sunrise,
  Sunset,
  Cloud,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Sun,
} from 'lucide-react';
import { CityLocation, CurrentWeather, HourlyForecastItem, UnitType } from '../types/weather';
import {
  formatLocalTime,
  formatPressure,
  formatTemp,
  formatVisibility,
  getUvIndexCategory,
} from '../utils/weatherCalculations';
import { WeatherIcon } from './WeatherIcon';

interface FloatingWeatherPanelProps {
  city: CityLocation;
  current: CurrentWeather;
  selectedForecastHour?: HourlyForecastItem;
  unit: UnitType;
  onUnitToggle: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  sourceProvider: string;
  onClose?: () => void;
}

export const FloatingWeatherPanel: React.FC<FloatingWeatherPanelProps> = ({
  city,
  current,
  selectedForecastHour,
  unit,
  onUnitToggle,
  isFavorite,
  onToggleFavorite,
  sourceProvider,
}) => {
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  // If a forecast hour is scrubbed on timeline, display that hour's condition, otherwise live current
  const displayTemp = selectedForecastHour ? selectedForecastHour.tempCelsius : current.tempCelsius;
  const displayFeelsLike = selectedForecastHour ? selectedForecastHour.feelsLikeCelsius : current.feelsLikeCelsius;
  const displayCondition = selectedForecastHour ? selectedForecastHour.condition : current.condition;
  const displayHumidity = selectedForecastHour ? selectedForecastHour.humidity : current.humidity;
  const localTime = formatLocalTime(current.timestamp, current.timezoneOffsetSec);
  const sunriseTime = formatLocalTime(current.sunriseTimestamp, current.timezoneOffsetSec);
  const sunsetTime = formatLocalTime(current.sunsetTimestamp, current.timezoneOffsetSec);

  const locationStateCountry = [city.state, city.country].filter(Boolean).join(', ');

  return (
    <div className={`absolute top-16 sm:top-20 left-2 sm:left-4 z-[480] transition-all duration-300 ${
      collapsed ? 'w-56 sm:w-64' : 'w-80 sm:w-88 max-w-[calc(100vw-5rem)]'
    }`}>
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-white overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 bg-gradient-to-br from-slate-800/60 to-slate-900/90 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono text-[11px] text-slate-400">
                {city.lat.toFixed(4)}°, {city.lon.toFixed(4)}°
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white truncate mt-0.5">
              {city.name}
            </h2>
            {locationStateCountry && (
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {locationStateCountry}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Favorite pin */}
            <button
              type="button"
              onClick={onToggleFavorite}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              title={isFavorite ? 'Remove from favorites' : 'Pin to favorites'}
              aria-label={isFavorite ? 'Remove from favorites' : 'Pin to favorites'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            {/* Collapse / Expand */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={collapsed ? 'Expand panel' : 'Collapse panel'}
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsed view summary strip */}
        {collapsed ? (
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WeatherIcon condition={displayCondition} className="w-6 h-6" />
              <span className="text-2xl font-bold font-mono tabular-nums text-white">
                {formatTemp(displayTemp, unit)}
              </span>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div className="capitalize text-slate-200">{displayCondition.title}</div>
              <div className="font-mono">Humidity {displayHumidity}%</div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Main Temperature & Condition Showcase */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold font-mono tabular-nums text-white">
                  {formatTemp(displayTemp, unit, false)}
                </span>
                <button
                  type="button"
                  onClick={onUnitToggle}
                  className="text-lg font-bold text-sky-400 hover:text-sky-300 font-mono transition-colors"
                  title="Switch unit"
                >
                  °{unit === 'metric' ? 'C' : 'F'}
                </button>
              </div>

              <div className="flex items-center gap-3 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700/60">
                <WeatherIcon condition={displayCondition} className="w-8 h-8" />
                <div className="text-right">
                  <div className="text-xs font-bold text-white capitalize leading-tight">
                    {displayCondition.title}
                  </div>
                  <div className="text-[11px] text-slate-400 capitalize">
                    {displayCondition.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Feels-like and local time */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium pb-2 border-b border-slate-800">
              <span>
                Feels like{' '}
                <strong className="text-slate-200 font-mono tabular-nums">
                  {formatTemp(displayFeelsLike, unit)}
                </strong>
              </span>
              <span>Local time: <strong className="text-slate-200 font-mono">{localTime}</strong></span>
            </div>

            {/* 2x3 Atmospheric Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* UV Index */}
              <div className="bg-slate-800/50 border border-slate-800 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>UV Index</span>
                </div>
                <div className="font-bold text-white font-mono tabular-nums text-sm">
                  {current.uvIndex ?? 4}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {getUvIndexCategory(current.uvIndex ?? 4).label}
                </div>
              </div>

              {/* Humidity */}
              <div className="bg-slate-800/50 border border-slate-800 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span>Humidity</span>
                </div>
                <div className="font-bold text-white font-mono tabular-nums text-sm">
                  {displayHumidity}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Relative saturation
                </div>
              </div>

              {/* Pressure */}
              <div className="bg-slate-800/50 border border-slate-800 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Gauge className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pressure</span>
                </div>
                <div className="font-bold text-white font-mono tabular-nums text-sm">
                  {formatPressure(current.pressure, unit)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Sea level
                </div>
              </div>

              {/* Cloud Coverage */}
              <div className="bg-slate-800/50 border border-slate-800 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <span>Cloud Cover</span>
                </div>
                <div className="font-bold text-white font-mono tabular-nums text-sm">
                  {current.clouds}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Sky coverage
                </div>
              </div>

              {/* Visibility */}
              <div className="bg-slate-800/50 border border-slate-800 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>Visibility</span>
                </div>
                <div className="font-bold text-white font-mono tabular-nums text-sm">
                  {formatVisibility(current.visibilityMeters, unit)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Horizontal range
                </div>
              </div>

              {/* Sunrise & Sunset */}
              <div className="bg-slate-800/50 border border-slate-800 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Sunrise className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sun Schedule</span>
                </div>
                <div className="font-mono text-white text-[11px] font-bold">
                  {sunriseTime}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Sunset: {sunsetTime}
                </div>
              </div>
            </div>

            {/* Provider and observation timestamp */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Source: {sourceProvider}</span>
              </span>
              <span className="font-mono">
                Updated: {new Date(current.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
