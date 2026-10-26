import React from 'react';
import { X, BookOpen, Trophy, Sparkles, AlertCircle, Flame } from 'lucide-react';
import { CardView } from './CardView';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#123824] border-2 border-amber-500/60 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-amber-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/30 bg-black/30">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-serif font-bold text-amber-300">Reglas del Chinchón</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-200">
          {/* Overview */}
          <div className="bg-black/25 rounded-xl p-4 border border-amber-400/20">
            <h3 className="font-serif font-bold text-base text-amber-300 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> La Baraja y Objetivo
            </h3>
            <p className="leading-relaxed">
              Se juega con la <strong>baraja española de 40 cartas</strong> (sin 8 ni 9). Cada jugador recibe <strong>7 cartas</strong>.
              El objetivo es ligar combinaciones para reducir los puntos de cartas sueltas (no ligadas) a 5 o menos, y cerrar la ronda antes que tus rivales.
            </p>
          </div>

          {/* Cards & Points */}
          <div>
            <h3 className="font-serif font-bold text-base text-amber-300 mb-2">Valor de las Cartas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-black/20 p-2.5 rounded-lg border border-white/10 text-center">
                <div className="text-amber-400 font-bold">As (1)</div>
                <div className="text-xs text-zinc-300">1 punto</div>
              </div>
              <div className="bg-black/20 p-2.5 rounded-lg border border-white/10 text-center">
                <div className="text-amber-400 font-bold">Del 2 al 7</div>
                <div className="text-xs text-zinc-300">Su valor nominal</div>
              </div>
              <div className="bg-black/20 p-2.5 rounded-lg border border-white/10 text-center">
                <div className="text-amber-400 font-bold">Sota (10)</div>
                <div className="text-xs text-zinc-300">10 puntos</div>
              </div>
              <div className="bg-black/20 p-2.5 rounded-lg border border-white/10 text-center">
                <div className="text-amber-400 font-bold">Caballo / Rey</div>
                <div className="text-xs text-zinc-300">10 puntos c/u</div>
              </div>
            </div>
          </div>

          {/* Combinations */}
          <div>
            <h3 className="font-serif font-bold text-base text-amber-300 mb-2">Combinaciones Válidas</h3>
            <div className="space-y-3">
              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <div className="font-semibold text-amber-200">1. Escaleras (Mismo Palo)</div>
                <p className="text-xs text-zinc-300 mt-1">
                  Tres o más cartas consecutivas del mismo palo. Orden: <strong>1, 2, 3, 4, 5, 6, 7, Sota, Caballo, Rey</strong>.
                  (El 7 enlaza directamente con la Sota).
                </p>
              </div>

              <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                <div className="font-semibold text-amber-200">2. Tríos o Cuartetos (Mismo Valor)</div>
                <p className="text-xs text-zinc-300 mt-1">
                  Tres o cuatro cartas del mismo índice de diferentes palos (por ejemplo, tres Reyes o cuatro Cincos).
                </p>
              </div>

              <div className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 p-3.5 rounded-lg border border-amber-500/40">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" /> ¡Chinchón!
                </div>
                <p className="text-xs text-amber-100 mt-1">
                  Una escalera completa de <strong>7 cartas del mismo palo</strong> (por ejemplo: 1-2-3-4-5-6-7 de Copas).
                  ¡Gana la partida directamente o suma +50 puntos a todos los contrincantes según la configuración elegida!
                </p>
              </div>
            </div>
          </div>

          {/* Turn Flow */}
          <div>
            <h3 className="font-serif font-bold text-base text-amber-300 mb-2">Desarrollo del Turno</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-300 bg-black/20 p-3.5 rounded-lg border border-white/10">
              <li><strong>Robar:</strong> Coge una carta del mazo cerrado o la carta superior visible del descarte.</li>
              <li><strong>Descartar:</strong> Quédate con 7 cartas descartando una de tu mano al pozo de descarte.</li>
              <li className="text-amber-300 font-medium"><strong>Regla especial:</strong> No puedes descartar inmediatamente en el mismo turno la carta que acabas de robar del pozo de descarte.</li>
            </ol>
          </div>

          {/* Closing & Scoring */}
          <div>
            <h3 className="font-serif font-bold text-base text-amber-300 mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Cierre de Ronda y Puntuación
            </h3>
            <div className="space-y-2 text-xs text-zinc-300 bg-black/20 p-3.5 rounded-lg border border-white/10">
              <p>
                • Puedes <strong>cerrar la ronda</strong> si, al descartar una carta, las cartas restantes que no formen combinación suman <strong>5 puntos o menos</strong> (o el límite elegido).
              </p>
              <p>
                • <strong>Bonificación de -10 puntos:</strong> Si consigues ligar las 7 cartas (0 puntos sueltos) y cierras, se te restan 10 puntos de tu marcador.
              </p>
              <p>
                • <strong>Eliminación:</strong> Cada ronda los jugadores acumulan los puntos de sus cartas sueltas. Al superar el límite (50, 70 o 100 puntos), el jugador queda <strong>eliminado</strong>. ¡Gana el último superviviente!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-amber-500/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            Entendido, ¡a jugar!
          </button>
        </div>
      </div>
    </div>
  );
};
