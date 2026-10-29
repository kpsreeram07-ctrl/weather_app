import React, { useState, useEffect, useRef } from 'react';
import { Layers, CloudRain, Thermometer, Wind, Cloud, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CityLocation } from '../types/weather';

interface WeatherRadarViewProps {
  city: CityLocation;
  apiKey: string;
}

type MapLayer = 'none' | 'precipitation' | 'temperature' | 'clouds' | 'wind';

export const WeatherRadarView: React.FC<WeatherRadarViewProps> = ({
  city,
  apiKey,
}) => {
  const [activeLayer, setActiveLayer] = useState<MapLayer>('none');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const weatherTileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map instance
      const map = L.map(mapContainerRef.current, {
        center: [city.lat, city.lon],
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
      });

      // Add standard OpenStreetMap tiles (100% open, zero watermarks)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create modern pulsing pin using L.divIcon
      const pinIcon = L.divIcon({
        className: 'custom-weather-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(14, 165, 233, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      const locationDetails = [city.state, city.country].filter(Boolean).join(', ');
      const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; color: #0f172a; min-width: 120px;">
          <div style="font-weight: 700; font-size: 14px; color: #0284c7;">${city.name}</div>
          ${locationDetails ? `<div style="color: #64748b; font-size: 11px; margin-top: 2px;">${locationDetails}</div>` : ''}
          <div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 4px;">
            ${city.lat.toFixed(4)}°, ${city.lon.toFixed(4)}°
          </div>
        </div>
      `;

      const marker = L.marker([city.lat, city.lon], { icon: pinIcon }).addTo(map);
      marker.bindPopup(popupHtml).openPopup();

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        weatherTileLayerRef.current = null;
      }
    };
  }, []);

  // Update map view and marker when city coordinates or name change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    // Pan and zoom to exact city location
    map.setView([city.lat, city.lon], 11, { animate: true });
    marker.setLatLng([city.lat, city.lon]);

    const locationDetails = [city.state, city.country].filter(Boolean).join(', ');
    const popupHtml = `
      <div style="font-family: inherit; font-size: 13px; color: #0f172a; min-width: 120px;">
        <div style="font-weight: 700; font-size: 14px; color: #0284c7;">${city.name}</div>
        ${locationDetails ? `<div style="color: #64748b; font-size: 11px; margin-top: 2px;">${locationDetails}</div>` : ''}
        <div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 4px;">
          ${city.lat.toFixed(4)}°, ${city.lon.toFixed(4)}°
        </div>
      </div>
    `;
    marker.setPopupContent(popupHtml).openPopup();
  }, [city.lat, city.lon, city.name, city.state, city.country]);

  // Update atmospheric weather tile layers if OpenWeatherMap key is available
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (weatherTileLayerRef.current) {
      map.removeLayer(weatherTileLayerRef.current);
      weatherTileLayerRef.current = null;
    }

    if (activeLayer === 'none') return;

    const layerMap: Record<MapLayer, string> = {
      none: '',
      precipitation: 'precipitation_new',
      temperature: 'temp_new',
      clouds: 'clouds_new',
      wind: 'wind_new',
    };

    const owmLayer = layerMap[activeLayer];
    if (owmLayer && apiKey && apiKey.trim().length > 10) {
      const tileUrl = `https://tile.openweathermap.org/map/${owmLayer}/{z}/{x}/{y}.png?appid=${apiKey.trim()}`;
      const weatherLayer = L.tileLayer(tileUrl, {
        opacity: 0.7,
        maxZoom: 18,
      });
      weatherLayer.addTo(map);
      weatherTileLayerRef.current = weatherLayer;
    }
  }, [activeLayer, apiKey]);

  const hasKey = Boolean(apiKey && apiKey.trim().length > 10);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Interactive City Map & Radar
          </h2>
        </div>

        {/* Layer selector tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700/60 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveLayer('none')}
            className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
              activeLayer === 'none'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            City View
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('precipitation')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
              activeLayer === 'precipitation'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Precipitation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('temperature')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
              activeLayer === 'temperature'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Thermal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('clouds')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
              activeLayer === 'clouds'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Clouds</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('wind')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
              activeLayer === 'wind'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Wind</span>
          </button>
        </div>
      </div>

      {/* Real Leaflet Map Container */}
      <div className="relative w-full h-72 sm:h-84 bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Location badge overlay */}
        <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-white">{city.name}</span>
          {city.country && <span className="text-slate-400">({city.country})</span>}
        </div>

        {/* Layer active indicator */}
        {activeLayer !== 'none' && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded text-[11px] text-slate-300 shadow">
            Layer: <span className="capitalize font-semibold text-white">{activeLayer}</span>
            {hasKey ? ' (OpenWeatherMap tiles)' : ' (Requires API key for overlay)'}
          </div>
        )}
      </div>
    </div>
  );
};
