import { UnitType, WeatherConditionCategory, WeatherConditionInfo } from '../types/weather';

/**
 * Converts Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

/**
 * Converts Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

/**
 * Format temperature given celsius base and target unit
 */
export function formatTemp(celsius: number, unit: UnitType, includeUnit = true): string {
  const value = unit === 'imperial' ? celsiusToFahrenheit(celsius) : celsius;
  const rounded = Math.round(value);
  if (!includeUnit) return `${rounded}`;
  return `${rounded}°${unit === 'imperial' ? 'F' : 'C'}`;
}

/**
 * Format wind speed: metric -> km/h, imperial -> mph
 */
export function formatWindSpeed(speedMs: number, unit: UnitType): string {
  if (unit === 'imperial') {
    const mph = speedMs * 2.23694;
    return `${Math.round(mph * 10) / 10} mph`;
  }
  const kmh = speedMs * 3.6;
  return `${Math.round(kmh * 10) / 10} km/h`;
}

/**
 * Format pressure: metric -> hPa, imperial -> inHg
 */
export function formatPressure(hPa: number, unit: UnitType): string {
  if (unit === 'imperial') {
    const inHg = hPa * 0.02953;
    return `${inHg.toFixed(2)} inHg`;
  }
  return `${Math.round(hPa)} hPa`;
}

/**
 * Format visibility: metric -> km, imperial -> miles
 */
export function formatVisibility(meters: number, unit: UnitType): string {
  if (unit === 'imperial') {
    const miles = meters / 1609.344;
    return `${miles.toFixed(1)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Convert wind degree into 16-point cardinal compass string
 */
export function getWindDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

/**
 * Map OpenWeatherMap weather code / condition string into condition category & styling
 */
export function mapWeatherCondition(
  weatherCode: number,
  isDaytime = true,
  customDesc?: string
): WeatherConditionInfo {
  let category: WeatherConditionCategory = 'clear';
  let title = 'Clear';
  let description = customDesc || 'Clear sky';
  let iconName = isDaytime ? 'Sun' : 'Moon';
  let gradientClass = isDaytime
    ? 'from-sky-500 via-blue-600 to-indigo-800'
    : 'from-slate-900 via-indigo-950 to-slate-950';
  let accentColor = '#38bdf8'; // sky-400

  // Thunderstorm 2xx
  if (weatherCode >= 200 && weatherCode < 300) {
    category = 'thunderstorm';
    title = 'Thunderstorm';
    iconName = 'CloudLightning';
    gradientClass = 'from-slate-800 via-indigo-900 to-zinc-950';
    accentColor = '#a855f7';
  }
  // Drizzle 3xx
  else if (weatherCode >= 300 && weatherCode < 400) {
    category = 'drizzle';
    title = 'Drizzle';
    iconName = 'CloudDrizzle';
    gradientClass = 'from-blue-600 via-slate-700 to-slate-900';
    accentColor = '#60a5fa';
  }
  // Rain 5xx
  else if (weatherCode >= 500 && weatherCode < 600) {
    category = 'rain';
    title = weatherCode >= 502 ? 'Heavy Rain' : 'Rain';
    iconName = 'CloudRain';
    gradientClass = 'from-slate-700 via-blue-900 to-slate-950';
    accentColor = '#38bdf8';
  }
  // Snow 6xx
  else if (weatherCode >= 600 && weatherCode < 700) {
    category = 'snow';
    title = 'Snow';
    iconName = 'CloudSnow';
    gradientClass = isDaytime
      ? 'from-slate-400 via-blue-400 to-indigo-600'
      : 'from-slate-800 via-slate-900 to-indigo-950';
    accentColor = '#e0f2fe';
  }
  // Atmosphere 7xx (Mist, Smoke, Haze, Fog)
  else if (weatherCode >= 700 && weatherCode < 800) {
    category = 'mist';
    title = weatherCode === 741 ? 'Fog' : 'Mist';
    iconName = 'CloudFog';
    gradientClass = 'from-stone-600 via-slate-700 to-zinc-900';
    accentColor = '#cbd5e1';
  }
  // Clear 800
  else if (weatherCode === 800) {
    category = 'clear';
    title = isDaytime ? 'Clear Sky' : 'Clear Night';
    iconName = isDaytime ? 'Sun' : 'Moon';
    gradientClass = isDaytime
      ? 'from-sky-400 via-blue-500 to-indigo-700'
      : 'from-slate-900 via-indigo-950 to-neutral-950';
    accentColor = isDaytime ? '#facc15' : '#818cf8';
  }
  // Clouds 80x
  else if (weatherCode > 800 && weatherCode < 900) {
    category = 'clouds';
    if (weatherCode === 801) {
      title = 'Few Clouds';
      iconName = isDaytime ? 'CloudSun' : 'CloudMoon';
      gradientClass = isDaytime
        ? 'from-sky-500 via-blue-600 to-slate-800'
        : 'from-slate-900 via-slate-800 to-neutral-950';
    } else {
      title = 'Overcast';
      iconName = 'Cloud';
      gradientClass = isDaytime
        ? 'from-slate-600 via-slate-700 to-slate-900'
        : 'from-slate-900 via-zinc-900 to-black';
    }
    accentColor = '#94a3b8';
  }

  return {
    category,
    title,
    description: customDesc || title,
    iconName,
    gradientClass,
    accentColor,
    isDaytime,
  };
}

/**
 * UV index status & actionable recommendation
 */
export function getUvIndexCategory(uv: number): {
  label: string;
  color: string;
  advice: string;
} {
  const rounded = Math.round(uv * 10) / 10;
  if (rounded <= 2) {
    return {
      label: 'Low',
      color: '#22c55e', // green-500
      advice: 'Minimal sun protection needed. Safe to stay outside.',
    };
  }
  if (rounded <= 5) {
    return {
      label: 'Moderate',
      color: '#eab308', // yellow-500
      advice: 'Wear sunglasses and SPF 30+ sunscreen if outdoors.',
    };
  }
  if (rounded <= 7) {
    return {
      label: 'High',
      color: '#f97316', // orange-500
      advice: 'Protection essential. Seek shade during midday hours.',
    };
  }
  if (rounded <= 10) {
    return {
      label: 'Very High',
      color: '#ef4444', // red-500
      advice: 'Take extra precautions. Skin can burn quickly.',
    };
  }
  return {
    label: 'Extreme',
    color: '#a855f7', // purple-500
    advice: 'Avoid sun exposure around midday. Full protection required.',
  };
}

/**
 * OpenWeatherMap Air Pollution AQI index (1=Good to 5=Very Poor)
 */
export function getAqiCategory(aqi: number): {
  label: string;
  color: string;
  summary: string;
} {
  switch (aqi) {
    case 1:
      return {
        label: 'Good',
        color: '#22c55e',
        summary: 'Air quality is ideal for outdoor activities.',
      };
    case 2:
      return {
        label: 'Fair',
        color: '#84cc16',
        summary: 'Air quality is acceptable; very sensitive people may notice symptoms.',
      };
    case 3:
      return {
        label: 'Moderate',
        color: '#eab308',
        summary: 'Members of sensitive groups may experience health effects.',
      };
    case 4:
      return {
        label: 'Poor',
        color: '#f97316',
        summary: 'Everyone may begin to experience adverse health effects.',
      };
    case 5:
    default:
      return {
        label: 'Very Poor',
        color: '#ef4444',
        summary: 'Health alert: serious risk of respiratory symptoms for everyone.',
      };
  }
}

/**
 * Format local time given a Unix timestamp (seconds) and timezone offset from UTC (seconds)
 */
export function formatLocalTime(
  timestampSec: number,
  timezoneOffsetSec: number,
  options: { includeMinutes?: boolean; format12h?: boolean } = {}
): string {
  const { includeMinutes = true, format12h = true } = options;
  // Calculate city local date using UTC ms + timezoneOffset ms
  const utcMs = timestampSec * 1000;
  const localDate = new Date(utcMs + timezoneOffsetSec * 1000);

  const hours = localDate.getUTCHours();
  const minutes = localDate.getUTCMinutes();

  if (format12h) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    if (!includeMinutes) return `${displayHours} ${period}`;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  }

  const displayHours = hours.toString().padStart(2, '0');
  if (!includeMinutes) return `${displayHours}:00`;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes}`;
}

/**
 * Format day of week for daily forecast (e.g. "Today", "Mon", "Tue")
 */
export function formatDayName(
  timestampSec: number,
  timezoneOffsetSec: number,
  isToday = false
): string {
  if (isToday) return 'Today';
  const utcMs = timestampSec * 1000;
  const localDate = new Date(utcMs + timezoneOffsetSec * 1000);
  const dayIndex = localDate.getUTCDay();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex];
}

/**
 * Calculate daylight progression percentage (0 to 100%)
 */
export function calculateDaylightProgress(
  sunriseSec: number,
  sunsetSec: number,
  currentSec: number
): number {
  if (currentSec <= sunriseSec) return 0;
  if (currentSec >= sunsetSec) return 100;
  const totalDaylight = sunsetSec - sunriseSec;
  if (totalDaylight <= 0) return 50;
  const elapsed = currentSec - sunriseSec;
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDaylight) * 100)));
}
