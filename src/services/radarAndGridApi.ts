/**
 * Service for fetching real-time gridded weather data (Open-Meteo)
 * and real-time live Doppler radar & satellite data (RainViewer & NASA GIBS).
 */

export interface RainViewerFrame {
  time: number;
  path: string;
}

export interface RainViewerMetadata {
  host: string;
  radarFrames: RainViewerFrame[];
  latestRadar: RainViewerFrame | null;
  satelliteFrames: RainViewerFrame[];
  latestSatellite: RainViewerFrame | null;
  generatedAt: number;
}

export interface SpatialGridPoint {
  lat: number;
  lon: number;
  tempC: number;
  humidity: number;
  pressure: number;
  windSpeedKmH: number;
  windDeg: number;
  cloudsPercent: number;
  precipMm: number;
}

export interface SpatialGridDataset {
  centerLat: number;
  centerLon: number;
  stepLat: number;
  stepLon: number;
  rows: number;
  cols: number;
  points: SpatialGridPoint[];
  fetchedAt: number;
}

// In-memory cache for RainViewer metadata
let cachedRainViewer: { data: RainViewerMetadata; expires: number } | null = null;

export async function fetchRainViewerMetadata(): Promise<RainViewerMetadata> {
  const now = Date.now();
  if (cachedRainViewer && cachedRainViewer.expires > now) {
    return cachedRainViewer.data;
  }

  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!res.ok) throw new Error(`RainViewer HTTP ${res.status}`);
    const json = await res.json();

    const host = json.host || 'https://tilecache.rainviewer.com';
    const pastRadar: RainViewerFrame[] = json.radar?.past || [];
    const nowcastRadar: RainViewerFrame[] = json.radar?.nowcast || [];
    const allRadar = [...pastRadar, ...nowcastRadar];
    const latestRadar = allRadar.length > 0 ? allRadar[pastRadar.length > 0 ? pastRadar.length - 1 : 0] : null;

    const satFrames: RainViewerFrame[] = json.satellite?.infrared || [];
    const latestSatellite = satFrames.length > 0 ? satFrames[satFrames.length - 1] : null;

    const result: RainViewerMetadata = {
      host,
      radarFrames: allRadar,
      latestRadar,
      satelliteFrames: satFrames,
      latestSatellite,
      generatedAt: json.generated || Math.floor(now / 1000),
    };

    cachedRainViewer = {
      data: result,
      expires: now + 90_000, // cache for 1.5 minutes
    };

    return result;
  } catch (err) {
    console.warn('Failed to fetch RainViewer metadata', err);
    // Return safe fallback
    return {
      host: 'https://tilecache.rainviewer.com',
      radarFrames: [],
      latestRadar: null,
      satelliteFrames: [],
      latestSatellite: null,
      generatedAt: Math.floor(now / 1000),
    };
  }
}

// In-memory cache for spatial grid dataset
const gridCache = new Map<string, { data: SpatialGridDataset; expires: number }>();

/**
 * Fetch a multi-point spatial grid around the current map viewport using Open-Meteo
 */
export async function fetchSpatialGrid(
  centerLat: number,
  centerLon: number,
  zoom: number
): Promise<SpatialGridDataset> {
  // Determine step size based on zoom level
  let step = 1.0;
  if (zoom <= 4) step = 3.0;
  else if (zoom <= 7) step = 1.2;
  else if (zoom <= 10) step = 0.5;
  else if (zoom <= 13) step = 0.2;
  else step = 0.08;

  // Round center to nearest step/2 to stabilize caching during small pan moves
  const roundedLat = Math.round(centerLat / (step / 2)) * (step / 2);
  const roundedLon = Math.round(centerLon / (step / 2)) * (step / 2);
  const cacheKey = `${roundedLat.toFixed(3)}_${roundedLon.toFixed(3)}_${step}`;

  const now = Date.now();
  const cached = gridCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  // Build a 5x5 grid of sample points (25 points)
  const rows = 5;
  const cols = 5;
  const halfR = Math.floor(rows / 2);
  const halfC = Math.floor(cols / 2);

  const flatLats: number[] = [];
  const flatLons: number[] = [];

  for (let r = -halfR; r <= halfR; r++) {
    for (let c = -halfC; c <= halfC; c++) {
      const lat = Math.max(-85, Math.min(85, roundedLat + r * step));
      let lon = roundedLon + c * step;
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;
      flatLats.push(Math.round(lat * 1000) / 1000);
      flatLons.push(Math.round(lon * 1000) / 1000);
    }
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${flatLats.join(
    ','
  )}&longitude=${flatLons.join(
    ','
  )}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const json = await res.json();

    const points: SpatialGridPoint[] = [];
    const items = Array.isArray(json) ? json : [json];

    for (let i = 0; i < items.length; i++) {
      const cur = items[i]?.current;
      if (!cur) continue;
      points.push({
        lat: flatLats[i],
        lon: flatLons[i],
        tempC: cur.temperature_2m ?? 20,
        humidity: cur.relative_humidity_2m ?? 50,
        pressure: cur.surface_pressure ?? 1013,
        windSpeedKmH: cur.wind_speed_10m ?? 10,
        windDeg: cur.wind_direction_10m ?? 180,
        cloudsPercent: cur.cloud_cover ?? 20,
        precipMm: cur.precipitation ?? 0,
      });
    }

    const dataset: SpatialGridDataset = {
      centerLat: roundedLat,
      centerLon: roundedLon,
      stepLat: step,
      stepLon: step,
      rows,
      cols,
      points,
      fetchedAt: now,
    };

    gridCache.set(cacheKey, { data: dataset, expires: now + 5 * 60_000 }); // cache 5 min
    return dataset;
  } catch (err) {
    console.warn('Failed to fetch spatial grid from Open-Meteo', err);
    throw err;
  }
}

/**
 * Inverse Distance Weighting (IDW) interpolation
 * Calculates the interpolated value of a metric at any lat/lon coordinate
 */
export function interpolateGridMetric(
  points: SpatialGridPoint[],
  targetLat: number,
  targetLon: number,
  metric: keyof Omit<SpatialGridPoint, 'lat' | 'lon' | 'windDeg'>
): number {
  if (!points || points.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dLat = targetLat - p.lat;
    const dLon = targetLon - p.lon;
    const distSq = dLat * dLat + dLon * dLon;

    if (distSq < 0.0001) {
      return p[metric];
    }

    const weight = 1 / distSq;
    totalWeight += weight;
    weightedSum += p[metric] * weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : points[0][metric];
}

/**
 * Interpolate 2D wind field vector (u, v) at target lat/lon
 */
export function interpolateWindVector(
  points: SpatialGridPoint[],
  targetLat: number,
  targetLon: number
): { speedKmH: number; deg: number } {
  if (!points || points.length === 0) {
    return { speedKmH: 10, deg: 180 };
  }

  let totalWeight = 0;
  let uSum = 0;
  let vSum = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dLat = targetLat - p.lat;
    const dLon = targetLon - p.lon;
    const distSq = dLat * dLat + dLon * dLon;

    if (distSq < 0.0001) {
      return { speedKmH: p.windSpeedKmH, deg: p.windDeg };
    }

    const rad = (p.windDeg * Math.PI) / 180;
    // Meteorologic wind vector: direction wind is COMING from
    // u = -speed * sin(rad), v = -speed * cos(rad)
    const u = -p.windSpeedKmH * Math.sin(rad);
    const v = -p.windSpeedKmH * Math.cos(rad);

    const weight = 1 / distSq;
    totalWeight += weight;
    uSum += u * weight;
    vSum += v * weight;
  }

  if (totalWeight === 0) return { speedKmH: 10, deg: 180 };

  const uAvg = uSum / totalWeight;
  const vAvg = vSum / totalWeight;
  const speed = Math.sqrt(uAvg * uAvg + vAvg * vAvg);
  let deg = (Math.atan2(-uAvg, -vAvg) * 180) / Math.PI;
  if (deg < 0) deg += 360;

  return { speedKmH: Math.round(speed * 10) / 10, deg: Math.round(deg) };
}

/**
 * Returns NASA GIBS Cloud tile URL for today / yesterday
 */
export function getNasaGibsCloudTileUrl(): string {
  // NASA GIBS daily products are processed daily. Use yesterday's date for guaranteed complete global imagery
  const dateStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Cloud_Fraction_Day/default/${dateStr}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
}
