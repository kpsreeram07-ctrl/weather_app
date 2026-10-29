import { CityLocation, WeatherData } from '../types/weather';
import { mapWeatherCondition } from '../utils/weatherCalculations';

export const POPULAR_CITIES: CityLocation[] = [
  { name: 'New York', country: 'US', state: 'NY', lat: 40.7128, lon: -74.006 },
  { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
  { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 },
  { name: 'San Francisco', country: 'US', state: 'CA', lat: 37.7749, lon: -122.4194 },
  { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
  { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
  { name: 'Reykjavik', country: 'IS', lat: 64.1466, lon: -21.9426 },
  { name: 'Cairo', country: 'EG', lat: 30.0444, lon: 31.2357 },
];

export function getMockWeatherData(city: CityLocation): WeatherData {
  const now = Math.floor(Date.now() / 1000);
  // Estimate timezone offset from longitude (15 degrees = 1 hour = 3600s)
  const tzOffset = city.name === 'Tokyo' ? 32400 : city.name === 'London' ? 0 : city.name === 'Sydney' ? 36000 : city.name === 'New York' ? -14400 : Math.round(city.lon / 15) * 3600;
  
  // Specific thematic base temp per city
  let baseTemp = 19;
  let weatherId = 800; // clear
  let desc = 'Clear sky';
  let humidity = 58;
  let windSpeed = 3.8;
  let uvIndex = 4.5;
  let aqi = 1;

  if (city.name === 'London') {
    baseTemp = 14;
    weatherId = 500;
    desc = 'Light rain';
    humidity = 82;
    windSpeed = 5.2;
    uvIndex = 2.0;
    aqi = 2;
  } else if (city.name === 'Tokyo') {
    baseTemp = 18;
    weatherId = 801;
    desc = 'Few clouds';
    humidity = 64;
    windSpeed = 4.1;
    uvIndex = 5.2;
    aqi = 2;
  } else if (city.name === 'Dubai') {
    baseTemp = 33;
    weatherId = 800;
    desc = 'Sunny and clear';
    humidity = 35;
    windSpeed = 3.1;
    uvIndex = 8.5;
    aqi = 3;
  } else if (city.name === 'Reykjavik') {
    baseTemp = 3;
    weatherId = 600;
    desc = 'Light snow flurries';
    humidity = 78;
    windSpeed = 6.4;
    uvIndex = 0.8;
    aqi = 1;
  } else if (city.name === 'Paris') {
    baseTemp = 16;
    weatherId = 803;
    desc = 'Broken clouds';
    humidity = 68;
    windSpeed = 4.0;
    uvIndex = 3.6;
    aqi = 2;
  } else if (city.name === 'Sydney') {
    baseTemp = 24;
    weatherId = 800;
    desc = 'Sunny and breezy';
    humidity = 55;
    windSpeed = 5.8;
    uvIndex = 6.9;
    aqi = 1;
  }

  const sunrise = now - 14400;
  const sunset = now + 25200;

  // Generate 24 hourly forecast items
  const hourly = Array.from({ length: 24 }).map((_, i) => {
    const timestamp = now + i * 3600;
    const tempDelta = Math.sin((i / 24) * Math.PI * 2) * 4;
    const itemTemp = Math.round((baseTemp + tempDelta) * 10) / 10;
    const itemRain = weatherId >= 500 && weatherId < 600 ? Math.min(90, 40 + i * 2) : Math.max(5, (i % 5) * 6);
    
    // Check if hour is day/night
    const hourLocal = new Date((timestamp + tzOffset) * 1000).getUTCHours();
    const isDay = hourLocal >= 6 && hourLocal <= 19;
    
    return {
      timestamp,
      tempCelsius: itemTemp,
      feelsLikeCelsius: Math.round((itemTemp - 0.5) * 10) / 10,
      precipitationChance: itemRain,
      condition: mapWeatherCondition(weatherId, isDay, desc),
      windSpeedMs: Math.round((windSpeed + Math.sin(i) * 1.5) * 10) / 10,
      humidity: Math.min(95, Math.max(30, Math.round(humidity + Math.cos(i) * 8))),
    };
  });

  // Generate 7 daily forecast items
  const daily = Array.from({ length: 7 }).map((_, i) => {
    const dateTimestamp = now + i * 86400;
    const dayVariation = (i % 3) - 1;
    const tMin = Math.round(baseTemp - 4 + dayVariation);
    const tMax = Math.round(baseTemp + 5 + dayVariation);
    const dayCode = i === 1 ? 802 : i === 3 ? 500 : weatherId;

    return {
      dateTimestamp,
      tempMinCelsius: tMin,
      tempMaxCelsius: tMax,
      precipitationChance: dayCode >= 500 ? 70 : 15,
      precipitationAmountMm: dayCode >= 500 ? 3.4 : 0,
      condition: mapWeatherCondition(dayCode, true),
      humidity: humidity + (i % 2 === 0 ? 3 : -4),
      windSpeedMs: windSpeed + 0.3 * i,
      uvIndex: Math.max(1, uvIndex + (i % 2 === 0 ? 0.5 : -0.5)),
    };
  });

  return {
    city,
    current: {
      tempCelsius: baseTemp,
      feelsLikeCelsius: baseTemp - 1,
      tempMinCelsius: baseTemp - 4,
      tempMaxCelsius: baseTemp + 5,
      humidity,
      pressure: 1014,
      windSpeedMs: windSpeed,
      windDeg: 195,
      windGustMs: windSpeed + 2.5,
      visibilityMeters: 10000,
      clouds: weatherId === 800 ? 5 : 65,
      condition: mapWeatherCondition(weatherId, true, desc),
      sunriseTimestamp: sunrise,
      sunsetTimestamp: sunset,
      timestamp: now,
      timezoneOffsetSec: tzOffset,
      uvIndex,
    },
    hourly,
    daily,
    airQuality: {
      aqi,
      label: aqi === 1 ? 'Good' : aqi === 2 ? 'Fair' : 'Moderate',
      color: aqi === 1 ? '#22c55e' : aqi === 2 ? '#84cc16' : '#eab308',
      summary: aqi === 1 ? 'Air quality is satisfactory with minimal pollution risk.' : 'Air quality is acceptable for most healthy people.',
      pollutants: [
        { code: 'PM2.5', name: 'Fine Particles', value: 9.4, unit: 'µg/m³', status: 'good' },
        { code: 'PM10', name: 'Coarse Particles', value: 16.2, unit: 'µg/m³', status: 'good' },
        { code: 'O3', name: 'Ozone', value: 58.1, unit: 'µg/m³', status: 'good' },
        { code: 'NO2', name: 'Nitrogen Dioxide', value: 18.7, unit: 'µg/m³', status: 'good' },
        { code: 'SO2', name: 'Sulfur Dioxide', value: 4.2, unit: 'µg/m³', status: 'good' },
        { code: 'CO', name: 'Carbon Monoxide', value: 240, unit: 'µg/m³', status: 'good' },
      ],
    },
    sourceProvider: 'Demo',
    lastUpdated: now,
  };
}
