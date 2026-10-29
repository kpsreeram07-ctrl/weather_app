import test from 'node:test';
import assert from 'node:assert/strict';
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatTemp,
  formatWindSpeed,
  formatPressure,
  formatVisibility,
  getWindDirection,
  mapWeatherCondition,
  getUvIndexCategory,
  getAqiCategory,
  formatLocalTime,
  formatDayName,
  calculateDaylightProgress,
} from './weatherCalculations';

test('temperature conversion formulas', () => {
  assert.equal(celsiusToFahrenheit(0), 32);
  assert.equal(celsiusToFahrenheit(100), 212);
  assert.equal(Math.round(celsiusToFahrenheit(20)), 68);
  assert.equal(fahrenheitToCelsius(32), 0);
  assert.equal(fahrenheitToCelsius(212), 100);
});

test('formatTemp handles metric and imperial', () => {
  assert.equal(formatTemp(21.4, 'metric'), '21°C');
  assert.equal(formatTemp(21.4, 'imperial'), '71°F');
  assert.equal(formatTemp(0, 'metric', false), '0');
  assert.equal(formatTemp(0, 'imperial', false), '32');
});

test('formatWindSpeed formats correctly', () => {
  assert.equal(formatWindSpeed(5, 'metric'), '18 km/h');
  assert.equal(formatWindSpeed(5, 'imperial'), '11.2 mph');
});

test('formatPressure formats correctly', () => {
  assert.equal(formatPressure(1013.25, 'metric'), '1013 hPa');
  assert.equal(formatPressure(1013.25, 'imperial'), '29.92 inHg');
});

test('formatVisibility formats meters to km and miles', () => {
  assert.equal(formatVisibility(10000, 'metric'), '10.0 km');
  assert.equal(formatVisibility(16093, 'imperial'), '10.0 mi');
});

test('getWindDirection accurately returns 16-point cardinal compass', () => {
  assert.equal(getWindDirection(0), 'N');
  assert.equal(getWindDirection(90), 'E');
  assert.equal(getWindDirection(180), 'S');
  assert.equal(getWindDirection(270), 'W');
  assert.equal(getWindDirection(45), 'NE');
  assert.equal(getWindDirection(225), 'SW');
});

test('mapWeatherCondition maps codes to categories and descriptions', () => {
  const clear = mapWeatherCondition(800, true);
  assert.equal(clear.category, 'clear');
  assert.equal(clear.title, 'Clear Sky');

  const rain = mapWeatherCondition(501, true);
  assert.equal(rain.category, 'rain');

  const storm = mapWeatherCondition(211, true);
  assert.equal(storm.category, 'thunderstorm');

  const snow = mapWeatherCondition(600, true);
  assert.equal(snow.category, 'snow');
});

test('getUvIndexCategory classifies UV levels', () => {
  assert.equal(getUvIndexCategory(1.5).label, 'Low');
  assert.equal(getUvIndexCategory(4.2).label, 'Moderate');
  assert.equal(getUvIndexCategory(6.8).label, 'High');
  assert.equal(getUvIndexCategory(9.0).label, 'Very High');
  assert.equal(getUvIndexCategory(11.5).label, 'Extreme');
});

test('getAqiCategory maps 1-5 scale accurately', () => {
  assert.equal(getAqiCategory(1).label, 'Good');
  assert.equal(getAqiCategory(3).label, 'Moderate');
  assert.equal(getAqiCategory(5).label, 'Very Poor');
});

test('calculateDaylightProgress accurately reports daylight percentage', () => {
  const sunrise = 1000;
  const sunset = 2000;
  assert.equal(calculateDaylightProgress(sunrise, sunset, 900), 0);
  assert.equal(calculateDaylightProgress(sunrise, sunset, 1500), 50);
  assert.equal(calculateDaylightProgress(sunrise, sunset, 2100), 100);
});

test('formatLocalTime and formatDayName work with timezone offsets', () => {
  // 1700000000 is 2023-11-14T22:13:20Z
  const timestamp = 1700000000;
  const timeUtc = formatLocalTime(timestamp, 0, { format12h: false });
  assert.equal(timeUtc, '22:13');

  const timeTokyo = formatLocalTime(timestamp, 9 * 3600, { format12h: false });
  // 22:13 + 9h = next day 07:13
  assert.equal(timeTokyo, '07:13');

  assert.equal(formatDayName(timestamp, 0, true), 'Today');
});

test('location display formats city, state, country properly without undefined or missing fields', () => {
  const formatLocationHeading = (loc: { name: string; state?: string; country?: string }) => {
    return [loc.name, loc.state, loc.country].filter(Boolean).join(', ');
  };

  assert.equal(
    formatLocationHeading({ name: 'Chennai', state: 'Tamil Nadu', country: 'India' }),
    'Chennai, Tamil Nadu, India'
  );

  assert.equal(
    formatLocationHeading({ name: 'Kanchipuram', state: 'Tamil Nadu', country: 'India' }),
    'Kanchipuram, Tamil Nadu, India'
  );

  assert.equal(
    formatLocationHeading({ name: 'Tokyo', country: 'Japan' }),
    'Tokyo, Japan'
  );
});

