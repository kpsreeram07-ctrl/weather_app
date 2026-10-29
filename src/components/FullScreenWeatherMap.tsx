import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CityLocation, CurrentWeather, UnitType, WeatherLayerType } from '../types/weather';
import { MeteorologicalFieldCanvas } from './MeteorologicalFieldCanvas';
import { fetchSpatialWeatherGrid, SpatialGridData } from '../services/spatialWeatherService';
import { fetchRainViewerData, RadarFrame, getFrameTileUrl } from '../services/radarService';
import {
  Locate,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Clock,
} from 'lucide-react';

interface FullScreenWeatherMapProps {
  city: CityLocation;
  current: CurrentWeather | null;
  activeLayer: WeatherLayerType;
  apiKey: string;
  unit: UnitType;
  onMapClick: (lat: number, lon: number) => void;
  onLocateMe: () => void;
  isLocating: boolean;
  onLayerLoadingChange?: (loading: boolean) => void;
  onLayerErrorChange?: (error: string | null) => void;
}

export const FullScreenWeatherMap: React.FC<FullScreenWeatherMapProps> = ({
  city,
  current,
  activeLayer,
  apiKey,
  unit,
  onMapClick,
  onLocateMe,
  isLocating,
  onLayerLoadingChange,
  onLayerErrorChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const weatherOverlayGroupRef = useRef<L.LayerGroup | null>(null);
  const currentRadarTileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gridData, setGridData] = useState<SpatialGridData | null>(null);

  // Radar playback state
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [radarHost, setRadarHost] = useState<string>('https://tilecache.rainviewer.com');
  const [currentRadarIndex, setCurrentRadarIndex] = useState<number>(0);
  const [isRadarPlaying, setIsRadarPlaying] = useState<boolean>(false);
  const radarIntervalRef = useRef<number | null>(null);

  // Sequence ref for grid requests
  const activeGridRequestIdRef = useRef(0);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [city.lat, city.lon],
      zoom: 11,
      zoomControl: false,
      attributionControl: true,
      minZoom: 2,
      maxZoom: 18,
    });

    // Clean OpenStreetMap base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

    // Weather overlay group for clean layer addition/removal
    const overlayGroup = L.layerGroup().addTo(map);
    weatherOverlayGroupRef.current = overlayGroup;

    // Animated marker pin
    const pinIcon = L.divIcon({
      className: 'custom-weather-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(14, 165, 233, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    const marker = L.marker([city.lat, city.lon], { icon: pinIcon }).addTo(map);
    markerRef.current = marker;

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      weatherOverlayGroupRef.current = null;
      currentRadarTileLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // 2. Fetch spatial weather grid for visible bounds
  const loadSpatialGrid = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const reqId = ++activeGridRequestIdRef.current;
    if (onLayerLoadingChange) onLayerLoadingChange(true);

    try {
      const bounds = map.getBounds();
      const data = await fetchSpatialWeatherGrid({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
      if (reqId === activeGridRequestIdRef.current) {
        setGridData(data);
        if (onLayerErrorChange) onLayerErrorChange(null);
      }
    } catch (err) {
      if (reqId === activeGridRequestIdRef.current) {
        console.warn('Spatial grid fetch failed', err);
      }
    } finally {
      if (reqId === activeGridRequestIdRef.current && onLayerLoadingChange) {
        onLayerLoadingChange(false);
      }
    }
  }, [onLayerLoadingChange, onLayerErrorChange]);

  // Load grid on map ready & when user finishes panning/zooming
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    loadSpatialGrid();
    const handleMoveEnd = () => {
      loadSpatialGrid();
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [mapReady, loadSpatialGrid]);

  // 3. Update map center and marker when city coordinates change
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const currentCenter = map.getCenter();
    const dist = Math.hypot(currentCenter.lat - city.lat, currentCenter.lng - city.lon);
    if (dist > 0.02) {
      map.flyTo([city.lat, city.lon], 11, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }

    marker.setLatLng([city.lat, city.lon]);

    const stateCountry = [city.state, city.country].filter(Boolean).join(', ');
    const popupHtml = `
      <div style="font-family: inherit; font-size: 13px; color: #0f172a; min-width: 140px; padding: 2px;">
        <div style="font-weight: 700; font-size: 14px; color: #0284c7;">${city.name}</div>
        ${stateCountry ? `<div style="color: #64748b; font-size: 11px; margin-top: 2px;">${stateCountry}</div>` : ''}
        <div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 4px;">
          ${city.lat.toFixed(4)}°, ${city.lon.toFixed(4)}°
        </div>
      </div>
    `;
    marker.bindPopup(popupHtml);
  }, [city.lat, city.lon, city.name, city.state, city.country]);

  // 4. Synchronize weather overlays with activeLayer
  useEffect(() => {
    const overlayGroup = weatherOverlayGroupRef.current;
    if (!overlayGroup || !mapReady) return;

    let isCurrent = true;

    // Wipe out ANY previous tile layers immediately to prevent layer stacking or lag
    overlayGroup.clearLayers();
    currentRadarTileLayerRef.current = null;
    if (onLayerErrorChange) onLayerErrorChange(null);

    // --- RAIN AND THUNDER LAYER ---
    if (activeLayer === 'rain') {
      if (onLayerLoadingChange) onLayerLoadingChange(true);

      fetchRainViewerData()
        .then((rvData) => {
          if (!isCurrent) return;
          const past = rvData.radar?.past || [];
          if (past.length > 0) {
            const latest = past[past.length - 1];
            // scheme 2 = universal Doppler precipitation colors
            const tileUrl = `${rvData.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
            const rainLayer = L.tileLayer(tileUrl, {
              opacity: 0.78,
              maxNativeZoom: 7, // Native zoom limit for RainViewer free tier, scales cleanly up to 18
              maxZoom: 18,
              attribution:
                '&copy; <a href="https://www.rainviewer.com/" target="_blank">RainViewer</a> Live Radar',
            });
            overlayGroup.addLayer(rainLayer);
          } else if (apiKey && apiKey.trim().length > 10) {
            const owmUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey.trim()}`;
            const rainLayer = L.tileLayer(owmUrl, { opacity: 0.7, maxZoom: 18 });
            overlayGroup.addLayer(rainLayer);
          }
        })
        .catch((err) => {
          if (!isCurrent) return;
          console.warn('RainViewer rain load failed', err);
          if (apiKey && apiKey.trim().length > 10) {
            const owmUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey.trim()}`;
            const rainLayer = L.tileLayer(owmUrl, { opacity: 0.7, maxZoom: 18 });
            overlayGroup.addLayer(rainLayer);
          } else if (onLayerErrorChange) {
            onLayerErrorChange('Connecting to live precipitation radar...');
          }
        })
        .finally(() => {
          if (isCurrent && onLayerLoadingChange) onLayerLoadingChange(false);
        });

      return () => {
        isCurrent = false;
        overlayGroup.clearLayers();
      };
    }

    // --- CLOUDS LAYER ---
    if (activeLayer === 'clouds') {
      if (onLayerLoadingChange) onLayerLoadingChange(true);

      // If user has OpenWeatherMap key, add OWM clouds tile overlay
      if (apiKey && apiKey.trim().length > 10) {
        const owmClouds = L.tileLayer(
          `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey.trim()}`,
          { opacity: 0.65, maxZoom: 18 }
        );
        overlayGroup.addLayer(owmClouds);
      }

      if (onLayerLoadingChange) onLayerLoadingChange(false);

      return () => {
        isCurrent = false;
        overlayGroup.clearLayers();
      };
    }

    // --- WEATHER RADAR LAYER ---
    if (activeLayer === 'radar') {
      if (onLayerLoadingChange) onLayerLoadingChange(true);

      fetchRainViewerData()
        .then((rvData) => {
          if (!isCurrent) return;
          setRadarHost(rvData.host);
          const past = rvData.radar?.past || [];
          if (past.length > 0) {
            setRadarFrames(past);
            const idx = past.length - 1;
            setCurrentRadarIndex(idx);
            const initialUrl = getFrameTileUrl(rvData.host, past[idx], 2);
            const rLayer = L.tileLayer(initialUrl, {
              opacity: 0.82,
              maxNativeZoom: 7, // Native zoom limit for RainViewer free tier, scales cleanly up to 18
              maxZoom: 18,
              attribution:
                '&copy; <a href="https://www.rainviewer.com/" target="_blank">RainViewer</a> Live Radar',
            });
            overlayGroup.addLayer(rLayer);
            currentRadarTileLayerRef.current = rLayer;
          } else {
            if (onLayerErrorChange) onLayerErrorChange('No radar frames available at this moment.');
          }
        })
        .catch((err) => {
          if (!isCurrent) return;
          console.warn('Failed to load radar data', err);
          if (onLayerErrorChange) onLayerErrorChange('Unable to connect to live radar stream.');
        })
        .finally(() => {
          if (isCurrent && onLayerLoadingChange) onLayerLoadingChange(false);
        });

      return () => {
        isCurrent = false;
        overlayGroup.clearLayers();
      };
    }

    // --- TEMPERATURE / PRESSURE OWM TILES (IF USER SUPPLIED KEY) ---
    if (apiKey && apiKey.trim().length > 10) {
      const owmMap: Partial<Record<WeatherLayerType, string>> = {
        temperature: 'temp_new',
        pressure: 'pressure_new',
      };
      const owmId = owmMap[activeLayer];
      if (owmId) {
        const owmLayer = L.tileLayer(
          `https://tile.openweathermap.org/map/${owmId}/{z}/{x}/{y}.png?appid=${apiKey.trim()}`,
          { opacity: 0.65, maxZoom: 18 }
        );
        overlayGroup.addLayer(owmLayer);
      }
    }

    return () => {
      isCurrent = false;
      overlayGroup.clearLayers();
    };
  }, [activeLayer, apiKey, mapReady, onLayerLoadingChange, onLayerErrorChange]);

  // 5. Radar playback animation loop
  useEffect(() => {
    if (activeLayer !== 'radar' || !isRadarPlaying || radarFrames.length === 0) {
      if (radarIntervalRef.current) {
        clearInterval(radarIntervalRef.current);
        radarIntervalRef.current = null;
      }
      return;
    }

    radarIntervalRef.current = window.setInterval(() => {
      setCurrentRadarIndex((prev) => (prev + 1) % radarFrames.length);
    }, 1100);

    return () => {
      if (radarIntervalRef.current) {
        clearInterval(radarIntervalRef.current);
        radarIntervalRef.current = null;
      }
    };
  }, [activeLayer, isRadarPlaying, radarFrames.length]);

  // Update radar tile layer URL when scrubbed or playing
  useEffect(() => {
    if (activeLayer !== 'radar' || radarFrames.length === 0) return;
    const frame = radarFrames[currentRadarIndex];
    if (!frame) return;

    const newUrl = getFrameTileUrl(radarHost, frame, 2);
    if (currentRadarTileLayerRef.current) {
      currentRadarTileLayerRef.current.setUrl(newUrl);
    }
  }, [activeLayer, currentRadarIndex, radarFrames, radarHost]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentRadarTimeStr =
    radarFrames.length > 0 && radarFrames[currentRadarIndex]
      ? new Date(radarFrames[currentRadarIndex].time * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-slate-950">
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0 min-h-screen" />


      {/* Meteorological Gridded Canvas (Active for Temperature, Humidity, Pressure, Clouds) */}
      <MeteorologicalFieldCanvas
        map={mapRef.current}
        activeLayer={activeLayer}
        gridData={gridData}
        unit={unit}
      />

      {/* Weather Radar Live Controller (Visible when Radar is active) */}
      {activeLayer === 'radar' && radarFrames.length > 0 && (
        <div className="absolute top-20 right-4 sm:right-60 z-[500] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3 text-white max-w-xs animate-in fade-in slide-in-from-top-2 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE DOPPLER RADAR</span>
            </div>
            {currentRadarTimeStr && (
              <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{currentRadarTimeStr}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRadarPlaying(!isRadarPlaying)}
              className="p-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
              title={isRadarPlaying ? 'Pause radar animation' : 'Play radar loop'}
              aria-label={isRadarPlaying ? 'Pause radar animation' : 'Play radar loop'}
            >
              {isRadarPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() =>
                setCurrentRadarIndex((prev) => (prev > 0 ? prev - 1 : radarFrames.length - 1))
              }
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Previous frame"
              aria-label="Previous frame"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min={0}
              max={radarFrames.length - 1}
              value={currentRadarIndex}
              onChange={(e) => {
                setIsRadarPlaying(false);
                setCurrentRadarIndex(Number(e.target.value));
              }}
              className="flex-1 accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              aria-label="Radar frame timeline"
            />

            <button
              type="button"
              onClick={() =>
                setCurrentRadarIndex((prev) => (prev + 1) % radarFrames.length)
              }
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Next frame"
              aria-label="Next frame"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Frame {currentRadarIndex + 1} of {radarFrames.length}</span>
            <span>RainViewer 10m Scans</span>
          </div>
        </div>
      )}

      {/* Floating Map Navigation Controls (Bottom Right, under layer selector) */}
      <div className="absolute bottom-28 sm:bottom-24 right-4 z-[500] flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl hover:bg-slate-800 hover:border-sky-500/50 transition-all active:scale-95"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-sky-400" />
        </button>

        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl hover:bg-slate-800 hover:border-sky-500/50 transition-all active:scale-95"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-sky-400" />
        </button>

        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLocating}
          className="p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl hover:bg-slate-800 hover:border-sky-500/50 transition-all active:scale-95 disabled:opacity-50"
          title="Center on my location"
          aria-label="Center on my location"
        >
          <Locate className={`w-4 h-4 text-sky-400 ${isLocating ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={handleToggleFullscreen}
          className="p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl hover:bg-slate-800 hover:border-sky-500/50 transition-all active:scale-95"
          title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4 text-sky-400" />
          ) : (
            <Maximize className="w-4 h-4 text-sky-400" />
          )}
        </button>
      </div>
    </div>
  );
};
