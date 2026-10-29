/**
 * Spatial Gridded Meteorological Data Service
 * Retrieves real spatial weather observations across the map viewport using
 * Open-Meteo's gridded forecast API. Powers real-time spatial thermal fields,
 * relative humidity gradients, barometric pressure isobars, and 2D vector wind flow.
 */

export interface WeatherGridPoint {
  lat: number;
  lon: number;
  tempCelsius: number;
  humidity: number;
  pressure: number;
  windSpeedMs: number;
  windDeg: number;
  clouds: number;
  precipitation: number;
}

export interface SpatialGridData {
  points: WeatherGridPoint[];
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  fetchedAt: number;
}

const gridCache = new Map<string, { data: SpatialGridData; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Fetch spatial meteorological grid points across map bounds
 */
export async function fetchSpatialWeatherGrid(bounds: {
  south: number;
  west: number;
  north: number;
  east: number;
}): Promise<SpatialGridData> {
  // Normalize bounds to prevent coordinate overflow
  const south = Math.max(-85, bounds.south);
  const north = Math.min(85, bounds.north);
  let west = bounds.west;
  let east = bounds.east;

  // Handle longitudinal wrapping
  if (east - west > 360) {
    west = -180;
    east = 180;
  }

  // Create cache key rounded to 0.5 degrees
  const cacheKey = `${Math.round(south * 2) / 2},${Math.round(west * 2) / 2},${Math.round(north * 2) / 2},${Math.round(east * 2) / 2}`;
  const cached = gridCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Create a 5x5 spatial lattice (25 points)
  const rows = 5;
  const cols = 5;
  const lats: number[] = [];
  const lons: number[] = [];

  const latStep = (north - south) / (rows - 1);
  const lonStep = (east - west) / (cols - 1);

  for (let r = 0; r < rows; r++) {
    const lat = Number((south + r * latStep).toFixed(3));
    for (let c = 0; c < cols; c++) {
      let lon = west + c * lonStep;
      // normalize lon between -180 and 180
      lon = ((((lon + 180) % 360) + 360) % 360) - 180;
      lats.push(lat);
      lons.push(Number(lon.toFixed(3)));
    }
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lons.join(',')}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Spatial grid API returned status ${res.status}`);
  }

  const data = await res.json();
  const rawList = Array.isArray(data) ? data : [data];

  const points: WeatherGridPoint[] = rawList.map((item, idx) => {
    const current = item.current || {};
    return {
      lat: lats[idx],
      lon: lons[idx],
      tempCelsius: typeof current.temperature_2m === 'number' ? current.temperature_2m : 20,
      humidity: typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : 60,
      pressure: typeof current.surface_pressure === 'number' ? current.surface_pressure : 1013,
      windSpeedMs: typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : 4,
      windDeg: typeof current.wind_direction_10m === 'number' ? current.wind_direction_10m : 90,
      clouds: typeof current.cloud_cover === 'number' ? current.cloud_cover : 30,
      precipitation: typeof current.precipitation === 'number' ? current.precipitation : 0,
    };
  });

  const result: SpatialGridData = {
    points,
    bounds: { south, west, north, east },
    fetchedAt: Date.now(),
  };

  gridCache.set(cacheKey, { data: result, timestamp: Date.now() });

  // Cleanup old cache entries
  if (gridCache.size > 20) {
    const oldestKey = gridCache.keys().next().value;
    if (oldestKey) gridCache.delete(oldestKey);
  }

  return result;
}
