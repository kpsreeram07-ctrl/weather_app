import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { UnitType, WeatherLayerType } from '../types/weather';
import { SpatialGridDataset, interpolateGridMetric } from '../services/radarAndGridApi';
import { celsiusToFahrenheit } from '../utils/weatherCalculations';

interface WeatherSpatialCanvasProps {
  map: L.Map | null;
  activeLayer: WeatherLayerType;
  gridData: SpatialGridDataset | null;
  unit: UnitType;
  opacity?: number;
}

// Color scale interpolators
function getTemperatureRgba(celsius: number): [number, number, number, number] {
  // -20 to 45 °C range
  if (celsius <= -20) return [129, 140, 248, 0.45];
  if (celsius <= -5) {
    const t = (celsius + 20) / 15;
    return [
      Math.round(129 + t * (56 - 129)),
      Math.round(140 + t * (189 - 140)),
      Math.round(248 + t * (248 - 248)),
      0.45,
    ];
  }
  if (celsius <= 10) {
    const t = (celsius + 5) / 15;
    return [
      Math.round(56 + t * (52 - 56)),
      Math.round(189 + t * (211 - 189)),
      Math.round(248 + t * (153 - 248)),
      0.48,
    ];
  }
  if (celsius <= 20) {
    const t = (celsius - 10) / 10;
    return [
      Math.round(52 + t * (251 - 52)),
      Math.round(211 + t * (191 - 211)),
      Math.round(153 + t * (36 - 153)),
      0.5,
    ];
  }
  if (celsius <= 30) {
    const t = (celsius - 20) / 10;
    return [
      Math.round(251 + t * (251 - 251)),
      Math.round(191 + t * (146 - 191)),
      Math.round(36 + t * (60 - 36)),
      0.52,
    ];
  }
  if (celsius <= 42) {
    const t = (celsius - 30) / 12;
    return [
      Math.round(251 + t * (244 - 251)),
      Math.round(146 + t * (63 - 146)),
      Math.round(60 + t * (94 - 60)),
      0.55,
    ];
  }
  return [225, 29, 72, 0.6];
}

function getHumidityRgba(hum: number): [number, number, number, number] {
  // 15% to 100%
  const clamped = Math.max(15, Math.min(100, hum));
  if (clamped <= 35) {
    const t = (clamped - 15) / 20;
    return [
      Math.round(254 + t * (134 - 254)),
      Math.round(240 + t * (239 - 240)),
      Math.round(138 + t * (172 - 138)),
      0.4,
    ];
  }
  if (clamped <= 65) {
    const t = (clamped - 35) / 30;
    return [
      Math.round(134 + t * (56 - 134)),
      Math.round(239 + t * (189 - 239)),
      Math.round(172 + t * (248 - 172)),
      0.45,
    ];
  }
  if (clamped <= 85) {
    const t = (clamped - 65) / 20;
    return [
      Math.round(56 + t * (37 - 56)),
      Math.round(189 + t * (99 - 189)),
      Math.round(248 + t * (235 - 248)),
      0.5,
    ];
  }
  const t = (clamped - 85) / 15;
  return [
    Math.round(37 + t * (30 - 37)),
    Math.round(99 + t * (27 - 99)),
    Math.round(235 + t * (120 - 235)),
    0.55,
  ];
}

function getPressureRgba(hpa: number): [number, number, number, number] {
  // 980 to 1035 hPa
  if (hpa <= 995) {
    const t = Math.max(0, (hpa - 975) / 20);
    return [
      Math.round(220 + t * (234 - 220)),
      Math.round(38 + t * (88 - 38)),
      Math.round(38 + t * (12 - 38)),
      0.48,
    ];
  }
  if (hpa <= 1013) {
    const t = (hpa - 995) / 18;
    return [
      Math.round(234 + t * (2 - 234)),
      Math.round(88 + t * (132 - 88)),
      Math.round(12 + t * (199 - 12)),
      0.45,
    ];
  }
  if (hpa <= 1025) {
    const t = (hpa - 1013) / 12;
    return [
      Math.round(2 + t * (22 - 2)),
      Math.round(132 + t * (163 - 132)),
      Math.round(199 + t * (74 - 199)),
      0.46,
    ];
  }
  const t = Math.min(1, (hpa - 1025) / 15);
  return [
    Math.round(22 + t * (124 - 22)),
    Math.round(163 + t * (58 - 163)),
    Math.round(74 + t * (237 - 74)),
    0.5,
  ];
}

function getCloudsRgba(percent: number): [number, number, number, number] {
  // Translucent clouds from 0% to 100%
  const alpha = Math.max(0, Math.min(0.85, (percent / 100) * 0.85));
  return [255, 255, 255, alpha];
}

export const WeatherSpatialCanvas: React.FC<WeatherSpatialCanvasProps> = ({
  map,
  activeLayer,
  gridData,
  unit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Only render for spatial layers
    const supportedLayers: WeatherLayerType[] = [
      'temperature',
      'humidity',
      'pressure',
      'clouds',
    ];
    if (!supportedLayers.includes(activeLayer) || !gridData || gridData.points.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const render = () => {
      if (!map || !canvas || !ctx) return;

      const size = map.getSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== size.x * dpr || canvas.height !== size.y * dpr) {
        canvas.width = size.x * dpr;
        canvas.height = size.y * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size.x, size.y);

      // Render spatial interpolated grid onto canvas
      // We calculate a lightweight grid of cells across screen coordinates
      const stepPx = 16; // cell resolution for 60fps rendering
      const cols = Math.ceil(size.x / stepPx);
      const rows = Math.ceil(size.y / stepPx);

      // Cache coordinate conversions for bounds
      for (let r = 0; r < rows; r++) {
        const y = r * stepPx;
        for (let c = 0; c < cols; c++) {
          const x = c * stepPx;
          const latLng = map.containerPointToLatLng([x + stepPx / 2, y + stepPx / 2]);

          let rgba: [number, number, number, number] = [0, 0, 0, 0];

          if (activeLayer === 'temperature') {
            const val = interpolateGridMetric(gridData.points, latLng.lat, latLng.lng, 'tempC');
            rgba = getTemperatureRgba(val);
          } else if (activeLayer === 'humidity') {
            const val = interpolateGridMetric(gridData.points, latLng.lat, latLng.lng, 'humidity');
            rgba = getHumidityRgba(val);
          } else if (activeLayer === 'pressure') {
            const val = interpolateGridMetric(gridData.points, latLng.lat, latLng.lng, 'pressure');
            rgba = getPressureRgba(val);
          } else if (activeLayer === 'clouds') {
            const val = interpolateGridMetric(gridData.points, latLng.lat, latLng.lng, 'cloudsPercent');
            rgba = getCloudsRgba(val);
          }

          if (rgba[3] > 0.02) {
            ctx.fillStyle = `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3]})`;
            ctx.fillRect(x, y, stepPx, stepPx);
          }
        }
      }

      // Draw value badge markers at the actual grid points for high meteorological readability
      const bounds = map.getBounds();
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const p of gridData.points) {
        if (!bounds.contains([p.lat, p.lon])) continue;

        const pt = map.latLngToContainerPoint([p.lat, p.lon]);

        let text = '';
        let badgeBg = 'rgba(15, 23, 42, 0.75)';
        let badgeText = '#ffffff';

        if (activeLayer === 'temperature') {
          const displayTemp = unit === 'imperial' ? Math.round(celsiusToFahrenheit(p.tempC)) : Math.round(p.tempC);
          text = `${displayTemp}°`;
          badgeText = p.tempC > 28 ? '#fb923c' : p.tempC < 10 ? '#38bdf8' : '#4ade80';
        } else if (activeLayer === 'humidity') {
          text = `${Math.round(p.humidity)}%`;
          badgeText = '#38bdf8';
        } else if (activeLayer === 'pressure') {
          text = `${Math.round(p.pressure)}`;
          badgeText = '#f8fafc';
        } else if (activeLayer === 'clouds') {
          text = `${Math.round(p.cloudsPercent)}%`;
          badgeText = '#cbd5e1';
        }

        if (text) {
          const textWidth = ctx.measureText(text).width;
          const padX = 6;
          const padY = 3;
          const boxW = textWidth + padX * 2;
          const boxH = 18;

          // Draw pill background
          ctx.fillStyle = badgeBg;
          ctx.beginPath();
          ctx.roundRect(pt.x - boxW / 2, pt.y - boxH / 2, boxW, boxH, 9);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw text
          ctx.fillStyle = badgeText;
          ctx.fillText(text, pt.x, pt.y);
        }
      }

      ctx.restore();
    };

    const handleUpdate = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    map.on('move', handleUpdate);
    map.on('zoom', handleUpdate);
    map.on('resize', handleUpdate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.off('move', handleUpdate);
      map.off('zoom', handleUpdate);
      map.off('resize', handleUpdate);
    };
  }, [map, activeLayer, gridData, unit]);

  const isVisible = ['temperature', 'humidity', 'pressure', 'clouds'].includes(activeLayer);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none transition-opacity duration-300 z-[350] ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
};
