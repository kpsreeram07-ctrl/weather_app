import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Settings, RotateCw, X, Thermometer } from 'lucide-react';
import { CityLocation, UnitType } from '../types/weather';
import { POPULAR_CITIES } from '../services/mockWeatherData';

interface HeaderProps {
  currentCity: CityLocation;
  unit: UnitType;
  onUnitToggle: () => void;
  onCitySelect: (city: CityLocation) => void;
  onDetectLocation: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  isSearching: boolean;
  isRefreshing: boolean;
  hasCustomApiKey: boolean;
  onSearchQuery: (query: string) => Promise<CityLocation[]>;
}

export const Header: React.FC<HeaderProps> = ({
  currentCity,
  unit,
  onUnitToggle,
  onCitySelect,
  onDetectLocation,
  onRefresh,
  onOpenSettings,
  isRefreshing,
  hasCustomApiKey,
  onSearchQuery,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isTypingSearch, setIsTypingSearch] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsTypingSearch(true);
      try {
        const hits = await onSearchQuery(query);
        setResults(hits);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsTypingSearch(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, onSearchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);

  const handleSelect = (selectedCity: CityLocation) => {
    setSearchErrorMessage(null);
    onCitySelect(selectedCity);
    setQuery('');
    setIsOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    if (results.length > 0) {
      handleSelect(results[0]);
      return;
    }

    // If results haven't settled yet or user pressed Enter immediately, resolve via geocoding
    setIsTypingSearch(true);
    setSearchErrorMessage(null);
    try {
      const hits = await onSearchQuery(cleanQuery);
      if (hits && hits.length > 0) {
        handleSelect(hits[0]);
      } else {
        setSearchErrorMessage(`No location found matching "${cleanQuery}". Please check the spelling.`);
        setIsOpen(true);
      }
    } catch {
      setSearchErrorMessage(`Search failed for "${cleanQuery}". Please check network connection.`);
      setIsOpen(true);
    } finally {
      setIsTypingSearch(false);
    }
  };

  return (
    <header className="sticky top-0 z-[1000] bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-8">
          {/* Brand zone: title & subtitle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <a href="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                Weather App
              </a>
              <span className="text-xs text-slate-400 font-medium">
                Real-time weather at your fingertips
              </span>
            </div>

            {/* Mobile action bar shortcut */}
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                type="button"
                onClick={onUnitToggle}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-800 border border-slate-700 text-sky-400 hover:bg-slate-700"
                aria-label={`Switch to ${unit === 'metric' ? 'Fahrenheit' : 'Celsius'}`}
              >
                °{unit === 'metric' ? 'C' : 'F'}
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                aria-label="Open API settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar with autocomplete */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-lg">
            <form onSubmit={handleFormSubmit} className="relative flex items-center">
              <label htmlFor="city-search" className="sr-only">
                Search for any city
              </label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="city-search"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.length >= 2) setIsOpen(true);
                }}
                onFocus={() => {
                  if (query.length >= 2 && results.length > 0) setIsOpen(true);
                }}
                role="combobox"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                aria-controls="city-search-results"
                placeholder="Search city (e.g. Tokyo, Paris)..."
                autoComplete="off"
                className="w-full pl-9 pr-20 py-2 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none transition-all truncate"
              />
              <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                      setIsOpen(false);
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onDetectLocation}
                  title="Detect my location"
                  aria-label="Detect my location"
                  className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-700/50 rounded transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Autocomplete dropdown */}
            {isOpen && (
              <div
                id="city-search-results"
                className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl overflow-hidden z-50 divide-y divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {isTypingSearch && (
                  <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></span>
                    Searching global cities...
                  </div>
                )}
                {searchErrorMessage && (
                  <div className="px-4 py-3 text-xs text-amber-300 bg-amber-500/10 border-b border-amber-500/20">
                    {searchErrorMessage}
                  </div>
                )}
                {!isTypingSearch && !searchErrorMessage && results.length === 0 && query.length >= 2 && (
                  <div className="px-4 py-3 text-xs text-slate-400">
                    No matching locations found for &quot;{query}&quot;. Try pressing Enter to resolve.
                  </div>
                )}
                {results.map((city, idx) => (
                  <button
                    key={`${city.name}-${city.lat}-${city.lon}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <div>
                        <span className="font-medium text-white group-hover:text-sky-300">
                          {city.name}
                        </span>
                        {city.state && (
                          <span className="text-xs text-slate-400 ml-1.5">
                            {city.state}
                          </span>
                        )}
                        {city.country && (
                          <span className="text-xs text-slate-400 ml-1">
                            · {city.country}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action controls */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {/* Unit toggle */}
            <div className="flex items-center p-0.5 bg-slate-800 border border-slate-700 rounded-lg">
              <button
                type="button"
                onClick={() => unit !== 'metric' && onUnitToggle()}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  unit === 'metric'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                °C
              </button>
              <button
                type="button"
                onClick={() => unit !== 'imperial' && onUnitToggle()}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  unit === 'imperial'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                °F
              </button>
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 transition-colors disabled:opacity-50"
              title="Refresh weather data"
              aria-label="Refresh weather data"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* OpenWeatherMap API Settings button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>API Settings</span>
              {hasCustomApiKey && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="OpenWeatherMap key active"></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
