// Spanish deck card utilities & Chinchón logic
export const SUITS = [
  { name: 'Oros', symbol: '🪙', color: '#eab308', border: '#ca8a04', text: 'text-amber-500', bg: 'bg-amber-500/10' },
  { name: 'Copas', symbol: '🍷', color: '#ef4444', border: '#dc2626', text: 'text-red-500', bg: 'bg-red-500/10' },
  { name: 'Espadas', symbol: '⚔️', color: '#3b82f6', border: '#2563eb', text: 'text-blue-500', bg: 'bg-blue-500/10' },
  { name: 'Bastos', symbol: '🪵', color: '#22c55e', border: '#16a34a', text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

export const RANKS = ['1', '2', '3', '4', '5', '6', '7', 'S', 'C', 'R'];
export const FULL_RANKS = ['As (1)', '2', '3', '4', '5', '6', '7', 'Sota (10)', 'Caballo (11)', 'Rey (12)'];
export const POINTS = [1, 2, 3, 4, 5, 6, 7, 10, 10, 10];

export const rk = (i: number) => i % 10;
export const su = (i: number) => Math.floor(i / 10);
export const pt = (i: number) => POINTS[rk(i)];

export function getCardInfo(id: number) {
  const suitIndex = su(id);
  const rankIndex = rk(id);
  return {
    id,
    suitIndex,
    rankIndex,
    suit: SUITS[suitIndex],
    rankLabel: RANKS[rankIndex],
    fullRank: FULL_RANKS[rankIndex],
    points: POINTS[rankIndex],
  };
}

export const valid = (c: number[]): boolean => {
  if (c.length < 3) return false;
  // Trío o cuarteto del mismo número
  if (c.every(x => rk(x) === rk(c[0]))) return true;
  // Escalera del mismo palo (orden: 1..7, Sota, Caballo, Rey)
  if (!c.every(x => su(x) === su(c[0]))) return false;
  const r = c.map(rk).sort((a, b) => a - b);
  return r.every((x, i) => !i || x === r[i - 1] + 1);
};

export function best(h: number[]): { p: number; g: number[][]; u: number[] } {
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

export function sortCards(cards: number[], mode: 'rank' | 'suit'): number[] {
  const copy = [...cards];
  if (mode === 'rank') {
    return copy.sort((a, b) => {
      const rDiff = rk(a) - rk(b);
      return rDiff !== 0 ? rDiff : su(a) - su(b);
    });
  }
  return copy.sort((a, b) => {
    const sDiff = su(a) - su(b);
    return sDiff !== 0 ? sDiff : rk(a) - rk(b);
  });
}
