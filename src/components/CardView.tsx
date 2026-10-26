import React from 'react';
import { su, rk } from '../game/chinchon';

// Path to the authentic Spanish deck sprite sheet
export const DECK_SPRITE_URL = '/assets/aistudio/image_582cfcc6.png';

const CARD_WIDTH = 208;
const CARD_HEIGHT = 319;

// Map rank index (0..9) to sprite sheet column (0..11)
// In the 48-card sheet:
// cols 0..6: 1, 2, 3, 4, 5, 6, 7
// cols 7, 8: 8, 9 (not in 40-card Chinchón deck)
// cols 9, 10, 11: 10 (Sota), 11 (Caballo), 12 (Rey)
const RANK_TO_COL = [0, 1, 2, 3, 4, 5, 6, 9, 10, 11];

interface CardViewProps {
  id: number;
  isSelected?: boolean;
  canClose?: boolean;
  disabled?: boolean;
  isNew?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'mini';
  onClick?: () => void;
  className?: string;
  badge?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  id,
  isSelected = false,
  canClose = false,
  disabled = false,
  isNew = false,
  size = 'md',
  onClick,
  className = '',
  badge,
}) => {
  const suitIndex = su(id); // 0: Oros, 1: Copas, 2: Espadas, 3: Bastos
  const rankIndex = rk(id); // 0..9

  const col = RANK_TO_COL[rankIndex] ?? 0;
  const row = suitIndex; // 0..3

  const x = col * CARD_WIDTH;
  const y = row * CARD_HEIGHT;

  const sizeClasses = {
    mini: 'w-8 h-12 rounded-[4px]',
    sm: 'w-11 h-17 sm:w-13 sm:h-20 rounded-[5px]',
    md: 'w-15 h-23 sm:w-17 sm:h-26 md:w-20 md:h-31 rounded-[7px]',
    lg: 'w-20 h-31 sm:w-24 sm:h-37 md:w-28 md:h-43 rounded-[8px]',
  };

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative select-none transition-all duration-200 cursor-pointer
        bg-white shadow-md border border-zinc-400/60 overflow-visible
        ${sizeClasses[size]}
        ${isSelected ? '-translate-y-4 ring-3 ring-amber-400 shadow-xl shadow-amber-400/40 z-20' : 'hover:-translate-y-1 hover:shadow-lg'}
        ${canClose && isSelected ? 'ring-3 ring-emerald-400 shadow-emerald-400/50' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed hover:translate-y-0' : ''}
        ${isNew ? 'animate-bounce' : ''}
        ${className}
      `}
      style={{
        boxShadow: isSelected
          ? '0 14px 28px -4px rgba(0,0,0,0.45), 0 0 18px rgba(245, 158, 11, 0.45)'
          : undefined,
      }}
    >
      {/* SVG rendering card slice from authentic sprite sheet */}
      <svg
        viewBox={`${x} ${y} ${CARD_WIDTH} ${CARD_HEIGHT}`}
        className="w-full h-full rounded-[inherit] block pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <image
          href={DECK_SPRITE_URL}
          x="0"
          y="0"
          width="2496"
          height="1595"
        />
      </svg>

      {/* Optional Top Badge */}
      {badge && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-md whitespace-nowrap z-30">
          {badge}
        </span>
      )}

      {/* Close marker */}
      {canClose && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-md whitespace-nowrap z-30">
          Cerrar
        </span>
      )}
    </div>
  );
};

export const CardBack: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'mini';
  onClick?: () => void;
  count?: number;
  className?: string;
  glow?: boolean;
}> = ({ size = 'md', onClick, count, className = '', glow = false }) => {
  const sizeClasses = {
    mini: 'w-8 h-12 rounded-[4px]',
    sm: 'w-11 h-17 sm:w-13 sm:h-20 rounded-[5px]',
    md: 'w-15 h-23 sm:w-17 sm:h-26 md:w-20 md:h-31 rounded-[7px]',
    lg: 'w-20 h-31 sm:w-24 sm:h-37 md:w-28 md:h-43 rounded-[8px]',
  };

  // Card back is in Row 4 (index 4), Col 1 (index 1)
  const x = 1 * CARD_WIDTH; // 208
  const y = 4 * CARD_HEIGHT; // 1276

  return (
    <div
      onClick={onClick}
      className={`
        relative select-none transition-all duration-200
        bg-white shadow-lg border border-zinc-400/60
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
        ${glow ? 'ring-3 ring-amber-400 shadow-amber-400/40 animate-pulse' : ''}
        ${className}
      `}
    >
      <svg
        viewBox={`${x} ${y} ${CARD_WIDTH} ${CARD_HEIGHT}`}
        className="w-full h-full rounded-[inherit] block pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <image
          href={DECK_SPRITE_URL}
          x="0"
          y="0"
          width="2496"
          height="1595"
        />
      </svg>

      {count !== undefined && (
        <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-zinc-950/90 border border-amber-400/60 text-amber-300 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap z-20">
          {count}
        </div>
      )}
    </div>
  );
};
