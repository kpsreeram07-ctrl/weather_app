import React from 'react';
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
} from 'lucide-react';
import { WeatherConditionInfo } from '../types/weather';

interface WeatherIconProps {
  condition: WeatherConditionInfo;
  className?: string;
  size?: number;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  condition,
  className = 'w-6 h-6',
  size,
}) => {
  const { category, isDaytime } = condition;
  const props = { className, size };

  switch (category) {
    case 'clear':
      return isDaytime ? (
        <Sun {...props} className={`${className} text-amber-400`} />
      ) : (
        <Moon {...props} className={`${className} text-indigo-300`} />
      );

    case 'clouds':
      if (condition.iconName === 'CloudSun') {
        return <CloudSun {...props} className={`${className} text-amber-300`} />;
      }
      if (condition.iconName === 'CloudMoon') {
        return <CloudMoon {...props} className={`${className} text-indigo-300`} />;
      }
      return <Cloud {...props} className={`${className} text-slate-300`} />;

    case 'rain':
      return <CloudRain {...props} className={`${className} text-sky-400`} />;

    case 'drizzle':
      return <CloudDrizzle {...props} className={`${className} text-sky-300`} />;

    case 'thunderstorm':
      return <CloudLightning {...props} className={`${className} text-purple-400`} />;

    case 'snow':
      return <CloudSnow {...props} className={`${className} text-sky-100`} />;

    case 'mist':
    default:
      return <CloudFog {...props} className={`${className} text-slate-400`} />;
  }
};
