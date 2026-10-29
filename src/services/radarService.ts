/**
 * RainViewer Live Radar and Satellite Tile Service
 * Free, real-time, global Doppler radar reflectivity and infrared frames.
 * Does not require an API key.
 */

export interface RadarFrame {
  time: number; // Unix timestamp
  path: string; // URL path fragment e.g. "/v2/radar/152e863dc7ab"
}

export interface RainViewerData {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast: RadarFrame[];
  };
  satellite?: {
    infrared?: RadarFrame[];
  };
}

let cachedRainViewer: { data: RainViewerData; fetchedAt: number } | null = null;

export async function fetchRainViewerData(): Promise<RainViewerData> {
  const now = Date.now();
  // Cache for 2 minutes
  if (cachedRainViewer && now - cachedRainViewer.fetchedAt < 120000) {
    return cachedRainViewer.data;
  }

  const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
  if (!res.ok) {
    throw new Error(`RainViewer API returned status ${res.status}`);
  }
  const data: RainViewerData = await res.json();
  cachedRainViewer = { data, fetchedAt: now };
  return data;
}

/**
 * Returns the most recent radar tile URL template
 * e.g. "https://tilecache.rainviewer.com/v2/radar/152e863dc7ab/256/{z}/{x}/{y}/2/1_1.png"
 */
export async function getLatestRadarTileUrl(colorScheme = 2): Promise<{
  tileUrl: string;
  frameTime: number;
  frames: RadarFrame[];
  currentIndex: number;
}> {
  const data = await fetchRainViewerData();
  const past = data.radar?.past || [];
  if (past.length === 0) {
    throw new Error('No radar frames available at this moment.');
  }

  const latest = past[past.length - 1];
  const tileUrl = `${data.host}${latest.path}/256/{z}/{x}/{y}/${colorScheme}/1_1.png`;

  return {
    tileUrl,
    frameTime: latest.time,
    frames: past,
    currentIndex: past.length - 1,
  };
}

/**
 * Construct tile URL for a specific radar frame
 */
export function getFrameTileUrl(
  host: string,
  frame: RadarFrame,
  colorScheme = 2
): string {
  return `${host}${frame.path}/256/{z}/{x}/{y}/${colorScheme}/1_1.png`;
}
