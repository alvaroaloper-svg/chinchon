// Chinchón multijugador: servidor autoritativo, SIN dependencias (solo Node >= 16).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000, rooms = new Map();
// Carta = id 0..39. palo = id/10 (0 oros,1 copas,2 espadas,3 bastos); rango = id%10 (1..7,sota,caballo,rey)
const rk = i => i % 10, su = i => Math.floor(i / 10), pt = i => [1, 2, 3, 4, 5, 6, 7, 10, 10, 10][i % 10];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };
const valid = c => {
  if (c.length < 3) return false;
  if (c.every(x => rk(x) === rk(c[0]))) return true; // grupo
  if (!c.every(x => su(x) === su(c[0]))) return false;
  const r = c.map(rk).sort((a, b) => a - b); return r.every((x, i) => !i || x === r[i - 1] + 1); // escalera
};
// Mejor partición de una mano en combinaciones minimizando puntos sueltos
function best(h) {
  const memo = {};
  const f = m => {
    if (!m) return { p: 0, g: [], u: [] }; if (memo[m]) return memo[m];
    const i = Math.log2(m & -m), rest = m ^ (1 << i);
    const l = f(rest); let b = { p: l.p + pt(h[i]), g: l.g, u: [h[i], ...l.u] };
    for (let s = rest; s > 0; s = (s - 1) & rest) {
      const mm = s | (1 << i), c = h.filter((_, k) => mm >> k & 1);
      if (valid(c)) { const r = f(m ^ mm); if (r.p < b.p) b = { p: r.p, g: [c, ...r.g], u: r.u }; }
    }
    return memo[m] = b;
  };
  return f((1 << h.length) - 1);
}
const DEF = { limit: 100, closeMax: 5, chin: 'win', bonus: true, timer: 0 };
const log = (R, s) => R.log.push(s);
const nextAct = (R, i) => { do i = (i + 1) % R.pl.length; while (R.pl[i].out); return i; };
const act = () => 0;

function startRound(R) {
  R.pl.forEach(p => { if (R.hands) R.hands[p.id] = []; });
  R.deck = shuffle([...Array(40).keys()]); R.hands = {};
  R.pl.filter(p => !p.out).forEach(p => R.hands[p.id] = R.deck.splice(0, 7));
  R.disc = [R.deck.pop()]; R.dealer = nextAct(R, R.dealer); R.ti = nextAct(R, R.dealer);
  R.dr = null; R.res = null; R.phase = 'play'; R.round++; log(R, `Ronda ${R.round}: reparte ${R.pl[R.dealer].name}`); arm(R);
}
function arm(R) {
  clearTimeout(R.tm); R.dl = 0; if (R.phase !== 'play') return;
  const p = R.pl[R.ti]; let s = R.cfg.timer; if (!p.on) s = Math.min(s || 10, 10); if (!s) return;
  R.dl = Date.now() + s * 1000;
  R.tm = setTimeout(() => {
    try {
      if (R.phase !== 'play' || R.pl[R.ti] !== p) return;
      if (!R.dr) play(R, p, { t: 'draw', from: 'deck' });
      log(R, `${p.name}: tiempo agotado`); play(R, p, { t: 'discard', id: R.dr.id }); bcast(R);
    } catch (e) { }
  }, s * 1000);
}
function play(R, p, m) {
  if (R.phase !== 'play' || R.pl[R.ti] !== p) throw 'No es tu turno';
  const h = R.hands[p.id];
  if (m.t === 'draw') {
    if (R.dr) throw 'Ya has robado';
    if (m.from === 'discard') { if (!R.disc.length) throw 'Descarte vacío'; R.dr = { id: R.disc.pop(), fd: 1 }; log(R, `${p.name} roba del descarte`); }
    else {
      if (!R.deck.length) { const t = R.disc.pop(); R.deck = shuffle(R.disc); R.disc = [t]; if (!R.deck.length) throw 'Mazo vacío'; }
      R.dr = { id: R.deck.pop() }; log(R, `${p.name} roba del mazo`);
    }
    h.push(R.dr.id); return;
  }
  if (!R.dr) throw 'Primero roba una carta';
  const id = m.id; if (!Number.isInteger(id) || !h.includes(id) || (R.dr.fd && id === R.dr.id)) throw 'Carta no válida';
  const rest = h.filter(x => x !== id);
  if (m.t === 'close') {
    if (best(rest).p > R.cfg.closeMax) throw 'No puedes cerrar todavía';
    R.hands[p.id] = rest; R.disc.push(id); return endRound(R, p);
  }
  R.hands[p.id] = rest; R.disc.push(id); log(R, `${p.name} descarta`); R.dr = null; R.ti = nextAct(R, R.ti); arm(R);
}
function endRound(R, closer) {
  clearTimeout(R.tm); R.dl = 0;
  const rows = R.pl.filter(p => !p.out).map(p => { const b = best(R.hands[p.id]); return { id: p.id, name: p.name, hand: R.hands[p.id], g: b.g, u: b.u, pts: b.p, chin: b.g.length === 1 && b.g[0].length === 7 }; });
  const cr = rows.find(r => r.id === closer.id);
  rows.forEach(r => {
    r.add = r.pts;
    if (cr.chin && R.cfg.chin === 'plus50') r.add = r === cr ? 0 : r.pts + 50;
    else if (r === cr && r.pts === 0 && R.cfg.bonus) r.add = -10;
    const p = R.pl.find(q => q.id === r.id); p.score += r.add; if (p.score > R.cfg.limit) p.out = true; r.total = p.score; r.out = p.out;
  });
  R.res = { rows, closer: closer.name, chin: cr.chin }; R.dr = null;
  log(R, `${closer.name} cierra${cr.chin ? ' con CHINCHÓN' : ''}`);
  const left = R.pl.filter(p => !p.out);
  if ((cr.chin && R.cfg.chin === 'win') || left.length <= 1) {
    R.phase = 'over';
    R.win = (cr.chin && R.cfg.chin === 'win' ? closer : (left.length ? left : R.pl).slice().sort((a, b) => a.score - b.score)[0]).id;
  } else R.phase = 'roundEnd';
}
function view(R, p) {
  const h = R.hands && R.hands[p.id] || [], mine = R.phase === 'play' && R.pl[R.ti] === p;
  return {
    t: 'state', code: R.code, phase: R.phase, cfg: R.cfg, host: R.host, you: p.id, round: R.round,
    pl: R.pl.map(q => ({ id: q.id, name: q.name, score: q.score, out: q.out, on: q.on, n: q.out ? 0 : (R.hands && R.hands[q.id] || []).length })),
    hand: h, deck: R.deck ? R.deck.length : 0, top: R.disc && R.disc.length ? R.disc[R.disc.length - 1] : null,
    turn: R.phase === 'play' ? R.pl[R.ti].id : null, dr: mine && R.dr ? R.dr.id : null, dl: R.dl, log: R.log.slice(-8), res: R.res, win: R.win,
    cl: mine && R.dr ? h.filter(id => !(R.dr.fd && id === R.dr.id) && best(h.filter(x => x !== id)).p <= R.cfg.closeMax) : []
  };
}
const bcast = R => R.pl.forEach(p => p.c && send(p.c, view(R, p)));

function newRoom() {
  let code; do code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join(''); while (rooms.has(code));
  const R = { code, pl: [], cfg: { ...DEF }, phase: 'lobby', log: [], round: 0, dealer: -1, n: 0, last: Date.now() }; rooms.set(code, R); return R;
}
function addPlayer(R, c, name) {
  name = String(name || '').replace(/[<>&]/g, '').trim().slice(0, 14); if (!name) throw 'Escribe un nombre';
  if (R.pl.some(p => p.name.toLowerCase() === name.toLowerCase())) throw 'Ese nombre ya está en uso';
  const p = { id: 'p' + R.n++, name, token: crypto.randomBytes(12).toString('hex'), c, on: true, score: 0, out: false };
  R.pl.push(p); if (!R.host) R.host = p.id; c.R = R; c.p = p; send(c, { t: 'joined', code: R.code, token: p.token }); return p;
}
function onMsg(c, m) {
  let R = c.R, p = c.p;
  try {
    if (m.t === 'create') { R = newRoom(); addPlayer(R, c, m.name); }
    else if (m.t === 'join') {
      R = rooms.get(String(m.code || '').toUpperCase().trim()); if (!R) throw 'Esa partida no existe';
      if (R.phase !== 'lobby') throw 'La partida ya ha empezado'; if (R.pl.length >= 4) throw 'La partida está llena (4/4)';
      addPlayer(R, c, m.name);
    } else if (m.t === 'resume') {
      R = rooms.get(m.code); p = R && R.pl.find(q => q.token === m.token); if (!p) return send(c, { t: 'err', m: 'La sesión ya no existe', fatal: 1 });
      if (p.c && p.c !== c) p.c.sock.destroy(); p.c = c; p.on = true; c.R = R; c.p = p; if (R.pl[R.ti] === p) arm(R);
    } else {
      if (!R || !p) throw 'No estás en una partida';
      if (m.t === 'cfg') {
        if (R.host !== p.id || R.phase !== 'lobby') throw 'Solo el creador puede cambiar las reglas';
        const g = (k, ok) => ok.includes(m[k]) ? m[k] : R.cfg[k];
        R.cfg = { limit: g('limit', [50, 70, 100]), closeMax: g('closeMax', [0, 1, 2, 3, 4, 5]), chin: g('chin', ['win', 'plus50']), bonus: !!m.bonus, timer: g('timer', [0, 30, 60]) };
      } else if (m.t === 'start') {
        if (R.host !== p.id || R.phase !== 'lobby') throw 'Solo el creador puede iniciar';
        R.pl = R.pl.filter(q => q.on); if (R.pl.length < 2) throw 'Hacen falta al menos 2 jugadores conectados';
        R.dealer = -1; R.pl.forEach(q => { q.score = 0; q.out = false; }); R.round = 0; R.win = null; startRound(R);
      } else if (m.t === 'next') {
        if (R.host !== p.id || R.phase !== 'roundEnd') throw 'No se puede'; startRound(R);
      } else if (m.t === 'again') {
        if (R.host !== p.id || R.phase !== 'over') throw 'No se puede'; R.phase = 'lobby'; R.res = null; R.hands = null; R.deck = null; R.disc = null; R.log = [];
        R.pl = R.pl.filter(q => q.on); R.pl.forEach(q => { q.score = 0; q.out = false; });
      } else if (m.t === 'leave') { leave(R, p); c.R = c.p = null; return; }
      else play(R, p, m);
    }
  } catch (e) { return send(c, { t: 'err', m: typeof e === 'string' ? e : 'Acción no válida' }); }
  R.last = Date.now(); bcast(R);
}
function leave(R, p) {
  if (R.phase === 'lobby') R.pl = R.pl.filter(q => q !== p);
  else {
    p.out = true; p.on = false; p.c = null; const left = R.pl.filter(q => !q.out);
    if (R.phase === 'play') { if (left.length < 2) { R.phase = 'over'; R.win = left[0] && left[0].id; clearTimeout(R.tm); R.dl = 0; } else if (R.pl[R.ti] === p) { R.dr = null; R.ti = nextAct(R, R.ti); arm(R); } }
  }
  if (R.host === p.id) { const n = R.pl.find(q => q.on && !q.out); R.host = n && n.id; }
  if (!R.pl.some(q => q.on)) { clearTimeout(R.tm); rooms.delete(R.code); } else bcast(R);
}
function drop(c) {
  const R = c.R, p = c.p; if (!R || !p || p.c !== c) return;
  p.on = false; p.c = null;
  if (R.host === p.id) { const n = R.pl.find(q => q.on && !q.out); if (n) R.host = n.id; }
  if (R.phase === 'play' && R.pl[R.ti] === p) arm(R);
  bcast(R);
}
setInterval(() => rooms.forEach((R, k) => { if (Date.now() - R.last > 3 * 3600e3 && !R.pl.some(p => p.on)) rooms.delete(k); }), 600e3);

// ---- HTTP + WebSocket mínimo (RFC 6455) ----
function send(c, o) {
  if (!c || c.sock.destroyed) return; const d = Buffer.from(JSON.stringify(o)); let h;
  if (d.length < 126) h = Buffer.from([0x81, d.length]); else { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(d.length, 2); }
  c.sock.write(Buffer.concat([h, d]));
}
function pull(c) {
  const b = c.buf; if (b.length < 2) return null; let n = b[1] & 127, o = 2;
  if (n === 126) { if (b.length < 4) return null; n = b.readUInt16BE(2); o = 4; } else if (n === 127 || n > 4096) return { op: 8 };
  const mk = b[1] & 128; if (b.length < o + (mk ? 4 : 0) + n) return null;
  const key = mk ? b.slice(o, o + 4) : null; o += mk ? 4 : 0; const pl = Buffer.from(b.slice(o, o + n));
  if (key) for (let i = 0; i < n; i++) pl[i] ^= key[i & 3]; c.buf = b.slice(o + n); return { op: b[0] & 15, pl };
}
const srv = http.createServer((q, r) => {
  const f = q.url.split('?')[0] === '/' ? 'index.html' : path.basename(q.url.split('?')[0]);
  fs.readFile(path.join(__dirname, 'public', f), (e, d) => {
    if (e) { r.writeHead(404); return r.end('404'); }
    r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' }); r.end(d);
  });
});
srv.on('upgrade', (req, sock) => {
  const k = req.headers['sec-websocket-key']; if (!k) return sock.destroy();
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' +
    crypto.createHash('sha1').update(k + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64') + '\r\n\r\n');
  const c = { sock, buf: Buffer.alloc(0), R: null, p: null, cnt: 0, t0: Date.now() };
  sock.on('data', d => {
    c.buf = Buffer.concat([c.buf, d]);
    for (let f; (f = pull(c));) {
      if (f.op === 8) return sock.end();
      if (f.op === 9) sock.write(Buffer.from([0x8A, 0]));
      if (f.op === 1) {
        if (Date.now() - c.t0 > 5000) { c.t0 = Date.now(); c.cnt = 0; } if (++c.cnt > 40) return sock.destroy(); // anti-spam
        let m; try { m = JSON.parse(f.pl.toString()); } catch (e) { continue; } if (m && typeof m === 'object') onMsg(c, m);
      }
    }
  });
  sock.on('close', () => drop(c)); sock.on('error', () => sock.destroy());
});
srv.listen(PORT, () => console.log('Chinchón en http://localhost:' + PORT));
