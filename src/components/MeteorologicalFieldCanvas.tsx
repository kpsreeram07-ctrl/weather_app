import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { SpatialGridData, WeatherGridPoint } from '../services/spatialWeatherService';
import { UnitType, WeatherLayerType } from '../types/weather';

interface MeteorologicalFieldCanvasProps {
  map: L.Map | null;
  activeLayer: WeatherLayerType;
  gridData: SpatialGridData | null;
  unit: UnitType;
}

export const MeteorologicalFieldCanvas: React.FC<MeteorologicalFieldCanvasProps> = ({
  map,
  activeLayer,
  gridData,
  unit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Only render for field-based layers
    const isFieldLayer =
      activeLayer === 'temperature' ||
      activeLayer === 'humidity' ||
      activeLayer === 'pressure' ||
      activeLayer === 'clouds';

    if (!map || !canvasRef.current || !isFieldLayer || !gridData || gridData.points.length === 0) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeAndRender = () => {
      if (!map || !canvas) return;
      const size = map.getSize();
      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }
      renderField();
    };

    const getInterpolatedValue = (
      screenX: number,
      screenY: number,
      projectedPoints: { x: number; y: number; p: WeatherGridPoint }[],
      field: keyof WeatherGridPoint
    ): number => {
      let sumWeights = 0;
      let sumValues = 0;

      // Inverse Distance Weighting (IDW) from closest points
      for (let i = 0; i < projectedPoints.length; i++) {
        const pt = projectedPoints[i];
        const dx = pt.x - screenX;
        const dy = pt.y - screenY;
        const distSq = dx * dx + dy * dy;

        if (distSq < 4) {
          return pt.p[field] as number;
        }

        const weight = 1 / Math.pow(distSq, 1.2);
        sumWeights += weight;
        sumValues += weight * (pt.p[field] as number);
      }

      return sumWeights > 0 ? sumValues / sumWeights : 0;
    };

    // Color scales matching meteorological standards
    const getTemperatureColor = (celsius: number): [number, number, number, number] => {
      // Scale: -20°C (deep violet) to 42°C+ (crimson)
      if (celsius <= -15) return [79, 70, 229, 0.65]; // indigo
      if (celsius <= -5) return [6, 182, 212, 0.65]; // cyan
      if (celsius <= 5) return [56, 189, 248, 0.65]; // sky
      if (celsius <= 15) return [34, 197, 94, 0.65]; // green
      if (celsius <= 23) return [234, 179, 8, 0.68]; // yellow
      if (celsius <= 32) return [249, 115, 22, 0.7]; // orange
      if (celsius <= 38) return [239, 68, 68, 0.72]; // red
      return [190, 18, 60, 0.75]; // crimson
    };

    const getHumidityColor = (hum: number): [number, number, number, number] => {
      // Scale: 0-100%
      if (hum <= 25) return [217, 119, 6, 0.55]; // warm amber (dry)
      if (hum <= 45) return [234, 179, 8, 0.55]; // yellow
      if (hum <= 65) return [20, 184, 166, 0.6]; // teal
      if (hum <= 80) return [37, 99, 235, 0.65]; // blue
      return [30, 27, 75, 0.72]; // deep navy (saturated)
    };

    const getPressureColor = (hpa: number): [number, number, number, number] => {
      // Scale: 980 to 1040 hPa
      if (hpa <= 992) return [220, 38, 38, 0.65]; // low pressure red
      if (hpa <= 1005) return [249, 115, 22, 0.65]; // orange
      if (hpa <= 1013) return [2, 132, 199, 0.65]; // neutral sky blue
      if (hpa <= 1022) return [22, 163, 74, 0.65]; // green
      return [124, 58, 237, 0.7]; // high pressure purple
    };

    const getCloudsColor = (cloudsPct: number): [number, number, number, number] => {
      if (cloudsPct < 15) return [0, 0, 0, 0]; // clear sky
      const alpha = Math.min(0.75, (cloudsPct / 100) * 0.75);
      return [241, 245, 249, alpha]; // crisp cloud white
    };

    const renderField = () => {
      if (!map || !canvas || !gridData) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Project grid points to current map container coordinates
      const projected = gridData.points.map((p) => {
        const point = map.latLngToContainerPoint([p.lat, p.lon]);
        return { x: point.x, y: point.y, p };
      });

      // Render a coarse grid for performance then smooth with canvas filter
      const cellSize = Math.max(16, Math.min(32, Math.floor(canvas.width / 40)));
      const cols = Math.ceil(canvas.width / cellSize) + 1;
      const rows = Math.ceil(canvas.height / cellSize) + 1;

      // Offscreen buffer for interpolation
      const offscreen = document.createElement('canvas');
      offscreen.width = cols;
      offscreen.height = rows;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      const imgData = offCtx.createImageData(cols, rows);
      const data = imgData.data;

      const fieldKey =
        activeLayer === 'temperature'
          ? 'tempCelsius'
          : activeLayer === 'humidity'
          ? 'humidity'
          : activeLayer === 'pressure'
          ? 'pressure'
          : 'clouds';

      for (let r = 0; r < rows; r++) {
        const sy = r * cellSize;
        for (let c = 0; c < cols; c++) {
          const sx = c * cellSize;
          const val = getInterpolatedValue(sx, sy, projected, fieldKey);

          let rgba: [number, number, number, number];
          if (activeLayer === 'temperature') {
            rgba = getTemperatureColor(val);
          } else if (activeLayer === 'humidity') {
            rgba = getHumidityColor(val);
          } else if (activeLayer === 'pressure') {
            rgba = getPressureColor(val);
          } else {
            rgba = getCloudsColor(val);
          }

          const idx = (r * cols + c) * 4;
          data[idx] = rgba[0];
          data[idx + 1] = rgba[1];
          data[idx + 2] = rgba[2];
          data[idx + 3] = Math.floor(rgba[3] * 255);
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // Upscale smoothly onto main canvas
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

      // Render pressure isobars or thermal values for high clarity
      if (activeLayer === 'pressure') {
        // Draw isobar contour labels across the map
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.font = '600 11px monospace';

        projected.forEach((pt) => {
          if (pt.x > 30 && pt.x < canvas.width - 30 && pt.y > 30 && pt.y < canvas.height - 30) {
            const hpa = Math.round(pt.p.pressure);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillText(`${hpa} hPa`, pt.x + 8, pt.y + 4);
          }
        });
      } else if (activeLayer === 'temperature') {
        // Subtle thermal spot labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '700 11px system-ui, sans-serif';
        projected.forEach((pt) => {
          if (pt.x > 40 && pt.x < canvas.width - 40 && pt.y > 40 && pt.y < canvas.height - 40) {
            const displayTemp =
              unit === 'imperial'
                ? Math.round((pt.p.tempCelsius * 9) / 5 + 32)
                : Math.round(pt.p.tempCelsius);
            ctx.fillText(`${displayTemp}°`, pt.x + 6, pt.y + 4);
          }
        });
      }

      ctx.restore();
    };

    resizeAndRender();

    map.on('move', renderField);
    map.on('zoom', renderField);
    map.on('resize', resizeAndRender);

    return () => {
      map.off('move', renderField);
      map.off('zoom', renderField);
      map.off('resize', resizeAndRender);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [map, activeLayer, gridData, unit]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[350]"
      style={{
        opacity: activeLayer === 'clouds' ? 0.7 : 0.62,
        mixBlendMode: activeLayer === 'clouds' ? 'screen' : 'normal',
      }}
    />
  );
};
