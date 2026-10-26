import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Users, Bot, BookOpen, AlertCircle, PlayCircle, Trophy, ShieldCheck } from 'lucide-react';
import { GameState, ServerMessage, ClientMessage, Config } from './types/game';
import { LobbyView } from './components/LobbyView';
import { GameTableView } from './components/GameTableView';
import { RulesModal } from './components/RulesModal';
import { RoundEndModal } from './components/RoundEndModal';
import { soundManager } from './utils/sound';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Form states on Home screen
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('chin_player_name') || 'Jugador';
    } catch {
      return 'Jugador';
    }
  });

  const [joinCode, setJoinCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || '';
    }
    return '';
  });

  const wsRef = useRef<WebSocket | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      showToast('Sin conexión con el servidor. Reconectando...');
    }
  }, [showToast]);

  // Connect WebSocket
  useEffect(() => {
    let ws: WebSocket;
    let isUnmounted = false;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      const wsUrl = `${protocol}${window.location.host}`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) return;
        setConnected(true);
        // Attempt resume if saved
        try {
          const saved = localStorage.getItem('chin_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.code && parsed.token) {
              send({ t: 'resume', code: parsed.code, token: parsed.token });
            }
          }
        } catch {
          // Ignore
        }
      };

      ws.onclose = () => {
        if (isUnmounted) return;
        setConnected(false);
        setTimeout(connect, 1800);
      };

      ws.onerror = () => {
        // Will trigger onclose
      };

      ws.onmessage = (event) => {
        if (isUnmounted) return;
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          if (msg.t === 'joined') {
            try {
              localStorage.setItem('chin_session', JSON.stringify({ code: msg.code, token: msg.token }));
            } catch {
              // Ignore
            }
          } else if (msg.t === 'err') {
            showToast(msg.m);
            soundManager.playError();
            if (msg.fatal) {
              try {
                localStorage.removeItem('chin_session');
              } catch {
                // Ignore
              }
              setGameState(null);
            }
          } else if (msg.t === 'state') {
            setGameState(msg);
          }
        } catch {
          // Ignore
        }
      };
    }

    connect();

    return () => {
      isUnmounted = true;
      if (ws) ws.close();
    };
  }, [send, showToast]);

  // Save player name
  const handleNameChange = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem('chin_player_name', name);
    } catch {
      // Ignore
    }
  };

  // Actions
  const handleCreateRoom = () => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      showToast('Por favor introduce tu nombre');
      return;
    }
    send({ t: 'create', name: trimmed });
  };

  // Quick solo practice against bots in 1 click
  const handlePlayBots = () => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      showToast('Por favor introduce tu nombre');
      return;
    }
    send({ t: 'create', name: trimmed });
    // After joining, add 2 bots and start
    setTimeout(() => {
      send({ t: 'add_bot', name: 'Bot Paco' });
      send({ t: 'add_bot', name: 'Bot Lucía' });
      setTimeout(() => {
        send({ t: 'start' });
      }, 300);
    }, 300);
  };

  const handleJoinRoom = () => {
    const trimmed = playerName.trim();
    const code = joinCode.trim().toUpperCase();
    if (!trimmed) {
      showToast('Por favor introduce tu nombre');
      return;
    }
    if (!code) {
      showToast('Por favor introduce el código de la partida');
      return;
    }
    send({ t: 'join', name: trimmed, code });
  };

  const handleLeave = () => {
    send({ t: 'leave' });
    try {
      localStorage.removeItem('chin_session');
    } catch {
      // Ignore
    }
    setGameState(null);
  };

  const handleStartGame = () => {
    send({ t: 'start' });
  };

  const handleUpdateConfig = (cfg: Partial<Config>) => {
    send({ t: 'cfg', ...cfg });
  };

  const handleAddBot = () => {
    send({ t: 'add_bot' });
  };

  const handleRemoveBot = (id: string) => {
    send({ t: 'remove_bot', id });
  };

  const handleDraw = (from: 'deck' | 'discard') => {
    send({ t: 'draw', from });
  };

  const handleDiscard = (id: number) => {
    send({ t: 'discard', id });
  };

  const handleClose = (id: number) => {
    send({ t: 'close', id });
  };

  const handleNextRound = () => {
    send({ t: 'next' });
  };

  const handlePlayAgain = () => {
    send({ t: 'again' });
  };

  return (
    <div className="min-h-screen felt-table flex flex-col justify-between text-zinc-100 p-2 sm:p-4 select-none">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-red-400/50 animate-in fade-in duration-200 max-w-[90vw]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Connection indicator */}
      <div className="fixed bottom-3 right-3 z-40 flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 py-1 rounded-full text-[11px] backdrop-blur-xs">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-zinc-300">{connected ? 'Conectado' : 'Reconectando...'}</span>
      </div>

      {/* Main Screen Router */}
      {!gameState || gameState.phase === 'lobby' ? (
        !gameState ? (
          /* HOME SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-8 space-y-6 animate-in fade-in duration-300">
            {/* Title & Brand */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-400/30 rounded-full text-xs font-semibold text-amber-300 mb-1">
                <span>Baraja Española Tradicional</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-serif font-black italic tracking-tight text-amber-400 drop-shadow-md">
                Chinchón
              </h1>
              <p className="text-sm text-zinc-300 max-w-xs mx-auto">
                Partidas multijugador privadas con código o partidas rápidas con Inteligencia Artificial.
              </p>
            </div>

            {/* Suit icons decorative strip */}
            <div className="flex items-center justify-center gap-4 text-2xl py-1 opacity-90">
              <span title="Oros">🪙</span>
              <span title="Copas">🍷</span>
              <span title="Espadas">⚔️</span>
              <span title="Bastos">🪵</span>
            </div>

            {/* Main Action Box */}
            <div className="bg-[#123824]/90 border border-amber-500/40 rounded-3xl p-6 shadow-2xl backdrop-blur-md w-full space-y-4">
              {/* Player Name Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1.5">
                  Tu nombre o apodo
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej. Ana, Carlos, Bea"
                  className="w-full bg-black/40 border border-amber-500/40 rounded-xl px-4 py-3 text-amber-100 placeholder-zinc-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 font-semibold"
                />
              </div>

              {/* Create Room Button */}
              <button
                onClick={handleCreateRoom}
                className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 active:scale-98 text-zinc-950 font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" /> Crear partida multijugador
              </button>

              {/* Quick Play with Bots */}
              <button
                onClick={handlePlayBots}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
              >
                <Bot className="w-4 h-4" /> Partida rápida contra Bots (IA)
              </button>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-white/10" />
                <span className="shrink mx-3 text-xs text-zinc-400 uppercase font-semibold">o únete con código</span>
                <div className="grow border-t border-white/10" />
              </div>

              {/* Join Room Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="w-32 bg-black/40 border border-amber-500/40 rounded-xl px-3 py-2.5 text-amber-300 placeholder-zinc-500 text-sm font-mono font-bold tracking-widest text-center uppercase focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={handleJoinRoom}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 active:scale-98 text-white font-bold rounded-xl text-xs sm:text-sm transition-all border border-white/20 cursor-pointer"
                >
                  Unirse a partida
                </button>
              </div>

              {/* Rules link */}
              <button
                onClick={() => setRulesOpen(true)}
                className="w-full py-2 text-xs text-amber-300 hover:text-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <BookOpen className="w-4 h-4" /> Ver reglas e instrucciones
              </button>
            </div>
          </div>
        ) : (
          /* LOBBY SCREEN */
          <div className="flex-1 flex flex-col justify-center py-4">
            <LobbyView
              state={gameState}
              onStartGame={handleStartGame}
              onUpdateConfig={handleUpdateConfig}
              onAddBot={handleAddBot}
              onRemoveBot={handleRemoveBot}
              onLeave={handleLeave}
              onOpenRules={() => setRulesOpen(true)}
            />
          </div>
        )
      ) : (
        /* GAMEPLAY SCREEN */
        <GameTableView
          state={gameState}
          onDraw={handleDraw}
          onDiscard={handleDiscard}
          onClose={handleClose}
          onLeave={handleLeave}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}

      {/* Round End / Game Over Overlay */}
      {gameState && (gameState.phase === 'roundEnd' || gameState.phase === 'over') && (
        <RoundEndModal
          state={gameState}
          onNextRound={handleNextRound}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
