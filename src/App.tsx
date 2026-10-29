import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CityLocation,
  UnitType,
  WeatherData,
  WeatherLayerType,
} from './types/weather';
import {
  fetchWeatherData,
  getStoredApiKey,
  getStoredFavorites,
  getStoredLastCity,
  reverseGeocode,
  saveStoredFavorites,
  saveStoredLastCity,
  searchCities,
  setStoredApiKey,
} from './services/weatherApi';
import { Header } from './components/Header';
import { FavoritesBar } from './components/FavoritesBar';
import { FullScreenWeatherMap } from './components/FullScreenWeatherMap';
import { WeatherLayersPanel } from './components/WeatherLayersPanel';
import { FloatingWeatherPanel } from './components/FloatingWeatherPanel';
import { WeatherLegend } from './components/WeatherLegend';
import { ForecastTimeline } from './components/ForecastTimeline';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AlertCircle, MapPin, X } from 'lucide-react';

export default function App() {
  const [city, setCity] = useState<CityLocation>(getStoredLastCity);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [unit, setUnit] = useState<UnitType>('metric');
  const [favorites, setFavorites] = useState<CityLocation[]>(getStoredFavorites);
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey);
  const [activeLayer, setActiveLayer] = useState<WeatherLayerType>('temperature');
  const [timelineIndex, setTimelineIndex] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLayerLoading, setIsLayerLoading] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Sequence ref to discard stale out-of-order responses
  const activeRequestIdRef = useRef(0);

  // Fetch weather data for given city coordinates
  const loadWeather = useCallback(
    async (targetCity: CityLocation, showInitialLoader = false) => {
      const requestId = ++activeRequestIdRef.current;
      if (showInitialLoader) setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWeatherData(targetCity, apiKey);
        // Only apply if this is still the latest active request
        if (requestId === activeRequestIdRef.current) {
          setWeatherData(data);
          saveStoredLastCity(targetCity);
          setTimelineIndex(0); // reset timeline to current
        }
      } catch (err) {
        if (requestId === activeRequestIdRef.current) {
          console.error('Failed to load weather data', err);
          setError(
            err instanceof Error
              ? err.message
              : 'Could not fetch weather data. Please try again or choose another location.'
          );
        }
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLocating(false);
        }
      }
    },
    [apiKey]
  );

  // Automatically attempt to detect user location on mount
  useEffect(() => {
    let isMounted = true;

    if (!navigator.geolocation) {
      setLocationNotice('Geolocation is not supported by your browser. Please search for your city above.');
      loadWeather(city, true);
      return;
    }

    setLocationNotice('Detecting your current location...');
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!isMounted) return;
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const detected = await reverseGeocode(lat, lon, apiKey);
          if (!isMounted) return;
          setCity(detected);
          setLocationNotice(null);
          await loadWeather(detected, true);
        } catch {
          if (!isMounted) return;
          setLocationNotice('Could not resolve your location name. Please search for your city.');
          loadWeather(city, true);
        } finally {
          if (isMounted) setIsLocating(false);
        }
      },
      (geoErr) => {
        if (!isMounted) return;
        console.warn('Geolocation permission denied or timed out:', geoErr.message);
        setLocationNotice('Location permission was denied or unavailable. You can search for any city above.');
        setIsLocating(false);
        // Load fallback city
        loadWeather(city, true);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle city selection from search autocomplete
  const handleSelectCity = (newCity: CityLocation) => {
    setLocationNotice(null);
    setCity(newCity);
    loadWeather(newCity, false);
  };

  // Handle direct map click (reverse geocodes clicked coordinates)
  const handleMapClick = async (lat: number, lon: number) => {
    setIsLocating(true);
    setLocationNotice(null);
    try {
      const clickedLocation = await reverseGeocode(lat, lon, apiKey);
      setCity(clickedLocation);
      loadWeather(clickedLocation, false);
    } catch (err) {
      console.warn('Reverse geocode on map click failed', err);
      const fallbackLoc: CityLocation = {
        name: 'Selected Point',
        country: '',
        lat,
        lon,
      };
      setCity(fallbackLoc);
      loadWeather(fallbackLoc, false);
    } finally {
      setIsLocating(false);
    }
  };

  // Unit toggle handler (°C <-> °F)
  const handleUnitToggle = () => {
    setUnit((prev) => (prev === 'metric' ? 'imperial' : 'metric'));
  };

  // Refresh current city
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadWeather(city, false);
  };

  // Manual Locate Me button
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationNotice('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationNotice('Detecting your current location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const detectedCity = await reverseGeocode(lat, lon, apiKey);
          setCity(detectedCity);
          setLocationNotice(null);
          await loadWeather(detectedCity, false);
        } catch {
          setError('Failed to detect address from coordinates.');
        } finally {
          setIsLocating(false);
        }
      },
      (geoErr) => {
        console.warn('Geolocation denied or unavailable', geoErr);
        setLocationNotice('Location permission denied. Please search for your city name above.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Toggle favorite
  const handleToggleFavorite = (target: CityLocation) => {
    const isFav = favorites.some(
      (f) =>
        f.name.toLowerCase() === target.name.toLowerCase() &&
        (f.country === target.country || !f.country || !target.country)
    );

    let updated: CityLocation[];
    if (isFav) {
      updated = favorites.filter(
        (f) => f.name.toLowerCase() !== target.name.toLowerCase()
      );
    } else {
      updated = [target, ...favorites];
    }
    setFavorites(updated);
    saveStoredFavorites(updated);
  };

  // Check if current city is in favorites
  const isCurrentFavorite = favorites.some(
    (f) =>
      f.name.toLowerCase() === city.name.toLowerCase() &&
      (f.country === city.country || !f.country || !city.country)
  );

  // Save OpenWeatherMap API Key
  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    setStoredApiKey(newKey);
    loadWeather(city, false);
  };

  // City search query delegation
  const handleSearchQuery = async (q: string) => {
    return searchCities(q, apiKey);
  };

  const selectedForecastHour = weatherData?.hourly?.[timelineIndex];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Navigation Bar */}
      <Header
        currentCity={city}
        unit={unit}
        onUnitToggle={handleUnitToggle}
        onCitySelect={handleSelectCity}
        onDetectLocation={handleLocateMe}
        onRefresh={handleRefresh}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSearching={false}
        isRefreshing={isRefreshing}
        hasCustomApiKey={Boolean(apiKey)}
        onSearchQuery={handleSearchQuery}
      />

      {/* Main Full-Screen Map Area */}
      <main className="relative flex-1 w-full h-[calc(100vh-61px)] overflow-hidden">
        {/* Full-Screen Interactive Leaflet Map with Wind Particle Canvas */}
        <FullScreenWeatherMap
          city={city}
          current={weatherData?.current || null}
          activeLayer={activeLayer}
          apiKey={apiKey}
          unit={unit}
          onMapClick={handleMapClick}
          onLocateMe={handleLocateMe}
          isLocating={isLocating}
          onLayerLoadingChange={setIsLayerLoading}
          onLayerErrorChange={setLayerError}
        />

        {/* Floating Notification / Error Toasts */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] w-full max-w-md px-4 pointer-events-none flex flex-col gap-2">
          {locationNotice && (
            <div className="pointer-events-auto p-3 rounded-xl bg-slate-900/95 border border-sky-500/40 text-sky-200 text-xs shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{locationNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setLocationNotice(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
                aria-label="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="pointer-events-auto p-3.5 rounded-xl bg-red-950/95 border border-red-500/50 text-red-200 text-xs shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => loadWeather(city, true)}
                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded font-semibold text-xs whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Quick Pinned Favorites Bar (Floating under top bar) */}
        <div className="absolute top-4 left-4 z-[500] max-w-[calc(100vw-120px)] sm:max-w-xl pointer-events-auto">
          <FavoritesBar
            favorites={favorites}
            currentCity={city}
            onSelectCity={handleSelectCity}
            onToggleFavorite={handleToggleFavorite}
            isCurrentFavorite={isCurrentFavorite}
          />
        </div>

        {/* Right Weather Layers Selection Panel (Windy.com Style) */}
        <WeatherLayersPanel
          activeLayer={activeLayer}
          onSelectLayer={(l) => {
            setActiveLayer(l);
            setLayerError(null);
          }}
          hasOwmKey={Boolean(apiKey)}
          isLayerLoading={isLayerLoading}
          layerError={layerError}
        />

        {/* Floating Weather Information Panel for Selected Location */}
        {weatherData && (
          <FloatingWeatherPanel
            city={weatherData.city}
            current={weatherData.current}
            selectedForecastHour={selectedForecastHour}
            unit={unit}
            onUnitToggle={handleUnitToggle}
            isFavorite={isCurrentFavorite}
            onToggleFavorite={() => handleToggleFavorite(weatherData.city)}
            sourceProvider={weatherData.sourceProvider}
          />
        )}

        {/* Dynamic Color Scale Map Legend */}
        <WeatherLegend activeLayer={activeLayer} unit={unit} />

        {/* Bottom Forecast Timeline (Windy.com Style) */}
        {weatherData && weatherData.hourly && weatherData.hourly.length > 0 && (
          <ForecastTimeline
            hourly={weatherData.hourly}
            selectedIndex={timelineIndex}
            onSelectIndex={(idx) => setTimelineIndex(idx)}
            timezoneOffsetSec={weatherData.current.timezoneOffsetSec}
            unit={unit}
          />
        )}
      </main>

      {/* OpenWeatherMap API Settings Modal */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentKey={apiKey}
        onSaveKey={handleSaveApiKey}
      />
    </div>
  );
}
