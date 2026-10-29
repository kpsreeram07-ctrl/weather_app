import test from 'node:test';
import assert from 'node:assert/strict';
import { WEATHER_LAYERS } from '../utils/layerConfigs';
import { getFrameTileUrl } from './radarService';

test('WEATHER_LAYERS configuration has all active layers with labels and step colors', () => {
  const expectedLayers = [
    'temperature',
    'rain',
    'clouds',
    'humidity',
    'pressure',
    'radar',
  ];

  for (const layer of expectedLayers) {
    const config = WEATHER_LAYERS[layer as keyof typeof WEATHER_LAYERS];
    assert.ok(config, `Layer ${layer} must exist`);
    assert.ok(config.label.length > 0, `Layer ${layer} must have a non-empty label`);
    assert.ok(config.steps.length >= 4, `Layer ${layer} must have multiple color steps`);
    assert.ok(config.unitMetric, `Layer ${layer} must define unitMetric`);
  }

  assert.equal(WEATHER_LAYERS.rain.label, 'Rain and Thunder');
  assert.equal(WEATHER_LAYERS.temperature.label, 'Temperature');
  assert.equal(WEATHER_LAYERS.clouds.label, 'Clouds');
});

test('radarService getFrameTileUrl constructs valid XYZ tile URL with colorScheme', () => {
  const url = getFrameTileUrl(
    'https://tilecache.rainviewer.com',
    { time: 1792858200, path: '/v2/radar/152e863dc7ab' },
    2
  );

  assert.equal(
    url,
    'https://tilecache.rainviewer.com/v2/radar/152e863dc7ab/256/{z}/{x}/{y}/2/1_1.png'
  );
});
