import React, { useState } from 'react';
import { Copy, Check, Users, Bot, UserPlus, Play, LogOut, BookOpen, Settings, ShieldAlert } from 'lucide-react';
import { GameState, Config } from '../types/game';

interface LobbyViewProps {
  state: GameState;
  onStartGame: () => void;
  onUpdateConfig: (cfg: Partial<Config>) => void;
  onAddBot: () => void;
  onRemoveBot: (id: string) => void;
  onLeave: () => void;
  onOpenRules: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  state,
  onStartGame,
  onUpdateConfig,
  onAddBot,
  onRemoveBot,
  onLeave,
  onOpenRules,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = state.host === state.you;
  const connectedCount = state.pl.filter(p => p.on).length;
  const canStart = isHost && connectedCount >= 2;
  const canAddBot = isHost && state.pl.length < 4;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', state.code);
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5 animate-in fade-in duration-300">
      {/* Room code card */}
      <div className="bg-[#123824]/90 border border-amber-500/40 rounded-2xl p-5 shadow-xl backdrop-blur-xs text-amber-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-1">
              Código de la partida
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-amber-300 drop-shadow-sm">
              {state.code}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? '¡Copiado!' : 'Copiar código'}
            </button>
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/20"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Users className="w-4 h-4" />}
              {copiedLink ? '¡Enlace copiado!' : 'Copiar enlace'}
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-zinc-300 flex items-center justify-between border-t border-white/10 pt-3">
          <span>Comparte el código con amigos para jugar online.</span>
          <span className="font-semibold text-amber-300">Plazas: {state.pl.length}/4</span>
        </div>
      </div>

      {/* Players List Card */}
      <div className="bg-[#123824]/90 border border-amber-500/40 rounded-2xl p-5 shadow-xl backdrop-blur-xs text-amber-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-lg text-amber-300">Jugadores en la Mesa</h3>
          </div>

          {canAddBot && (
            <button
              onClick={onAddBot}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> + Añadir Bot (IA)
            </button>
          )}
        </div>

        <div className="divide-y divide-white/10">
          {state.pl.map(p => {
            const isMe = p.id === state.you;
            const isPlayerHost = p.id === state.host;

            return (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      p.isBot ? 'bg-cyan-900 text-cyan-200 border border-cyan-500/40' : 'bg-amber-900/60 text-amber-200 border border-amber-500/40'
                    }`}
                  >
                    {p.isBot ? <Bot className="w-4 h-4" /> : p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-white">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                      {isPlayerHost && <span className="text-amber-400 font-medium">Creador</span>}
                      {isPlayerHost && (isMe || p.isBot) && <span>•</span>}
                      {isMe && <span className="text-emerald-400 font-medium">Tú</span>}
                      {p.isBot && <span className="text-cyan-400">Bot IA</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.on ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {p.on ? 'Conectado' : 'Desconectado'}
                  </span>

                  {isHost && p.isBot && (
                    <button
                      onClick={() => onRemoveBot(p.id)}
                      className="text-xs text-red-400 hover:text-red-300 hover:underline px-1 cursor-pointer"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {connectedCount < 2 && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              Hacen falta <strong>al menos 2 jugadores</strong> para comenzar la partida.
              {isHost && (
                <span> Puedes pulsar <strong>"+ Añadir Bot (IA)"</strong> para jugar ahora mismo en solitario, o compartir el enlace con un amigo.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Game Rules Config Card */}
      <div className="bg-[#123824]/90 border border-amber-500/40 rounded-2xl p-5 shadow-xl backdrop-blur-xs text-amber-50">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-5 h-5 text-amber-400" />
          <h3 className="font-serif font-bold text-lg text-amber-300">Reglas de la Partida</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Points limit */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">
              Eliminación al superar
            </label>
            <select
              value={state.cfg.limit}
              disabled={!isHost}
              onChange={e => onUpdateConfig({ limit: Number(e.target.value) })}
              className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-amber-200 disabled:opacity-50"
            >
              <option value={50}>50 puntos (Partida rápida)</option>
              <option value={70}>70 puntos (Estándar)</option>
              <option value={100}>100 puntos (Clásico largo)</option>
            </select>
          </div>

          {/* Close max */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">
              Cierre con hasta
            </label>
            <select
              value={state.cfg.closeMax}
              disabled={!isHost}
              onChange={e => onUpdateConfig({ closeMax: Number(e.target.value) })}
              className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-amber-200 disabled:opacity-50"
            >
              <option value={0}>0 puntos (Solo mano completa)</option>
              <option value={1}>1 punto suelto</option>
              <option value={2}>2 puntos sueltos</option>
              <option value={3}>3 puntos sueltos</option>
              <option value={4}>4 puntos sueltos</option>
              <option value={5}>5 puntos sueltos (Regla estándar)</option>
            </select>
          </div>

          {/* Chinchon rule */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">
              Escalera de 7 (Chinchón)
            </label>
            <select
              value={state.cfg.chin}
              disabled={!isHost}
              onChange={e => onUpdateConfig({ chin: e.target.value as 'win' | 'plus50' })}
              className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-amber-200 disabled:opacity-50"
            >
              <option value="win">Gana la partida directamente</option>
              <option value="plus50">+50 puntos a los rivales</option>
            </select>
          </div>

          {/* Timer */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">
              Temporizador por turno
            </label>
            <select
              value={state.cfg.timer}
              disabled={!isHost}
              onChange={e => onUpdateConfig({ timer: Number(e.target.value) })}
              className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-amber-200 disabled:opacity-50"
            >
              <option value={0}>Sin límite de tiempo</option>
              <option value={30}>30 segundos</option>
              <option value={60}>60 segundos</option>
            </select>
          </div>

          {/* Bonus check */}
          <div className="sm:col-span-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={state.cfg.bonus}
                disabled={!isHost}
                onChange={e => onUpdateConfig({ bonus: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-black/40 border-white/20 cursor-pointer"
              />
              <span className="text-zinc-200">
                <strong>Bonificación −10 puntos</strong> al cerrar con todas las cartas ligadas (0 puntos sueltos)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRules}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" /> Reglas del juego
          </button>
          <button
            onClick={onLeave}
            className="px-4 py-2.5 bg-red-950/40 hover:bg-red-900/50 active:scale-95 text-red-200 font-medium rounded-xl text-xs transition-all flex items-center gap-1.5 border border-red-500/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Salir de la sala
          </button>
        </div>

        {isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className={`
              px-6 py-3 font-bold rounded-xl text-sm transition-all shadow-xl flex items-center gap-2
              ${
                canStart
                  ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 active:scale-95 cursor-pointer shadow-amber-500/20'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-60'
              }
            `}
          >
            <Play className="w-4 h-4 fill-current" /> Empezar partida
          </button>
        )}
      </div>
    </div>
  );
};
