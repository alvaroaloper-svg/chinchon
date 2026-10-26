export interface Config {
  limit: number;
  closeMax: number;
  chin: 'win' | 'plus50';
  bonus: boolean;
  timer: number;
}

export interface PlayerInfo {
  id: string;
  name: string;
  score: number;
  out: boolean;
  on: boolean;
  n: number;
  isBot?: boolean;
}

export interface RoundResultRow {
  id: string;
  name: string;
  hand: number[];
  g: number[][];
  u: number[];
  pts: number;
  chin: boolean;
  add: number;
  total: number;
  out: boolean;
}

export interface RoundResult {
  rows: RoundResultRow[];
  closer: string;
  chin: boolean;
}

export interface GameState {
  t: 'state';
  code: string;
  phase: 'lobby' | 'play' | 'roundEnd' | 'over';
  cfg: Config;
  host: string;
  you: string;
  round: number;
  pl: PlayerInfo[];
  hand: number[];
  deck: number;
  top: number | null;
  turn: string | null;
  dr: number | null;
  dl: number;
  log: string[];
  res: RoundResult | null;
  win: string | null;
  cl: number[];
}

export type ClientMessage =
  | { t: 'create'; name: string }
  | { t: 'join'; code: string; name: string }
  | { t: 'resume'; code: string; token: string }
  | { t: 'cfg'; limit?: number; closeMax?: number; chin?: 'win' | 'plus50'; bonus?: boolean; timer?: number }
  | { t: 'start' }
  | { t: 'draw'; from: 'deck' | 'discard' }
  | { t: 'discard'; id: number }
  | { t: 'close'; id: number }
  | { t: 'next' }
  | { t: 'again' }
  | { t: 'leave' }
  | { t: 'add_bot'; name?: string }
  | { t: 'remove_bot'; id: string };

export type ServerMessage =
  | { t: 'joined'; code: string; token: string }
  | { t: 'err'; m: string; fatal?: number }
  | GameState;
