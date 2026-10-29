import React from 'react';
import { MapPin, ArrowUp, ArrowDown, Star, CloudRain, Wind } from 'lucide-react';
import { CityLocation, CurrentWeather, UnitType } from '../types/weather';
import { formatLocalTime, formatTemp, formatWindSpeed } from '../utils/weatherCalculations';
import { WeatherIcon } from './WeatherIcon';

interface CurrentWeatherHeroProps {
  city: CityLocation;
  current: CurrentWeather;
  unit: UnitType;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  sourceProvider: string;
}

export const CurrentWeatherHero: React.FC<CurrentWeatherHeroProps> = ({
  city,
  current,
  unit,
  isFavorite,
  onToggleFavorite,
  sourceProvider,
}) => {
  const localTime = formatLocalTime(current.timestamp, current.timezoneOffsetSec);
  
  // Format local date string
  const localDateObj = new Date((current.timestamp + current.timezoneOffsetSec) * 1000);
  const dateFormatted = localDateObj.toUTCString().slice(0, 16);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${current.condition.gradientClass} p-6 sm:p-8 text-white shadow-xl transition-all duration-300 border border-white/10`}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-black/20 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between gap-6">
        {/* Top bar: location, local time, and favorite pin */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-white/80 shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex flex-wrap items-baseline">
                <span>{city.name}</span>
                {[city.state, city.country].filter(Boolean).length > 0 && (
                  <span className="text-lg sm:text-xl font-normal text-white/80">
                    ,&nbsp;{[city.state, city.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </h1>
              <button
                type="button"
                onClick={onToggleFavorite}
                className="p-1 rounded-full text-white/70 hover:text-amber-300 hover:bg-white/10 transition-colors ml-1"
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star
                  className={`w-5 h-5 ${
                    isFavorite ? 'fill-amber-400 text-amber-400' : ''
                  }`}
                />
              </button>
            </div>

            {/* City metadata & local time */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/80 font-medium">
              <span>{dateFormatted}</span>
              <span aria-hidden="true">·</span>
              <span>Local time: <strong className="font-semibold text-white">{localTime}</strong></span>
              {city.state && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{city.state}</span>
                </>
              )}
            </div>
          </div>

          {/* Provider badge */}
          <div className="self-start sm:self-auto flex items-center gap-2 text-xs text-white/75 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live from <strong>{sourceProvider}</strong></span>
          </div>
        </div>

        {/* Middle area: huge temperature and visual condition */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 my-2">
          {/* Main Temperature readout */}
          <div className="flex items-baseline gap-4">
            <div className="text-6xl sm:text-8xl font-extrabold tracking-tighter font-mono tabular-nums text-white">
              {formatTemp(current.tempCelsius, unit, false)}
              <span className="text-3xl sm:text-5xl font-light text-white/70 ml-1">
                °{unit === 'metric' ? 'C' : 'F'}
              </span>
            </div>

            <div className="flex flex-col text-sm text-white/85">
              <span>
                Feels like{' '}
                <strong className="font-semibold text-white">
                  {formatTemp(current.feelsLikeCelsius, unit)}
                </strong>
              </span>
              <div className="flex items-center gap-3 mt-1 text-xs text-white/75">
                <span className="flex items-center gap-0.5">
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-300" />
                  {formatTemp(current.tempMaxCelsius, unit)}
                </span>
                <span className="flex items-center gap-0.5">
                  <ArrowDown className="w-3.5 h-3.5 text-sky-200" />
                  {formatTemp(current.tempMinCelsius, unit)}
                </span>
              </div>
            </div>
          </div>

          {/* Weather condition visual */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/15">
            <div className="p-2.5 rounded-xl bg-white/10">
              <WeatherIcon condition={current.condition} className="w-10 h-10" />
            </div>
            <div>
              <div className="text-lg font-bold text-white capitalize">
                {current.condition.title}
              </div>
              <div className="text-xs text-white/80 capitalize">
                {current.condition.description}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom quick stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-white/70" />
            <div>
              <div className="text-white/70 text-[11px]">Wind</div>
              <div className="font-semibold text-white font-mono tabular-nums">
                {formatWindSpeed(current.windSpeedMs, unit)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-white/70 text-[11px] font-bold">💧</div>
            <div>
              <div className="text-white/70 text-[11px]">Humidity</div>
              <div className="font-semibold text-white font-mono tabular-nums">
                {current.humidity}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-white/70" />
            <div>
              <div className="text-white/70 text-[11px]">Cloud Cover</div>
              <div className="font-semibold text-white font-mono tabular-nums">
                {current.clouds}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-white/70 text-[11px] font-bold">☀️</div>
            <div>
              <div className="text-white/70 text-[11px]">UV Index</div>
              <div className="font-semibold text-white font-mono tabular-nums">
                {current.uvIndex ? current.uvIndex.toFixed(1) : 'Moderate'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
