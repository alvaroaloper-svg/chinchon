import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);

// --- Card and Chinchón logic ---
const rk = (i: number) => i % 10;
const su = (i: number) => Math.floor(i / 10);
const pt = (i: number) => [1, 2, 3, 4, 5, 6, 7, 10, 10, 10][i % 10];

const shuffle = (a: number[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const valid = (c: number[]) => {
  if (c.length < 3) return false;
  if (c.every(x => rk(x) === rk(c[0]))) return true; // Grupo / trío / cuarteto
  if (!c.every(x => su(x) === su(c[0]))) return false; // Mismo palo
  const r = c.map(rk).sort((a, b) => a - b);
  return r.every((x, i) => !i || x === r[i - 1] + 1); // Escalera
};

function best(h: number[]): { p: number; g: number[][]; u: number[] } {
  const memo: Record<number, { p: number; g: number[][]; u: number[] }> = {};
  const f = (m: number): { p: number; g: number[][]; u: number[] } => {
    if (!m) return { p: 0, g: [], u: [] };
    if (memo[m]) return memo[m];
    const i = Math.log2(m & -m);
    const rest = m ^ (1 << i);
    const l = f(rest);
    let b: { p: number; g: number[][]; u: number[] } = {
      p: l.p + pt(h[i]),
      g: l.g,
      u: [h[i], ...l.u],
    };
    for (let s = rest; s > 0; s = (s - 1) & rest) {
      const mm = s | (1 << i);
      const c = h.filter((_, k) => (mm >> k) & 1);
      if (valid(c)) {
        const r = f(m ^ mm);
        if (r.p < b.p) {
          b = { p: r.p, g: [c, ...r.g], u: r.u };
        }
      }
    }
    return (memo[m] = b);
  };
  return f((1 << h.length) - 1);
}

interface Player {
  id: string;
  name: string;
  token: string;
  ws: WebSocket | null;
  on: boolean;
  score: number;
  out: boolean;
  isBot?: boolean;
}

interface Config {
  limit: number;
  closeMax: number;
  chin: 'win' | 'plus50';
  bonus: boolean;
  timer: number;
}

interface Room {
  code: string;
  pl: Player[];
  cfg: Config;
  phase: 'lobby' | 'play' | 'roundEnd' | 'over';
  log: string[];
  round: number;
  dealer: number;
  ti: number;
  n: number;
  last: number;
  deck: number[];
  disc: number[];
  hands: Record<string, number[]>;
  dr: { id: number; fd?: number } | null;
  res: any;
  win: string | null;
  host: string;
  dl: number;
  tm: NodeJS.Timeout | null;
}

const DEF: Config = { limit: 100, closeMax: 5, chin: 'win', bonus: true, timer: 0 };
const rooms = new Map<string, Room>();

const log = (R: Room, s: string) => R.log.push(s);
const nextAct = (R: Room, i: number) => {
  do {
    i = (i + 1) % R.pl.length;
  } while (R.pl[i].out);
  return i;
};

function send(ws: WebSocket | null, obj: any) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(obj));
  } catch (e) {
    // Ignore error
  }
}

function view(R: Room, p: Player) {
  const h = (R.hands && R.hands[p.id]) || [];
  const mine = R.phase === 'play' && R.pl[R.ti] === p;
  return {
    t: 'state',
    code: R.code,
    phase: R.phase,
    cfg: R.cfg,
    host: R.host,
    you: p.id,
    round: R.round,
    pl: R.pl.map(q => ({
      id: q.id,
      name: q.name,
      score: q.score,
      out: q.out,
      on: q.on,
      n: q.out ? 0 : (R.hands && R.hands[q.id] || []).length,
      isBot: q.isBot,
    })),
    hand: h,
    deck: R.deck ? R.deck.length : 0,
    top: R.disc && R.disc.length ? R.disc[R.disc.length - 1] : null,
    turn: R.phase === 'play' && R.pl[R.ti] ? R.pl[R.ti].id : null,
    dr: mine && R.dr ? R.dr.id : null,
    dl: R.dl,
    log: R.log.slice(-8),
    res: R.res,
    win: R.win,
    cl: mine && R.dr ? h.filter(id => !(R.dr?.fd && id === R.dr.id) && best(h.filter(x => x !== id)).p <= R.cfg.closeMax) : [],
  };
}

function bcast(R: Room) {
  R.pl.forEach(p => {
    if (p.ws) send(p.ws, view(R, p));
  });
}

function arm(R: Room) {
  if (R.tm) {
    clearTimeout(R.tm);
    R.tm = null;
  }
  R.dl = 0;
  if (R.phase !== 'play') return;
  const p = R.pl[R.ti];
  if (!p) return;

  // Bot automation
  if (p.isBot) {
    R.dl = Date.now() + 1500;
    R.tm = setTimeout(() => {
      botPlay(R, p);
    }, 900 + Math.random() * 500);
    return;
  }

  // Human timer
  let s = R.cfg.timer;
  if (!p.on) s = Math.min(s || 10, 10);
  if (!s) return;

  R.dl = Date.now() + s * 1000;
  R.tm = setTimeout(() => {
    try {
      if (R.phase !== 'play' || R.pl[R.ti] !== p) return;
      if (!R.dr) play(R, p, { t: 'draw', from: 'deck' });
      log(R, `${p.name}: tiempo agotado`);
      if (R.dr) {
        play(R, p, { t: 'discard', id: R.dr.id });
      }
      bcast(R);
    } catch (e) {
      // Ignore
    }
  }, s * 1000);
}

function startRound(R: Room) {
  R.deck = shuffle([...Array(40).keys()]);
  R.hands = {};
  R.pl.filter(p => !p.out).forEach(p => {
    R.hands[p.id] = R.deck.splice(0, 7);
  });
  R.disc = [R.deck.pop()!];
  R.dealer = nextAct(R, R.dealer);
  R.ti = nextAct(R, R.dealer);
  R.dr = null;
  R.res = null;
  R.phase = 'play';
  R.round++;
  log(R, `Ronda ${R.round}: reparte ${R.pl[R.dealer].name}`);
  arm(R);
}

function endRound(R: Room, closer: Player) {
  if (R.tm) {
    clearTimeout(R.tm);
    R.tm = null;
  }
  R.dl = 0;
  const rows = R.pl.filter(p => !p.out).map(p => {
    const hand = R.hands[p.id] || [];
    const b = best(hand);
    return {
      id: p.id,
      name: p.name,
      hand,
      g: b.g,
      u: b.u,
      pts: b.p,
      chin: b.g.length === 1 && b.g[0].length === 7,
      add: 0,
      total: 0,
      out: false,
    };
  });
  const cr = rows.find(r => r.id === closer.id);
  rows.forEach(r => {
    r.add = r.pts;
    if (cr && cr.chin && R.cfg.chin === 'plus50') {
      r.add = r === cr ? 0 : r.pts + 50;
    } else if (cr && r === cr && r.pts === 0 && R.cfg.bonus) {
      r.add = -10;
    }
    const p = R.pl.find(q => q.id === r.id);
    if (p) {
      p.score += r.add;
      if (p.score > R.cfg.limit) p.out = true;
      r.total = p.score;
      r.out = p.out;
    }
  });

  R.res = { rows, closer: closer.name, chin: cr ? cr.chin : false };
  R.dr = null;
  log(R, `${closer.name} cierra${cr && cr.chin ? ' con ¡CHINCHÓN!' : ''}`);

  const left = R.pl.filter(p => !p.out);
  if ((cr && cr.chin && R.cfg.chin === 'win') || left.length <= 1) {
    R.phase = 'over';
    R.win = (cr && cr.chin && R.cfg.chin === 'win'
      ? closer
      : (left.length ? left : R.pl).slice().sort((a, b) => a.score - b.score)[0]
    ).id;
  } else {
    R.phase = 'roundEnd';
  }
}

function play(R: Room, p: Player, m: any) {
  if (R.phase !== 'play' || R.pl[R.ti] !== p) throw 'No es tu turno';
  const h = R.hands[p.id];
  if (!h) throw 'Mano no encontrada';

  if (m.t === 'draw') {
    if (R.dr) throw 'Ya has robado';
    if (m.from === 'discard') {
      if (!R.disc.length) throw 'Descarte vacío';
      const picked = R.disc.pop()!;
      R.dr = { id: picked, fd: 1 };
      log(R, `${p.name} roba del descarte`);
    } else {
      if (!R.deck.length) {
        const t = R.disc.pop()!;
        R.deck = shuffle(R.disc);
        R.disc = [t];
        if (!R.deck.length) throw 'Mazo vacío';
      }
      R.dr = { id: R.deck.pop()! };
      log(R, `${p.name} roba del mazo`);
    }
    h.push(R.dr.id);
    return;
  }

  if (!R.dr) throw 'Primero roba una carta';
  const id = m.id;
  if (!Number.isInteger(id) || !h.includes(id) || (R.dr.fd && id === R.dr.id)) {
    throw 'Carta no válida';
  }
  const rest = h.filter(x => x !== id);

  if (m.t === 'close') {
    if (best(rest).p > R.cfg.closeMax) throw 'No puedes cerrar todavía';
    R.hands[p.id] = rest;
    R.disc.push(id);
    return endRound(R, p);
  }

  R.hands[p.id] = rest;
  R.disc.push(id);
  log(R, `${p.name} descarta`);
  R.dr = null;
  R.ti = nextAct(R, R.ti);
  arm(R);
}

function botPlay(R: Room, bot: Player) {
  try {
    if (R.phase !== 'play' || R.pl[R.ti] !== bot) return;
    const h = R.hands[bot.id];
    if (!h) return;

    // Step 1: Draw
    if (!R.dr) {
      let drawFromDiscard = false;
      const top = R.disc.length ? R.disc[R.disc.length - 1] : null;
      if (top !== null) {
        const currentScore = best(h).p;
        // Test if top card improves hand
        const testHand = [...h, top];
        let bestScoreWithTop = 999;
        for (const card of testHand) {
          if (card !== top) {
            const score = best(testHand.filter(c => c !== card)).p;
            if (score < bestScoreWithTop) bestScoreWithTop = score;
          }
        }
        if (bestScoreWithTop < currentScore) {
          drawFromDiscard = true;
        }
      }

      play(R, bot, { t: 'draw', from: drawFromDiscard ? 'discard' : 'deck' });
      bcast(R);

      // Brief delay before discarding
      setTimeout(() => {
        try {
          if (R.phase !== 'play' || R.pl[R.ti] !== bot || !R.dr) return;
          botDiscard(R, bot);
        } catch {
          // Ignore
        }
      }, 700 + Math.random() * 400);
      return;
    }

    botDiscard(R, bot);
  } catch (err) {
    console.error('Bot error:', err);
  }
}

function botDiscard(R: Room, bot: Player) {
  const h = R.hands[bot.id];
  if (!h || !R.dr) return;

  // Check if any card allows closing
  const validDiscards = h.filter(c => !(R.dr?.fd && c === R.dr.id));
  let closeCard: number | null = null;
  for (const c of validDiscards) {
    const rest = h.filter(x => x !== c);
    const b = best(rest);
    if (b.p <= R.cfg.closeMax) {
      closeCard = c;
      break;
    }
  }

  if (closeCard !== null) {
    play(R, bot, { t: 'close', id: closeCard });
    bcast(R);
    return;
  }

  // Otherwise, find the discard that minimizes unmelded points
  let bestScore = 999;
  let chosenDiscard = validDiscards[0];

  for (const c of validDiscards) {
    const rest = h.filter(x => x !== c);
    const score = best(rest).p;
    if (score < bestScore) {
      bestScore = score;
      chosenDiscard = c;
    } else if (score === bestScore) {
      // Prefer discarding higher point cards
      if (pt(c) > pt(chosenDiscard)) {
        chosenDiscard = c;
      }
    }
  }

  play(R, bot, { t: 'discard', id: chosenDiscard });
  bcast(R);
}

function newRoom(): Room {
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');
  } while (rooms.has(code));

  const R: Room = {
    code,
    pl: [],
    cfg: { ...DEF },
    phase: 'lobby',
    log: [],
    round: 0,
    dealer: -1,
    ti: 0,
    n: 0,
    last: Date.now(),
    deck: [],
    disc: [],
    hands: {},
    dr: null,
    res: null,
    win: null,
    host: '',
    dl: 0,
    tm: null,
  };
  rooms.set(code, R);
  return R;
}

function addPlayer(R: Room, ws: WebSocket | null, name: string, isBot = false): Player {
  const cleanName = String(name || '').replace(/[<>&]/g, '').trim().slice(0, 14);
  if (!cleanName) throw 'Escribe un nombre';
  if (R.pl.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
    throw 'Ese nombre ya está en uso';
  }
  const p: Player = {
    id: 'p' + R.n++,
    name: cleanName,
    token: crypto.randomBytes(12).toString('hex'),
    ws,
    on: true,
    score: 0,
    out: false,
    isBot,
  };
  R.pl.push(p);
  if (!R.host) R.host = p.id;
  if (ws) {
    (ws as any).R = R;
    (ws as any).p = p;
    send(ws, { t: 'joined', code: R.code, token: p.token });
  }
  return p;
}

function leave(R: Room, p: Player) {
  if (R.phase === 'lobby') {
    R.pl = R.pl.filter(q => q !== p);
  } else {
    p.out = true;
    p.on = false;
    p.ws = null;
    const left = R.pl.filter(q => !q.out);
    if (R.phase === 'play') {
      if (left.length < 2) {
        R.phase = 'over';
        R.win = left[0] ? left[0].id : null;
        if (R.tm) clearTimeout(R.tm);
        R.dl = 0;
      } else if (R.pl[R.ti] === p) {
        R.dr = null;
        R.ti = nextAct(R, R.ti);
        arm(R);
      }
    }
  }
  if (R.host === p.id) {
    const nextHost = R.pl.find(q => q.on && !q.out && !q.isBot) || R.pl.find(q => q.on && !q.out);
    R.host = nextHost ? nextHost.id : '';
  }
  if (!R.pl.some(q => q.on && !q.isBot)) {
    if (R.tm) clearTimeout(R.tm);
    rooms.delete(R.code);
  } else {
    bcast(R);
  }
}

function drop(ws: WebSocket) {
  const R = (ws as any).R as Room;
  const p = (ws as any).p as Player;
  if (!R || !p || p.ws !== ws) return;
  p.on = false;
  p.ws = null;
  if (R.host === p.id) {
    const n = R.pl.find(q => q.on && !q.out && !q.isBot);
    if (n) R.host = n.id;
  }
  if (R.phase === 'play' && R.pl[R.ti] === p) arm(R);
  bcast(R);
}

function handleMessage(ws: WebSocket, m: any) {
  let R = (ws as any).R as Room;
  let p = (ws as any).p as Player;

  try {
    if (m.t === 'create') {
      R = newRoom();
      addPlayer(R, ws, m.name);
    } else if (m.t === 'join') {
      const code = String(m.code || '').toUpperCase().trim();
      R = rooms.get(code)!;
      if (!R) throw 'Esa partida no existe';
      if (R.phase !== 'lobby') throw 'La partida ya ha empezado';
      if (R.pl.length >= 4) throw 'La partida está llena (4/4)';
      addPlayer(R, ws, m.name);
    } else if (m.t === 'resume') {
      R = rooms.get(m.code)!;
      p = R && R.pl.find(q => q.token === m.token)!;
      if (!p) {
        return send(ws, { t: 'err', m: 'La sesión ya no existe', fatal: 1 });
      }
      if (p.ws && p.ws !== ws) {
        p.ws.close();
      }
      p.ws = ws;
      p.on = true;
      (ws as any).R = R;
      (ws as any).p = p;
      if (R.pl[R.ti] === p) arm(R);
    } else {
      if (!R || !p) throw 'No estás en una partida';

      if (m.t === 'add_bot') {
        if (R.host !== p.id || R.phase !== 'lobby') throw 'Solo el creador puede añadir bots';
        if (R.pl.length >= 4) throw 'La partida está llena (4/4)';
        const botNames = ['Bot Paco', 'Bot Lucía', 'Bot Carlos', 'Bot Elena', 'Bot Pepe'];
        const existingNames = new Set(R.pl.map(q => q.name.toLowerCase()));
        const availableName = botNames.find(bn => !existingNames.has(bn.toLowerCase())) || `Bot ${R.pl.length + 1}`;
        addPlayer(R, null, m.name || availableName, true);
      } else if (m.t === 'remove_bot') {
        if (R.host !== p.id || R.phase !== 'lobby') throw 'Solo el creador puede gestionar bots';
        const botIdx = R.pl.findIndex(q => q.id === m.id && q.isBot);
        if (botIdx >= 0) {
          R.pl.splice(botIdx, 1);
        }
      } else if (m.t === 'cfg') {
        if (R.host !== p.id || R.phase !== 'lobby') throw 'Solo el creador puede cambiar las reglas';
        const g = (k: keyof Config, ok: any[]) => (ok.includes(m[k]) ? m[k] : R.cfg[k]);
        R.cfg = {
          limit: g('limit', [50, 70, 100]),
          closeMax: g('closeMax', [0, 1, 2, 3, 4, 5]),
          chin: g('chin', ['win', 'plus50']),
          bonus: !!m.bonus,
          timer: g('timer', [0, 30, 60]),
        };
      } else if (m.t === 'start') {
        if (R.host !== p.id || R.phase !== 'lobby') throw 'Solo el creador puede iniciar';
        R.pl = R.pl.filter(q => q.on);
        if (R.pl.length < 2) throw 'Hacen falta al menos 2 jugadores conectados';
        R.dealer = -1;
        R.pl.forEach(q => {
          q.score = 0;
          q.out = false;
        });
        R.round = 0;
        R.win = null;
        startRound(R);
      } else if (m.t === 'next') {
        if (R.host !== p.id || R.phase !== 'roundEnd') throw 'No se puede';
        startRound(R);
      } else if (m.t === 'again') {
        if (R.host !== p.id || R.phase !== 'over') throw 'No se puede';
        R.phase = 'lobby';
        R.res = null;
        R.hands = {};
        R.deck = [];
        R.disc = [];
        R.log = [];
        R.pl = R.pl.filter(q => q.on);
        R.pl.forEach(q => {
          q.score = 0;
          q.out = false;
        });
      } else if (m.t === 'leave') {
        leave(R, p);
        (ws as any).R = null;
        (ws as any).p = null;
        return;
      } else {
        play(R, p, m);
      }
    }
  } catch (e) {
    return send(ws, { t: 'err', m: typeof e === 'string' ? e : 'Acción no válida' });
  }

  R.last = Date.now();
  bcast(R);
}

// Clean up stale rooms every 10 minutes
setInterval(() => {
  rooms.forEach((R, k) => {
    if (Date.now() - R.last > 3 * 3600e3 && !R.pl.some(p => p.on && !p.isBot)) {
      if (R.tm) clearTimeout(R.tm);
      rooms.delete(k);
    }
  });
}, 600e3);

// --- Express App & Vite Server Setup ---
const app = express();
const server = http.createServer(app);

// WebSocket Server attached directly
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  let cnt = 0;
  let t0 = Date.now();

  ws.on('message', data => {
    // Basic anti-spam
    if (Date.now() - t0 > 5000) {
      t0 = Date.now();
      cnt = 0;
    }
    if (++cnt > 50) {
      ws.close();
      return;
    }

    try {
      const msg = JSON.parse(data.toString());
      if (msg && typeof msg === 'object') {
        handleMessage(ws, msg);
      }
    } catch {
      // Ignore invalid JSON
    }
  });

  ws.on('close', () => drop(ws));
  ws.on('error', () => drop(ws));
});

// Legacy raw HTML endpoint to view original attached file if desired
app.get('/classic', (_req, res) => {
  const legacyPath = path.resolve(__dirname, 'public/assets/aistudio/index_b6dacdd2.html');
  if (fs.existsSync(legacyPath)) {
    res.sendFile(legacyPath);
  } else {
    res.status(404).send('Legacy client not found');
  }
});

// Mount Vite in Dev or serve static in Prod
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chinchón server running on http://0.0.0.0:${PORT}`);
});
