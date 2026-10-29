import { AirQualityData, CityLocation, DailyForecastItem, HourlyForecastItem, WeatherData } from '../types/weather';
import { getAqiCategory, mapWeatherCondition } from '../utils/weatherCalculations';
import { getMockWeatherData, POPULAR_CITIES } from './mockWeatherData';

const API_KEY_STORAGE_KEY = 'weather_app_owm_key';
const FAVORITES_STORAGE_KEY = 'weather_app_favorite_cities';
const LAST_CITY_STORAGE_KEY = 'weather_app_last_city';

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save API key to localStorage', err);
  }
}

export function getStoredFavorites(): CityLocation[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return POPULAR_CITIES.slice(0, 4);
    return JSON.parse(raw);
  } catch {
    return POPULAR_CITIES.slice(0, 4);
  }
}

export function saveStoredFavorites(cities: CityLocation[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(cities));
  } catch (err) {
    console.error('Failed to save favorites', err);
  }
}

export function getStoredLastCity(): CityLocation {
  try {
    const raw = localStorage.getItem(LAST_CITY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return POPULAR_CITIES[0]; // New York default
}

export function saveStoredLastCity(city: CityLocation): void {
  try {
    localStorage.setItem(LAST_CITY_STORAGE_KEY, JSON.stringify(city));
  } catch (err) {
    console.error('Failed to save last city', err);
  }
}

/**
 * Test OpenWeatherMap API key validity
 */
export async function testOpenWeatherMapKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  if (!apiKey || apiKey.trim().length < 16) {
    return { valid: false, message: 'Invalid API key format (typically 32 characters).' };
  }
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${apiKey.trim()}`;
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      return { valid: true, message: 'OpenWeatherMap API Key is active and verified!' };
    }
    return {
      valid: false,
      message: data.message || `API returned status ${res.status}. Note: new keys may take 10-60 min to activate.`,
    };
  } catch (err) {
    return {
      valid: false,
      message: err instanceof Error ? err.message : 'Network request failed.',
    };
  }
}

/**
 * Direct Geocoding search for city names
 */
export async function searchCities(query: string, apiKey?: string): Promise<CityLocation[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  const key = apiKey || getStoredApiKey();

  // 1. Try OpenWeatherMap Geocoding if API key is present
  if (key) {
    try {
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(clean)}&limit=5&appid=${key}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: { name: string; country: string; state?: string; lat: number; lon: number }) => ({
            name: item.name,
            country: item.country,
            state: item.state,
            lat: item.lat,
            lon: item.lon,
          }));
        }
      }
    } catch (err) {
      console.warn('OpenWeatherMap geocode failed, falling back to geocoding providers', err);
    }
  }

  // 2. Open-Meteo Geocoding (free, worldwide, returns state & country, no key needed)
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=6&language=en&format=json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((item: { name: string; country_code?: string; country?: string; admin1?: string; latitude: number; longitude: number }) => ({
          name: item.name,
          country: item.country_code ? item.country_code.toUpperCase() : item.country || '',
          state: item.admin1,
          lat: item.latitude,
          lon: item.longitude,
        }));
      }
    }
  } catch (err) {
    console.warn('Open-Meteo geocoding search failed', err);
  }

  // 3. OpenStreetMap Nominatim Geocoding fallback (handles any city, municipality, town, or district worldwide)
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean)}&format=json&addressdetails=1&limit=5`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: { display_name: string; name?: string; lat: string; lon: string; address?: { city?: string; town?: string; village?: string; county?: string; state?: string; country?: string; country_code?: string } }) => {
          const addr = item.address || {};
          const cityName = addr.city || addr.town || addr.village || addr.county || item.name || clean;
          return {
            name: cityName,
            country: addr.country_code ? addr.country_code.toUpperCase() : addr.country || '',
            state: addr.state,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          };
        });
      }
    }
  } catch (err) {
    console.warn('Nominatim geocode failed', err);
  }

  // 4. Match local popular cities as last local fallback
  const localMatches = POPULAR_CITIES.filter((c) =>
    c.name.toLowerCase().includes(clean.toLowerCase()) ||
    (c.state && c.state.toLowerCase().includes(clean.toLowerCase())) ||
    c.country.toLowerCase().includes(clean.toLowerCase())
  );
  return localMatches;
}

/**
 * Resolve single location by query string
 */
export async function resolveLocation(query: string, apiKey?: string): Promise<CityLocation | null> {
  const hits = await searchCities(query, apiKey);
  if (hits && hits.length > 0) {
    return hits[0];
  }
  return null;
}

/**
 * Reverse geocode lat/lon to exact city, state, and country
 */
export async function reverseGeocode(lat: number, lon: number, apiKey?: string): Promise<CityLocation> {
  const key = apiKey || getStoredApiKey();

  // 1. Try OpenWeatherMap Reverse Geocoding
  if (key) {
    try {
      const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${key}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            name: data[0].name,
            country: data[0].country,
            state: data[0].state,
            lat,
            lon,
          };
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. BigDataCloud reverse geocode client (free, high accuracy reverse geocode)
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const detectedCity = data.city || data.locality || data.principalSubdivision || 'Detected Location';
      return {
        name: detectedCity,
        country: data.countryCode || data.countryName || '',
        state: data.principalSubdivision || '',
        lat,
        lon,
      };
    }
  } catch {
    // fallback
  }

  // 3. Nominatim reverse geocode fallback
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const cityName = addr.city || addr.town || addr.village || addr.county || 'Detected Location';
      return {
        name: cityName,
        country: addr.country_code ? addr.country_code.toUpperCase() : addr.country || '',
        state: addr.state || '',
        lat,
        lon,
      };
    }
  } catch {
    // fallback
  }

  return {
    name: 'Current Coordinates',
    country: '',
    lat,
    lon,
  };
}

/**
 * Fetch weather from OpenWeatherMap API
 */
async function fetchFromOpenWeatherMap(location: CityLocation, apiKey: string): Promise<WeatherData> {
  const { lat, lon } = location;
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

  const [currentRes, forecastRes, aqiRes] = await Promise.all([
    fetch(currentUrl),
    fetch(forecastUrl),
    fetch(aqiUrl).catch(() => null),
  ]);

  if (!currentRes.ok) {
    const errData = await currentRes.json().catch(() => ({}));
    throw new Error(errData.message || `OpenWeatherMap error ${currentRes.status}`);
  }

  const currentData = await currentRes.json();
  const forecastData = forecastRes.ok ? await forecastRes.json() : null;
  const aqiData = aqiRes && aqiRes.ok ? await aqiRes.json() : null;

  const nowSec = currentData.dt || Math.floor(Date.now() / 1000);
  const sunrise = currentData.sys?.sunrise || nowSec - 14400;
  const sunset = currentData.sys?.sunset || nowSec + 25200;
  const isDaytime = nowSec >= sunrise && nowSec < sunset;
  const weatherCode = currentData.weather?.[0]?.id || 800;
  const conditionDesc = currentData.weather?.[0]?.description || 'Clear sky';

  // Process Hourly Forecast from 3-hourly entries
  const hourly: HourlyForecastItem[] = [];
  if (forecastData?.list && Array.isArray(forecastData.list)) {
    for (const item of forecastData.list.slice(0, 10)) {
      const itemTimestamp = item.dt;
      const hourLocal = new Date((itemTimestamp + (currentData.timezone || 0)) * 1000).getUTCHours();
      const itemIsDay = hourLocal >= 6 && hourLocal <= 19;
      const code = item.weather?.[0]?.id || 800;
      hourly.push({
        timestamp: itemTimestamp,
        tempCelsius: Math.round(item.main.temp * 10) / 10,
        feelsLikeCelsius: Math.round(item.main.feels_like * 10) / 10,
        precipitationChance: Math.round((item.pop || 0) * 100),
        condition: mapWeatherCondition(code, itemIsDay, item.weather?.[0]?.description),
        windSpeedMs: item.wind?.speed || 0,
        humidity: item.main.humidity || 50,
      });
    }
  }

  // Aggregate into daily forecasts (5 days)
  const daily: DailyForecastItem[] = [];
  if (forecastData?.list && Array.isArray(forecastData.list)) {
    const dailyMap = new Map<string, typeof forecastData.list>();
    for (const item of forecastData.list) {
      const dateKey = new Date((item.dt + (currentData.timezone || 0)) * 1000).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(item);
    }

    let dayIndex = 0;
    dailyMap.forEach((items, _) => {
      let min = 999;
      let max = -999;
      let maxPop = 0;
      let representativeCode = 800;
      let representativeDesc = 'Clear';
      let totalHum = 0;
      let totalWind = 0;

      items.forEach((item: { main: { temp_min: number; temp_max: number; humidity: number }; pop: number; weather: { id: number; description: string }[]; wind: { speed: number } }) => {
        if (item.main.temp_min < min) min = item.main.temp_min;
        if (item.main.temp_max > max) max = item.main.temp_max;
        if ((item.pop || 0) > maxPop) maxPop = item.pop || 0;
        totalHum += item.main.humidity || 0;
        totalWind += item.wind?.speed || 0;
        // choose midday condition or rainy code
        if (item.weather?.[0]?.id && item.weather[0].id < 800) {
          representativeCode = item.weather[0].id;
          representativeDesc = item.weather[0].description;
        } else if (representativeCode === 800 && item.weather?.[0]?.id) {
          representativeCode = item.weather[0].id;
          representativeDesc = item.weather[0].description;
        }
      });

      daily.push({
        dateTimestamp: items[0].dt,
        tempMinCelsius: Math.round(min),
        tempMaxCelsius: Math.round(max),
        precipitationChance: Math.round(maxPop * 100),
        condition: mapWeatherCondition(representativeCode, true, representativeDesc),
        humidity: Math.round(totalHum / items.length),
        windSpeedMs: Math.round((totalWind / items.length) * 10) / 10,
        uvIndex: 4 + (dayIndex % 3),
      });
      dayIndex++;
    });
  }

  // Air Quality
  let airQuality: AirQualityData | undefined;
  if (aqiData?.list?.[0]) {
    const raw = aqiData.list[0];
    const aqiScore = raw.main?.aqi || 1;
    const cat = getAqiCategory(aqiScore);
    airQuality = {
      aqi: aqiScore,
      label: cat.label,
      color: cat.color,
      summary: cat.summary,
      pollutants: [
        { code: 'PM2.5', name: 'Fine Particles', value: raw.components?.pm2_5 || 0, unit: 'µg/m³', status: aqiScore <= 2 ? 'good' : 'moderate' },
        { code: 'PM10', name: 'Coarse Particles', value: raw.components?.pm10 || 0, unit: 'µg/m³', status: aqiScore <= 2 ? 'good' : 'moderate' },
        { code: 'O3', name: 'Ozone', value: raw.components?.o3 || 0, unit: 'µg/m³', status: 'good' },
        { code: 'NO2', name: 'Nitrogen Dioxide', value: raw.components?.no2 || 0, unit: 'µg/m³', status: 'good' },
        { code: 'SO2', name: 'Sulfur Dioxide', value: raw.components?.so2 || 0, unit: 'µg/m³', status: 'good' },
        { code: 'CO', name: 'Carbon Monoxide', value: raw.components?.co || 0, unit: 'µg/m³', status: 'good' },
      ],
    };
  }

  return {
    city: {
      name: location.name || currentData.name,
      country: location.country || currentData.sys?.country,
      state: location.state,
      lat,
      lon,
    },
    current: {
      tempCelsius: Math.round(currentData.main.temp * 10) / 10,
      feelsLikeCelsius: Math.round(currentData.main.feels_like * 10) / 10,
      tempMinCelsius: Math.round(currentData.main.temp_min),
      tempMaxCelsius: Math.round(currentData.main.temp_max),
      humidity: currentData.main.humidity,
      pressure: currentData.main.pressure,
      windSpeedMs: currentData.wind?.speed || 0,
      windDeg: currentData.wind?.deg || 0,
      windGustMs: currentData.wind?.gust,
      visibilityMeters: currentData.visibility || 10000,
      clouds: currentData.clouds?.all || 0,
      condition: mapWeatherCondition(weatherCode, isDaytime, conditionDesc),
      sunriseTimestamp: sunrise,
      sunsetTimestamp: sunset,
      timestamp: nowSec,
      timezoneOffsetSec: currentData.timezone || 0,
      uvIndex: 4.8,
    },
    hourly,
    daily,
    airQuality,
    sourceProvider: 'OpenWeatherMap',
    lastUpdated: nowSec,
  };
}

/**
 * Convert WMO weather code to OpenWeatherMap weather code
 */
function wmoToOwmCode(wmo: number): number {
  if (wmo === 0) return 800; // Clear
  if (wmo === 1 || wmo === 2) return 801; // Few/scattered clouds
  if (wmo === 3) return 804; // Overcast
  if (wmo === 45 || wmo === 48) return 741; // Fog
  if (wmo >= 51 && wmo <= 57) return 300; // Drizzle
  if (wmo >= 61 && wmo <= 67) return 500; // Rain
  if (wmo >= 71 && wmo <= 77) return 600; // Snow
  if (wmo >= 80 && wmo <= 82) return 502; // Rain showers
  if (wmo >= 85 && wmo <= 86) return 621; // Snow showers
  if (wmo >= 95) return 211; // Thunderstorm
  return 800;
}

/**
 * Fetch from Open-Meteo (Live worldwide weather, no API key required)
 */
async function fetchFromOpenMeteo(location: CityLocation): Promise<WeatherData> {
  const { lat, lon } = location;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum&timezone=auto`;
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;

  const [weatherRes, aqiRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(aqiUrl).catch(() => null),
  ]);

  if (!weatherRes.ok) {
    throw new Error(`Open-Meteo error: ${weatherRes.status}`);
  }

  const wData = await weatherRes.json();
  const aqiData = aqiRes && aqiRes.ok ? await aqiRes.json() : null;

  const current = wData.current;
  const dailyRaw = wData.daily;
  const hourlyRaw = wData.hourly;
  const tzOffset = wData.utc_offset_seconds || 0;
  const nowSec = Math.floor(Date.now() / 1000);

  const owmCode = wmoToOwmCode(current.weather_code);
  const isDay = Boolean(current.is_day);

  // Sunrise / sunset parsing (from ISO string)
  const sunriseIso = dailyRaw?.sunrise?.[0];
  const sunsetIso = dailyRaw?.sunset?.[0];
  const sunriseSec = sunriseIso ? Math.floor(new Date(sunriseIso).getTime() / 1000) : nowSec - 14400;
  const sunsetSec = sunsetIso ? Math.floor(new Date(sunsetIso).getTime() / 1000) : nowSec + 25200;

  // Process 24 hourly points starting from now
  const hourly: HourlyForecastItem[] = [];
  if (hourlyRaw?.time && Array.isArray(hourlyRaw.time)) {
    const currentHourIso = new Date().toISOString().slice(0, 13);
    let startIndex = hourlyRaw.time.findIndex((t: string) => t.startsWith(currentHourIso));
    if (startIndex === -1) startIndex = 0;

    for (let i = startIndex; i < Math.min(startIndex + 24, hourlyRaw.time.length); i++) {
      const timeIso = hourlyRaw.time[i];
      const timestamp = Math.floor(new Date(timeIso).getTime() / 1000);
      const hourCode = wmoToOwmCode(hourlyRaw.weather_code?.[i] ?? 0);
      const hourLocal = new Date((timestamp + tzOffset) * 1000).getUTCHours();
      const hourIsDay = hourLocal >= 6 && hourLocal <= 19;

      hourly.push({
        timestamp,
        tempCelsius: Math.round((hourlyRaw.temperature_2m?.[i] ?? 0) * 10) / 10,
        feelsLikeCelsius: Math.round((hourlyRaw.apparent_temperature?.[i] ?? 0) * 10) / 10,
        precipitationChance: hourlyRaw.precipitation_probability?.[i] ?? 0,
        condition: mapWeatherCondition(hourCode, hourIsDay),
        windSpeedMs: Math.round(((hourlyRaw.wind_speed_10m?.[i] ?? 0) / 3.6) * 10) / 10, // km/h to m/s
        humidity: hourlyRaw.relative_humidity_2m?.[i] ?? 50,
      });
    }
  }

  // Process 7 daily points
  const daily: DailyForecastItem[] = [];
  if (dailyRaw?.time && Array.isArray(dailyRaw.time)) {
    for (let i = 0; i < Math.min(7, dailyRaw.time.length); i++) {
      const dateIso = dailyRaw.time[i];
      const dateTimestamp = Math.floor(new Date(dateIso).getTime() / 1000);
      const dayCode = wmoToOwmCode(dailyRaw.weather_code?.[i] ?? 0);

      daily.push({
        dateTimestamp,
        tempMinCelsius: Math.round(dailyRaw.temperature_2m_min?.[i] ?? 0),
        tempMaxCelsius: Math.round(dailyRaw.temperature_2m_max?.[i] ?? 0),
        precipitationChance: dailyRaw.precipitation_probability_max?.[i] ?? 0,
        precipitationAmountMm: dailyRaw.precipitation_sum?.[i] ?? 0,
        condition: mapWeatherCondition(dayCode, true),
        humidity: 60,
        windSpeedMs: 4.0,
        uvIndex: dailyRaw.uv_index_max?.[i] ?? 5.0,
      });
    }
  }

  // Air Quality
  let airQuality: AirQualityData | undefined;
  if (aqiData?.current) {
    const rawAqi = aqiData.current.european_aqi || Math.min(5, Math.ceil((aqiData.current.us_aqi || 50) / 40));
    const score = Math.max(1, Math.min(5, rawAqi));
    const cat = getAqiCategory(score);
    airQuality = {
      aqi: score,
      label: cat.label,
      color: cat.color,
      summary: cat.summary,
      pollutants: [
        { code: 'PM2.5', name: 'Fine Particles', value: aqiData.current.pm2_5 || 8.5, unit: 'µg/m³', status: score <= 2 ? 'good' : 'moderate' },
        { code: 'PM10', name: 'Coarse Particles', value: aqiData.current.pm10 || 15.2, unit: 'µg/m³', status: score <= 2 ? 'good' : 'moderate' },
        { code: 'O3', name: 'Ozone', value: aqiData.current.ozone || 45.0, unit: 'µg/m³', status: 'good' },
        { code: 'NO2', name: 'Nitrogen Dioxide', value: aqiData.current.nitrogen_dioxide || 14.0, unit: 'µg/m³', status: 'good' },
        { code: 'SO2', name: 'Sulfur Dioxide', value: aqiData.current.sulphur_dioxide || 3.1, unit: 'µg/m³', status: 'good' },
        { code: 'CO', name: 'Carbon Monoxide', value: aqiData.current.carbon_monoxide || 210, unit: 'µg/m³', status: 'good' },
      ],
    };
  }

  return {
    city: location,
    current: {
      tempCelsius: Math.round(current.temperature_2m * 10) / 10,
      feelsLikeCelsius: Math.round(current.apparent_temperature * 10) / 10,
      tempMinCelsius: Math.round(dailyRaw?.temperature_2m_min?.[0] ?? (current.temperature_2m - 4)),
      tempMaxCelsius: Math.round(dailyRaw?.temperature_2m_max?.[0] ?? (current.temperature_2m + 4)),
      humidity: current.relative_humidity_2m,
      pressure: Math.round(current.pressure_msl),
      windSpeedMs: Math.round((current.wind_speed_10m / 3.6) * 10) / 10,
      windDeg: current.wind_direction_10m,
      windGustMs: current.wind_gusts_10m ? Math.round((current.wind_gusts_10m / 3.6) * 10) / 10 : undefined,
      visibilityMeters: 10000,
      clouds: current.cloud_cover ?? 20,
      condition: mapWeatherCondition(owmCode, isDay),
      sunriseTimestamp: sunriseSec,
      sunsetTimestamp: sunsetSec,
      timestamp: nowSec,
      timezoneOffsetSec: tzOffset,
      uvIndex: dailyRaw?.uv_index_max?.[0] ?? 4.5,
    },
    hourly,
    daily,
    airQuality,
    sourceProvider: 'Open-Meteo',
    lastUpdated: nowSec,
  };
}

/**
 * Universal weather fetch function with cascade fallback:
 * 1. OpenWeatherMap (if API Key provided)
 * 2. Open-Meteo live API (no API key required)
 * 3. Seed / Mock weather data (offline fallback)
 */
export async function fetchWeatherData(location: CityLocation, customApiKey?: string): Promise<WeatherData> {
  const apiKey = customApiKey || getStoredApiKey();

  // If user provided OpenWeatherMap API key, try that first!
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const data = await fetchFromOpenWeatherMap(location, apiKey.trim());
      return data;
    } catch (owmErr) {
      console.warn('OpenWeatherMap API request failed, falling back to Open-Meteo live stream', owmErr);
    }
  }

  // Live real-world weather without requiring API keys
  try {
    const data = await fetchFromOpenMeteo(location);
    return data;
  } catch (omErr) {
    console.warn('Open-Meteo API failed, using curated seed data', omErr);
  }

  // High quality offline fallback
  return getMockWeatherData(location);
}
