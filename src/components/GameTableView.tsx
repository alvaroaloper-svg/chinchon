import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, BookOpen, LogOut, ArrowUpDown, Clock, Sparkles, CheckCircle2, ArrowDownCircle, Bell } from 'lucide-react';
import { GameState } from '../types/game';
import { CardView, CardBack } from './CardView';
import { soundManager } from '../utils/sound';
import { sortCards, best } from '../game/chinchon';

interface GameTableViewProps {
  state: GameState;
  onDraw: (from: 'deck' | 'discard') => void;
  onDiscard: (id: number) => void;
  onClose: (id: number) => void;
  onLeave: () => void;
  onOpenRules: () => void;
}

export const GameTableView: React.FC<GameTableViewProps> = ({
  state,
  onDraw,
  onDiscard,
  onClose,
  onLeave,
  onOpenRules,
}) => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<'suit' | 'rank'>('suit');
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const isMyTurn = state.turn === state.you;
  const hasDrawn = state.dr !== null;
  const me = state.pl.find(p => p.id === state.you);
  const isMeOut = me ? me.out : false;

  const prevHasDrawnRef = useRef<boolean>(false);

  // Sound toggle
  const toggleSound = () => {
    const next = soundManager.toggle();
    setSoundOn(next);
  };

  // Timer countdown
  useEffect(() => {
    if (!state.dl || state.phase !== 'play') {
      setTimeLeft(null);
      return;
    }
    const updateTimer = () => {
      const remaining = Math.max(0, Math.round((state.dl - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [state.dl, state.phase]);

  // Turn alert sound (start of turn)
  useEffect(() => {
    if (isMyTurn && !hasDrawn && state.phase === 'play') {
      soundManager.playYourTurn();
    }
  }, [isMyTurn, hasDrawn, state.phase]);

  // SPECIFIC ALERT: When it's your turn to leave a card on the pile ("te toca dejar una carta en el montón")
  useEffect(() => {
    if (isMyTurn && hasDrawn && !prevHasDrawnRef.current && state.phase === 'play') {
      soundManager.playMustDiscardAlert();
    }
    prevHasDrawnRef.current = isMyTurn && hasDrawn;
  }, [isMyTurn, hasDrawn, state.phase]);

  // Reset selected card if it's no longer in hand
  useEffect(() => {
    if (selectedCard !== null && !state.hand.includes(selectedCard)) {
      setSelectedCard(null);
    }
  }, [state.hand, selectedCard]);

  // Sort hand cards
  const sortedHand = sortCards(state.hand, sortMode);

  // Analyze current hand deadwood and combinations
  const handAnalysis = best(state.hand);

  // Can the selected card close?
  const canCloseWithSelected = selectedCard !== null && state.cl.includes(selectedCard);

  // Cannot discard the card just drawn from discard
  const isSelectedNonDiscardable = selectedCard !== null && state.dr !== null && selectedCard === state.dr;

  const handleCardClick = (id: number) => {
    soundManager.playSelect();
    setSelectedCard(prev => (prev === id ? null : id));
  };

  const handleDrawDeck = () => {
    if (isMyTurn && !hasDrawn) {
      soundManager.playCardDraw();
      onDraw('deck');
    }
  };

  const handleDrawDiscard = () => {
    if (isMyTurn && !hasDrawn && state.top !== null) {
      soundManager.playCardDraw();
      onDraw('discard');
    }
  };

  const handleDiscard = () => {
    if (isMyTurn && hasDrawn && selectedCard !== null) {
      soundManager.playCardDiscard();
      onDiscard(selectedCard);
      setSelectedCard(null);
    }
  };

  const handleClose = () => {
    if (isMyTurn && hasDrawn && selectedCard !== null && canCloseWithSelected) {
      soundManager.playClose();
      onClose(selectedCard);
      setSelectedCard(null);
    }
  };

  const activePlayer = state.pl.find(p => p.id === state.turn);

  return (
    <div className="w-full flex-1 flex flex-col justify-between max-w-5xl mx-auto px-2 sm:px-4 py-2 select-none animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between bg-black/45 border border-amber-500/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-amber-50 backdrop-blur-xs shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-serif font-black text-amber-300 tracking-wide text-sm sm:text-base">
            Chinchón
          </span>
          <span className="text-zinc-500">|</span>
          <span className="bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded text-[11px] sm:text-xs">
            Sala {state.code}
          </span>
          <span className="text-zinc-300 hidden sm:inline">Ronda {state.round}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-xs ${timeLeft <= 5 ? 'bg-red-500/40 text-red-200 animate-pulse' : 'bg-black/50 text-amber-300'}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft}s</span>
            </div>
          )}

          <button
            onClick={toggleSound}
            title={soundOn ? 'Silenciar sonidos' : 'Activar sonidos'}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 transition-colors cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
          </button>

          <button
            onClick={onOpenRules}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 transition-colors flex items-center gap-1 text-xs cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Reglas</span>
          </button>

          <button
            onClick={onLeave}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-200 transition-colors flex items-center gap-1 text-xs border border-red-500/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Opponents Section */}
      <section className="py-1 sm:py-2">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          {state.pl
            .filter(p => p.id !== state.you)
            .map(p => {
              const isTurn = p.id === state.turn;
              return (
                <div
                  key={p.id}
                  className={`
                    px-3 py-1.5 sm:py-2 rounded-xl text-center min-w-[105px] sm:min-w-[130px] transition-all
                    ${isTurn ? 'bg-amber-950/70 border-2 border-amber-400 shadow-lg shadow-amber-500/20 scale-105' : 'bg-black/40 border border-white/10'}
                    ${p.out ? 'opacity-40 line-through' : ''}
                    ${!p.on ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[100px]">
                      {p.name}
                    </span>
                    {p.isBot && <span className="text-[10px] text-cyan-400 font-bold">IA</span>}
                  </div>

                  <div className="text-[11px] text-zinc-300 mt-0.5">
                    <span className="text-amber-300 font-mono font-bold">{p.score} pts</span>
                    <span className="mx-1 text-zinc-600">·</span>
                    <span>{p.n} cartas</span>
                  </div>

                  {isTurn && (
                    <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-0.5 animate-pulse">
                      Jugando...
                    </div>
                  )}
                  {p.out && <div className="text-[10px] text-red-400 font-bold">Eliminado</div>}
                  {!p.on && !p.out && <div className="text-[10px] text-zinc-400">Desconectado</div>}
                </div>
              );
            })}
        </div>
      </section>

      {/* Table Center (Deck and Discard) */}
      <section className="flex flex-col items-center justify-center my-auto py-2">
        {/* Turn prompt message and ALERT FOR DISCARDING */}
        <div className="text-center min-h-[44px] flex items-center justify-center mb-2 px-2">
          {isMeOut ? (
            <span className="text-red-400 text-xs sm:text-sm font-semibold bg-red-950/60 px-4 py-1.5 rounded-full border border-red-500/30">
              Has sido eliminado de la partida
            </span>
          ) : isMyTurn ? (
            !hasDrawn ? (
              <span className="text-amber-300 text-xs sm:text-sm font-bold bg-amber-950/80 px-4 py-1.5 rounded-full border border-amber-400/80 shadow-lg shadow-amber-500/20 animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Tu turno: Roba una carta del mazo o del montón de descarte
              </span>
            ) : (
              /* AVISO IMPORTANTE: Te toca dejar una carta en el montón */
              <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-zinc-950 px-4 sm:px-6 py-2 rounded-2xl shadow-xl border-2 border-white flex items-center gap-2.5 animate-bounce">
                <Bell className="w-5 h-5 text-zinc-950 shrink-0 fill-current animate-spin" style={{ animationDuration: '3s' }} />
                <div className="text-left leading-tight">
                  <div className="font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <span>¡Te toca dejar una carta en el montón!</span>
                  </div>
                  <div className="text-[11px] font-semibold opacity-90">
                    {selectedCard === null
                      ? 'Selecciona la carta que quieres soltar en tu mano'
                      : canCloseWithSelected
                      ? '¡Carta seleccionada! Puedes dejarla o cerrar la ronda'
                      : '¡Carta seleccionada! Pulsa el botón "Dejar en el montón"'}
                  </div>
                </div>
              </div>
            )
          ) : (
            <span className="text-zinc-300/80 text-xs sm:text-sm italic">
              Turno de {activePlayer ? activePlayer.name : 'jugador'}...
            </span>
          )}
        </div>

        {/* Center Felt Mat with Cards */}
        <div className="relative bg-[#0d3824]/90 border-2 border-amber-500/40 rounded-3xl p-3 sm:p-5 shadow-2xl flex items-center justify-center gap-6 sm:gap-14 backdrop-blur-xs">
          {/* Deck (Mazo) */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
              Mazo ({state.deck})
            </div>
            <div
              className={`relative ${isMyTurn && !hasDrawn ? 'hover:scale-105 active:scale-95 cursor-pointer ring-3 ring-amber-400 rounded-xl shadow-xl shadow-amber-400/30' : 'cursor-default opacity-85'}`}
              onClick={handleDrawDeck}
              title={isMyTurn && !hasDrawn ? 'Robar carta del mazo' : ''}
            >
              <CardBack size="lg" count={state.deck} glow={isMyTurn && !hasDrawn} />
            </div>
          </div>

          {/* Discard Pile (El montón / Pozo de descarte) */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
              {isMyTurn && hasDrawn && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              )}
              <span>El montón ({state.top !== null ? '1' : '0'})</span>
            </div>
            {state.top !== null ? (
              <div
                className={`relative ${isMyTurn && !hasDrawn ? 'hover:scale-105 active:scale-95 cursor-pointer ring-3 ring-amber-400 rounded-xl shadow-xl shadow-amber-400/30' : ''} ${isMyTurn && hasDrawn ? 'ring-2 ring-dashed ring-amber-400/80 rounded-xl' : 'cursor-default'}`}
                onClick={isMyTurn && !hasDrawn ? handleDrawDiscard : undefined}
                title={isMyTurn && !hasDrawn ? 'Robar carta del montón' : isMyTurn && hasDrawn ? 'Aquí se dejará tu carta descartada' : ''}
              >
                <CardView id={state.top} size="lg" />
                {isMyTurn && hasDrawn && (
                  <div className="absolute inset-0 bg-amber-500/10 rounded-xl border border-amber-400/60 pointer-events-none flex items-center justify-center">
                    <span className="bg-black/75 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full shadow border border-amber-400/50">
                      Montón
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-20 h-31 sm:w-24 sm:h-37 md:w-28 md:h-43 rounded-xl border-2 border-dashed border-amber-400/30 flex items-center justify-center text-xs text-amber-300/40 font-serif">
                Vacío
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Action Buttons for Play */}
      <section className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-1.5">
        <button
          onClick={handleDiscard}
          disabled={!isMyTurn || !hasDrawn || selectedCard === null || isSelectedNonDiscardable}
          className={`
            px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2
            ${
              isMyTurn && hasDrawn && selectedCard !== null && !isSelectedNonDiscardable
                ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 active:scale-95 cursor-pointer shadow-amber-400/30 ring-3 ring-amber-200'
                : isMyTurn && hasDrawn
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50 cursor-pointer animate-pulse'
                : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50'
            }
          `}
        >
          <ArrowDownCircle className="w-4 h-4 shrink-0" />
          <span>Dejar en el montón</span>
        </button>

        <button
          onClick={handleClose}
          disabled={!isMyTurn || !hasDrawn || selectedCard === null || !canCloseWithSelected}
          className={`
            px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2
            ${
              isMyTurn && hasDrawn && selectedCard !== null && canCloseWithSelected
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white active:scale-95 cursor-pointer shadow-emerald-500/40 ring-3 ring-emerald-300 animate-bounce'
                : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50'
            }
          `}
          title={
            !canCloseWithSelected && selectedCard !== null
              ? 'Las cartas sueltas tras descartar superan el límite de cierre'
              : ''
          }
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Cerrar ronda</span>
        </button>
      </section>

      {/* Player Hand Section */}
      <footer className={`bg-black/55 border rounded-2xl p-2 sm:p-3.5 backdrop-blur-md shadow-2xl transition-all ${isMyTurn && hasDrawn ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-amber-500/30'}`}>
        {/* Hand Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-white/10 text-xs text-amber-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              {me ? me.name : 'Tú'}
            </span>
            <span className="bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded text-[11px] font-bold">
              {me ? me.score : 0} puntos
            </span>

            {isMyTurn && hasDrawn && (
              <span className="bg-amber-500 text-zinc-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full shadow animate-pulse">
                Elige carta a dejar
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] text-zinc-300 hidden sm:inline">
              Sueltos actuales: <strong className="text-amber-300 font-mono">{handAnalysis.p} pts</strong>
              {state.cfg.closeMax > 0 && <span> (cierre ≤ {state.cfg.closeMax})</span>}
            </div>

            <button
              onClick={() => setSortMode(prev => (prev === 'suit' ? 'rank' : 'suit'))}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 active:scale-95 rounded-lg text-amber-200 transition-all flex items-center gap-1 text-[11px] cursor-pointer border border-white/10"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>Ordenar por {sortMode === 'suit' ? 'Palo' : 'Número'}</span>
            </button>
          </div>
        </div>

        {/* Hand Cards */}
        <div className="flex items-end justify-center gap-1 sm:gap-2.5 overflow-x-auto py-3 px-1 min-h-[110px] sm:min-h-[145px]">
          {sortedHand.map(cardId => {
            const isSel = selectedCard === cardId;
            const canClose = state.cl.includes(cardId);
            const isJustDrawnFromDiscard = state.dr !== null && cardId === state.dr;

            return (
              <CardView
                key={cardId}
                id={cardId}
                isSelected={isSel}
                canClose={canClose}
                disabled={isJustDrawnFromDiscard}
                size="md"
                onClick={() => handleCardClick(cardId)}
                badge={isJustDrawnFromDiscard ? 'No descartable' : undefined}
              />
            );
          })}
        </div>

        {/* Hand Meld Summary Indicator */}
        <div className="mt-1 text-center text-[11px] text-zinc-300 flex flex-wrap items-center justify-center gap-2">
          {handAnalysis.g.length > 0 ? (
            <span className="text-amber-300 font-medium">
              Ligadas: {handAnalysis.g.length} combinación(es) · {handAnalysis.p} puntos sueltos
            </span>
          ) : (
            <span className="text-zinc-400">Sin combinaciones ligadas todavía ({handAnalysis.p} pts sueltos)</span>
          )}
        </div>
      </footer>

      {/* Mini Game Log ticker */}
      {state.log.length > 0 && (
        <div className="mt-1 text-center text-[11px] text-zinc-400 truncate opacity-80">
          {state.log[state.log.length - 1]}
        </div>
      )}
    </div>
  );
};
