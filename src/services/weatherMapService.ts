/**
 * Weather Map Service
 * Integrates live real data sources for Leaflet overlays:
 * 1. RainViewer: Live Doppler precipitation radar tile frames (zero-key public API)
 * 2. Open-Meteo: Multi-point spatial meteorological grids for Temperature, Humidity, Pressure, Clouds, and Wind vectors
 * 3. OpenWeatherMap 1.0: Raster weather tile overlays (when API key is supplied)
 * 4. NASA GIBS: Daily MODIS Aqua TrueColor satellite cloud imagery
 */

import { WeatherLayerType } from '../types/weather';

export interface RainViewerFrame {
  time: number;
  path: string;
}

export interface RainViewerMetadata {
  host: string;
  generated: number;
  frames: RainViewerFrame[];
  latestFrame: RainViewerFrame | null;
  latestTileUrl: string | null;
  observationTimeLabel: string;
}

export interface SpatialGridPoint {
  lat: number;
  lon: number;
  tempCelsius: number;
  humidity: number; // %
  pressureHpa: number; // hPa
  cloudCoverPct: number; // %
  windSpeedMs: number; // m/s
  windDeg: number; // degrees
  precipMm: number; // mm
}

export interface SpatialWeatherGrid {
  points: SpatialGridPoint[];
  bounds: { south: number; west: number; north: number; east: number };
  rows: number;
  cols: number;
  timestamp: number;
}

// In-memory cache for RainViewer metadata (5-minute TTL)
let rainViewerCache: { data: RainViewerMetadata; expires: number } | null = null;

/**
 * Fetch latest RainViewer radar metadata
 */
export async function fetchRainViewerMetadata(): Promise<RainViewerMetadata> {
  const now = Date.now();
  if (rainViewerCache && rainViewerCache.expires > now) {
    return rainViewerCache.data;
  }

  const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
  if (!res.ok) {
    throw new Error(`RainViewer API returned status ${res.status}`);
  }

  const json = await res.json();
  const host = json.host || 'https://tilecache.rainviewer.com';
  const pastFrames: RainViewerFrame[] = Array.isArray(json.radar?.past) ? json.radar.past : [];
  const latestFrame = pastFrames.length > 0 ? pastFrames[pastFrames.length - 1] : null;

  let latestTileUrl: string | null = null;
  let observationTimeLabel = 'Recent';

  if (latestFrame) {
    // RainViewer Tile URL format: {host}{path}/256/{z}/{x}/{y}/2/1_1.png (2 = Universal Blue color scheme)
    latestTileUrl = `${host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;
    const dateObj = new Date(latestFrame.time * 1000);
    observationTimeLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC';
  }

  const metadata: RainViewerMetadata = {
    host,
    generated: json.generated || Math.floor(now / 1000),
    frames: pastFrames,
    latestFrame,
    latestTileUrl,
    observationTimeLabel,
  };

  rainViewerCache = {
    data: metadata,
    expires: now + 5 * 60 * 1000, // 5 min cache
  };

  return metadata;
}

// In-memory cache for spatial grid queries keyed by rounded bounds
const spatialGridCache = new Map<string, { grid: SpatialWeatherGrid; expires: number }>();

/**
 * Fetch spatial meteorological grid points across map bounds from Open-Meteo
 */
export async function fetchSpatialWeatherGrid(
  south: number,
  west: number,
  north: number,
  east: number,
  rows = 5,
  cols = 5
): Promise<SpatialWeatherGrid> {
  // Clamp coordinates within realistic bounds
  const clampedSouth = Math.max(-85, Math.min(85, south));
  const clampedNorth = Math.max(-85, Math.min(85, north));
  const clampedWest = Math.max(-180, Math.min(180, west));
  const clampedEast = Math.max(-180, Math.min(180, east));

  // Create cache key rounded to 0.5 degrees
  const cacheKey = `${clampedSouth.toFixed(1)}_${clampedWest.toFixed(1)}_${clampedNorth.toFixed(1)}_${clampedEast.toFixed(1)}_${rows}x${cols}`;
  const now = Date.now();
  const cached = spatialGridCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.grid;
  }

  // Generate grid coordinates
  const lats: number[] = [];
  const lons: number[] = [];

  const latStep = (clampedNorth - clampedSouth) / Math.max(1, rows - 1);
  const lonStep = (clampedEast - clampedWest) / Math.max(1, cols - 1);

  for (let r = 0; r < rows; r++) {
    const lat = clampedSouth + r * latStep;
    for (let c = 0; c < cols; c++) {
      const lon = clampedWest + c * lonStep;
      lats.push(Number(lat.toFixed(3)));
      lons.push(Number(lon.toFixed(3)));
    }
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lons.join(',')}&current=temperature_2m,relative_humidity_2m,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,precipitation`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo spatial grid request failed: ${res.status}`);
  }

  const data = await res.json();
  const rawList = Array.isArray(data) ? data : [data];

  const points: SpatialGridPoint[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    const cur = item.current || {};
    points.push({
      lat: item.latitude ?? lats[i],
      lon: item.longitude ?? lons[i],
      tempCelsius: typeof cur.temperature_2m === 'number' ? cur.temperature_2m : 22,
      humidity: typeof cur.relative_humidity_2m === 'number' ? cur.relative_humidity_2m : 60,
      pressureHpa: typeof cur.surface_pressure === 'number' ? cur.surface_pressure : 1013,
      cloudCoverPct: typeof cur.cloud_cover === 'number' ? cur.cloud_cover : 40,
      windSpeedMs: typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : 4,
      windDeg: typeof cur.wind_direction_10m === 'number' ? cur.wind_direction_10m : 180,
      precipMm: typeof cur.precipitation === 'number' ? cur.precipitation : 0,
    });
  }

  const grid: SpatialWeatherGrid = {
    points,
    bounds: { south: clampedSouth, west: clampedWest, north: clampedNorth, east: clampedEast },
    rows,
    cols,
    timestamp: now,
  };

  // Cache for 2 minutes
  spatialGridCache.set(cacheKey, { grid, expires: now + 2 * 60 * 1000 });
  return grid;
}

/**
 * OpenWeatherMap 1.0 tile layer configuration
 */
export function getOwmTileUrl(layer: WeatherLayerType, apiKey: string): string | null {
  if (!apiKey || apiKey.trim().length < 10) return null;

  const layerMap: Record<WeatherLayerType, string | null> = {
    clouds: 'clouds_new',
    rain: 'precipitation_new',
    temperature: 'temp_new',
    pressure: 'pressure_new',
    humidity: null, // OWM 1.0 does not provide humidity raster tiles
    radar: null, // Radar comes from RainViewer Doppler API
  };

  const owmCode = layerMap[layer];
  if (!owmCode) return null;

  return `https://tile.openweathermap.org/map/${owmCode}/{z}/{x}/{y}.png?appid=${apiKey.trim()}`;
}

/**
 * NASA GIBS Aqua MODIS TrueColor satellite clouds tile template URL
 */
export function getNasaGibsCloudTileUrl(): string {
  // Use current or yesterday's date formatted as YYYY-MM-DD
  const d = new Date();
  d.setDate(d.getDate() - 1); // Yesterday guarantees complete global composite availability
  const dateStr = d.toISOString().slice(0, 10);

  return (
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?' +
    `TIME=${dateStr}&` +
    'layer=MODIS_Aqua_CorrectedReflectance_TrueColor&' +
    'style=default&' +
    'tilematrixset=GoogleMapsCompatible_Level9&' +
    'Service=WMTS&Request=GetTile&Version=1.0.0&' +
    'Format=image/jpeg&' +
    'TileMatrix={z}&TileCol={x}&TileRow={y}'
  );
}
