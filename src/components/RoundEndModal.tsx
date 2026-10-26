import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Flame, Play, RotateCcw, AlertTriangle } from 'lucide-react';
import { GameState } from '../types/game';
import { CardView } from './CardView';
import { soundManager } from '../utils/sound';

interface RoundEndModalProps {
  state: GameState;
  onNextRound: () => void;
  onPlayAgain: () => void;
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({ state, onNextRound, onPlayAgain }) => {
  const isOver = state.phase === 'over';
  const isHost = state.host === state.you;
  const res = state.res;

  useEffect(() => {
    if (res?.chin || isOver) {
      soundManager.playChinchon();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#eab308', '#ef4444', '#3b82f6', '#22c55e', '#ffffff'],
        });
      } catch {
        // Ignore
      }
    } else {
      soundManager.playClose();
    }
  }, [res, isOver]);

  if (!res) return null;

  const winner = state.pl.find(p => p.id === state.win);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#123824] border-2 border-amber-500 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl text-amber-50 overflow-hidden">
        {/* Header banner */}
        <div className={`p-4 sm:p-5 text-center border-b border-amber-500/30 ${isOver ? 'bg-amber-500/20' : 'bg-black/30'}`}>
          {isOver ? (
            <div>
              <div className="inline-flex p-3 bg-amber-400/20 rounded-full mb-2">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-amber-300">
                ¡Fin de la Partida!
              </h2>
              <p className="text-base text-amber-200 font-semibold mt-1">
                Ganador: <span className="text-white text-lg font-bold">{winner ? winner.name : 'Victoria'}</span> 🏆
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-amber-300">
                Fin de la Ronda {state.round}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                {res.chin ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/40 text-red-200 border border-red-500/50 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                    <Flame className="w-4 h-4 text-red-400" /> ¡Chinchón de {res.closer}!
                  </span>
                ) : (
                  <span className="text-amber-200/90 text-sm">
                    <strong>{res.closer}</strong> ha cerrado la ronda
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Players round breakdown */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[55vh]">
          {res.rows.map(row => {
            const isMe = row.id === state.you;
            const isCloser = row.name === res.closer;

            return (
              <div
                key={row.id}
                className={`
                  p-3.5 rounded-xl border transition-all
                  ${isCloser ? 'bg-amber-950/40 border-amber-500/60 shadow-md' : 'bg-black/30 border-white/10'}
                  ${row.out ? 'opacity-70' : ''}
                `}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">
                      {row.name} {isMe && <span className="text-xs text-amber-400 font-normal">(Tú)</span>}
                    </span>
                    {isCloser && (
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-amber-500/40">
                        Cierra
                      </span>
                    )}
                    {row.out && (
                      <span className="bg-red-500/20 text-red-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-red-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Eliminado
                      </span>
                    )}
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-zinc-400">Sueltos: </span>
                    <strong className="text-amber-300 font-mono text-sm">{row.pts} pts</strong>
                    <span className="mx-1.5 text-zinc-600">→</span>
                    <span className="font-bold">
                      {row.add > 0 ? `+${row.add}` : row.add}
                    </span>
                    <span className="mx-1.5 text-zinc-600">|</span>
                    <span className="text-zinc-400">Total: </span>
                    <strong className="text-white font-mono text-sm">{row.total} pts</strong>
                  </div>
                </div>

                {/* Melds and unmelded cards */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Melds */}
                  {row.g.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="inline-flex items-center p-1 bg-amber-500/15 border border-amber-400/50 rounded-lg gap-1 shadow-xs"
                      title={group.length >= 7 ? '¡Chinchón!' : 'Combinación ligada'}
                    >
                      {group.map(cId => (
                        <CardView key={cId} id={cId} size="mini" />
                      ))}
                    </div>
                  ))}

                  {/* Unmelded */}
                  {row.u.length > 0 && (
                    <div
                      className="inline-flex items-center p-1 bg-black/40 border border-white/20 rounded-lg gap-1"
                      title="Cartas sueltas (suman puntos)"
                    >
                      {row.u.map(cId => (
                        <CardView key={cId} id={cId} size="mini" />
                      ))}
                    </div>
                  )}

                  {row.g.length === 0 && row.u.length === 0 && (
                    <span className="text-xs text-zinc-400 italic">Sin cartas visibles</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-black/40 border-t border-amber-500/30 flex items-center justify-between">
          <div className="text-xs text-amber-200/80">
            {isHost ? 'Como creador, puedes continuar la partida' : 'Esperando al anfitrión para continuar...'}
          </div>

          <div>
            {isHost ? (
              isOver ? (
                <button
                  onClick={onPlayAgain}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Jugar otra vez
                </button>
              ) : (
                <button
                  onClick={onNextRound}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" /> Siguiente ronda
                </button>
              )
            ) : (
              <div className="flex items-center gap-2 text-amber-300 font-medium text-xs">
                <span className="animate-pulse">●</span> En espera
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
