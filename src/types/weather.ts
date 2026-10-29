export type UnitType = 'metric' | 'imperial';

export type WeatherConditionCategory =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'extreme';

export interface WeatherConditionInfo {
  category: WeatherConditionCategory;
  title: string;
  description: string;
  iconName: string;
  gradientClass: string;
  accentColor: string;
  isDaytime: boolean;
}

export interface CityLocation {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  tempCelsius: number;
  feelsLikeCelsius: number;
  tempMinCelsius: number;
  tempMaxCelsius: number;
  humidity: number; // %
  pressure: number; // hPa
  windSpeedMs: number; // m/s
  windDeg: number; // degrees
  windGustMs?: number;
  visibilityMeters: number; // meters
  clouds: number; // %
  condition: WeatherConditionInfo;
  sunriseTimestamp: number; // unix sec
  sunsetTimestamp: number; // unix sec
  timestamp: number; // unix sec
  timezoneOffsetSec: number; // offset from UTC in seconds
  uvIndex?: number;
}

export interface HourlyForecastItem {
  timestamp: number; // unix sec
  tempCelsius: number;
  feelsLikeCelsius: number;
  precipitationChance: number; // 0-100%
  condition: WeatherConditionInfo;
  windSpeedMs: number;
  humidity: number;
}

export interface DailyForecastItem {
  dateTimestamp: number; // unix sec
  tempMinCelsius: number;
  tempMaxCelsius: number;
  precipitationChance: number; // 0-100%
  precipitationAmountMm?: number;
  condition: WeatherConditionInfo;
  humidity: number;
  windSpeedMs: number;
  uvIndex?: number;
}

export interface PollutantDetail {
  code: string;
  name: string;
  value: number; // ug/m3
  unit: string;
  status: 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
}

export interface AirQualityData {
  aqi: number; // 1 to 5 (OpenWeatherMap) or US AQI 0-500
  label: string;
  color: string;
  summary: string;
  pollutants: PollutantDetail[];
}

export interface WeatherData {
  city: CityLocation;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  airQuality?: AirQualityData;
  sourceProvider: 'OpenWeatherMap' | 'Open-Meteo' | 'Demo';
  lastUpdated: number;
}

export type WeatherLayerType =
  | 'rain'
  | 'temperature'
  | 'clouds'
  | 'humidity'
  | 'pressure'
  | 'radar';

export interface LegendStep {
  value: number;
  label: string;
  color: string;
}

export interface WeatherLayerConfig {
  id: WeatherLayerType;
  label: string;
  description: string;
  unitMetric: string;
  unitImperial: string;
  steps: LegendStep[];
  defaultOpacity?: number;
}
