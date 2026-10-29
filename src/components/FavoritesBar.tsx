import React from 'react';
import { Star, MapPin, X } from 'lucide-react';
import { CityLocation } from '../types/weather';

interface FavoritesBarProps {
  favorites: CityLocation[];
  currentCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  onToggleFavorite: (city: CityLocation) => void;
  isCurrentFavorite: boolean;
}

export const FavoritesBar: React.FC<FavoritesBarProps> = ({
  favorites,
  currentCity,
  onSelectCity,
  onToggleFavorite,
  isCurrentFavorite,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none text-xs">
      {/* Pin/Unpin button for current city */}
      <button
        type="button"
        onClick={() => onToggleFavorite(currentCity)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all shrink-0 ${
          isCurrentFavorite
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
        }`}
        title={isCurrentFavorite ? 'Remove from favorites' : 'Save current city to favorites'}
      >
        <Star
          className={`w-3.5 h-3.5 ${
            isCurrentFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        />
        <span>{isCurrentFavorite ? 'Pinned' : 'Pin to favorites'}</span>
      </button>

      {/* Vertical separator */}
      <div className="h-4 w-px bg-slate-800 shrink-0 mx-1"></div>

      {/* Pinned city chips */}
      {favorites.map((fav) => {
        const isSelected =
          fav.name.toLowerCase() === currentCity.name.toLowerCase() &&
          (fav.country === currentCity.country || !fav.country || !currentCity.country);

        return (
          <div
            key={`${fav.name}-${fav.country}-${fav.lat}`}
            className={`flex items-center rounded-lg border transition-all shrink-0 ${
              isSelected
                ? 'bg-sky-500/15 border-sky-500/50 text-sky-200 shadow-sm'
                : 'bg-slate-800/60 border-slate-750 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectCity(fav)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
            >
              <MapPin className="w-3 h-3 text-sky-400/80" />
              <span>{fav.name}</span>
              {fav.country && (
                <span className="text-[10px] text-slate-400">({fav.country})</span>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(fav);
              }}
              className="pr-2 pl-0.5 py-1.5 text-slate-500 hover:text-red-400 transition-colors"
              title={`Remove ${fav.name} from favorites`}
              aria-label={`Remove ${fav.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
