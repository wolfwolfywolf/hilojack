// Year-end tournament: seeding, Rounds 1-3 tables, running standings, cuts and tie games.
// Pure functions (no database) so they can be unit tested. Tournament tables use the same MatchRow
// shape as league weeks, with week_no holding the round number.
import { computeStandings, creditedScores, displayName, sideTotal } from "./standings.ts";
import type { MatchRow, Player, Settings } from "./types.ts";

export const ROUNDS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Night (1-3) each round is played on. */
export const nightOf = (round: number) => (round <= 3 ? 1 : round <= 5 ? 2 : 3);

/** How many players move on after a round: top 20 after Round 3, top 12 after 4, top 8 after 5. */
export const CUTS: Record<number, number> = { 3: 20, 4: 12, 5: 8 };
export const CUT_ROUNDS = [3, 4, 5] as const;

export const gamesIn = (round: number) => (round <= 3 ? 3 : 5);

export interface TieWinner {
  cut_after: number;
  player_id: number;
}

/**
 * Season seeding for Round 1: highest season total first. Ties go to whoever had more points as of the
 * week before the final week (last season: Week 16 of 17), then the week before that, and so on.
 */
export function seasonSeeds(players: Player[], matches: MatchRow[], settings: Pick<Settings, "sub_credit">): number[] {
  const rows = computeStandings(players, matches, settings).filter((r) => r.player.active);
  const credited = creditedScores(matches, settings.sub_credit);
  const scoredWeeks = [...new Set(matches.filter((m) => m.slots.some((s) => s.score != null)).map((m) => m.week_no))].sort((a, b) => a - b);
  const through = (id: number, week: number) => {
    let t = 0;
    for (const [w, pts] of credited.get(id) ?? []) if (w <= week) t += pts;
    return t;
  };
  const earlier = scoredWeeks.slice(0, -1).reverse(); // week before the final one first
  return rows
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      for (const w of earlier) {
        const d = through(b.player.id, w) - through(a.player.id, w);
        if (d) return d;
      }
      return displayName(a.player).localeCompare(displayName(b.player));
    })
    .map((r) => r.player.id);
}

/** Seats for one table, in order A1, A2 (vs) B1, B2. */
export type Seating = [number, number, number, number];

/**
 * Rounds 1-3 tables, as the league did them last season. Seeds go into groups of four. The top group plays
 * the bottom group (1-4 vs 33-36), the next plays the next from the bottom (5-8 vs 29-32), and so on; with
 * an odd number of groups the middle one (17-20 of 36) plays itself. Each round you get a new partner from
 * your own group of four. Returns null when the number of players isn't a multiple of 4.
 */
export function earlyRoundTables(seeds: number[], round: 1 | 2 | 3): Seating[] | null {
  if (seeds.length === 0 || seeds.length % 4 !== 0) return null;
  const k = seeds.length / 4;
  const quad = (i: number) => seeds.slice(i * 4, i * 4 + 4);
  const out: Seating[] = [];
  for (let i = 0; i < Math.floor(k / 2); i++) {
    const [a, b, c, d] = quad(i);
    const [w, x, y, z] = quad(k - 1 - i);
    if (round === 1) out.push([a, b, y, z], [c, d, w, x]);
    if (round === 2) out.push([a, c, x, z], [b, d, w, y]);
    if (round === 3) out.push([a, d, x, y], [b, c, w, z]);
  }
  if (k % 2 === 1) {
    const [a, b, c, d] = quad((k - 1) / 2);
    out.push(round === 1 ? [a, b, c, d] : round === 2 ? [a, c, b, d] : [a, d, b, c]);
  }
  return out;
}

/**
 * Rounds 4 and 6 tables, as the league did them last season: partners are next to each other in the standings
 * (1&2, 3&4, ...), and the top pair plays the bottom pair (Round 4: 1&2 vs 19&20, ... 9&10 vs 11&12;
 * Round 6: 1&2 vs 7&8, 3&4 vs 5&6).
 * Returns null when the number of players isn't a multiple of 4.
 */
export function foldedTables(order: number[]): Seating[] | null {
  if (order.length === 0 || order.length % 4 !== 0) return null;
  const pairs = Array.from({ length: order.length / 2 }, (_, i) => [order[2 * i], order[2 * i + 1]] as const);
  return pairs.slice(0, pairs.length / 2).map((top, i) => {
    const bottom = pairs[pairs.length - 1 - i];
    return [top[0], top[1], bottom[0], bottom[1]];
  });
}

/** Every pair at every table of the round has its points in. */
export function roundComplete(tables: MatchRow[], round: number): boolean {
  const ts = tables.filter((t) => t.week_no === round);
  return ts.length > 0 && ts.every((t) => sideTotal(t, "A") != null && sideTotal(t, "B") != null);
}

export interface TourneyRow {
  playerId: number;
  seed: number; // 1-based season seed
  rounds: (number | null)[]; // points in Rounds 1-7 (index 0 = Round 1)
  total: number;
  /** Last round played before being cut, or null while still in. */
  outAfter: number | null;
  /** Tied at the cut line and waiting on the playoff game. */
  inTieGame: boolean;
  place?: string; // "Champions", "2nd place", "3rd place"
}

export interface CutState {
  after: number;
  size: number;
  /** The round before the cut has all its scores in. */
  ready: boolean;
  /** Who moves on, once settled. */
  advancing: number[] | null;
  /** Tie at the cut line that a playoff game must settle. */
  tie: { players: number[]; spots: number; place: number } | null;
}

export interface TourneyState {
  rows: TourneyRow[];
  cuts: CutState[];
  /** Players for a round, best first, or null while the round before isn't settled. */
  seatOrder: (round: number) => number[] | null;
  /** Round 7 pairs (Round 6 winners), or null until Round 6 is scored. */
  finalPairs: Seating | null;
  totalThrough: (playerId: number, round: number) => number;
}

/** Each pair at a table, as [A pair, B pair] with their points. */
function sides(t: MatchRow) {
  const ids = (side: "A" | "B") => t.slots.filter((s) => s.side === side).map((s) => s.player_id ?? -1);
  return { A: ids("A"), B: ids("B"), a: sideTotal(t, "A"), b: sideTotal(t, "B") };
}

export function tourneyState(seeds: number[], tables: MatchRow[], tieWinners: TieWinner[]): TourneyState {
  const seedOf = new Map(seeds.map((id, i) => [id, i + 1]));
  const credited = creditedScores(tables, "scheduled"); // a sub's points go to the player they sat in for
  const pts = (id: number, round: number) => credited.get(id)?.get(round) ?? null;
  const totalThrough = (id: number, round: number) => {
    let t = 0;
    for (let r = 1; r <= round; r++) t += pts(id, r) ?? 0;
    return t;
  };
  const bySeed = (a: number, b: number) => (seedOf.get(a) ?? 999) - (seedOf.get(b) ?? 999);
  const ranked = (ids: number[], round: number) =>
    [...ids].sort((a, b) => totalThrough(b, round) - totalThrough(a, round) || bySeed(a, b));

  const outAfter = new Map<number, number>();
  const inTie = new Set<number>();
  const cuts: CutState[] = [];
  const advancingAfter = new Map<number, number[]>();
  let alive = [...seeds];
  let blocked = false;
  for (const after of CUT_ROUNDS) {
    const size = CUTS[after];
    const ready = !blocked && roundComplete(tables, after);
    const cut: CutState = { after, size, ready, advancing: null, tie: null };
    cuts.push(cut);
    if (!ready) { blocked = true; continue; }
    const order = ranked(alive, after);
    let advancing: number[] | null;
    if (order.length <= size) advancing = order;
    else {
      const line = totalThrough(order[size - 1], after);
      const above = order.filter((id) => totalThrough(id, after) > line);
      const tied = order.filter((id) => totalThrough(id, after) === line);
      if (above.length + tied.length <= size) advancing = [...above, ...tied];
      else {
        const spots = size - above.length;
        const won = tieWinners.filter((w) => w.cut_after === after && tied.includes(w.player_id)).map((w) => w.player_id);
        if (won.length === spots) advancing = [...above, ...tied.filter((id) => won.includes(id))];
        else {
          advancing = null;
          cut.tie = { players: tied, spots, place: above.length + 1 };
          tied.forEach((id) => inTie.add(id));
        }
      }
    }
    if (!advancing) { blocked = true; continue; }
    cut.advancing = advancing;
    advancingAfter.set(after, advancing);
    for (const id of alive) if (!advancing.includes(id)) outAfter.set(id, after);
    alive = advancing;
  }

  // Semifinals and final: the pair that scores more wins the match.
  const semis = tables.filter((t) => t.week_no === 6);
  let finalPairs: Seating | null = null;
  const place = new Map<number, string>();
  if (semis.length === 2 && roundComplete(tables, 6)) {
    const winners = semis.map((t) => {
      const s = sides(t);
      return s.a! > s.b! ? s.A : s.b! > s.a! ? s.B : null;
    });
    if (winners[0] && winners[1]) {
      finalPairs = [winners[0][0], winners[0][1], winners[1][0], winners[1][1]];
      for (const t of semis) {
        const s = sides(t);
        for (const id of s.a! > s.b! ? s.B : s.A) place.set(id, "3rd place");
      }
    }
  }
  const final = tables.find((t) => t.week_no === 7);
  if (final && roundComplete(tables, 7)) {
    const s = sides(final);
    if (s.a !== s.b) {
      const [win, lose] = s.a! > s.b! ? [s.A, s.B] : [s.B, s.A];
      win.forEach((id) => place.set(id, "Champions"));
      lose.forEach((id) => place.set(id, "2nd place"));
    }
  }

  const rows: TourneyRow[] = seeds.map((id) => {
    const rounds = ROUNDS.map((r) => pts(id, r));
    return {
      playerId: id,
      seed: seedOf.get(id)!,
      rounds,
      total: rounds.reduce<number>((a, b) => a + (b ?? 0), 0),
      outAfter: outAfter.get(id) ?? null,
      inTieGame: inTie.has(id),
      place: place.get(id),
    };
  });
  const placeOrder = (r: TourneyRow) => (r.place === "Champions" ? 0 : r.place === "2nd place" ? 1 : r.place ? 2 : 3);
  rows.sort(
    (a, b) =>
      placeOrder(a) - placeOrder(b) ||
      (b.outAfter ?? 99) - (a.outAfter ?? 99) ||
      b.total - a.total ||
      a.seed - b.seed,
  );

  const seatOrder = (round: number): number[] | null => {
    if (round <= 3) return seeds;
    if (round === 7) return finalPairs ? [...finalPairs] : null;
    const adv = advancingAfter.get(round - 1);
    return adv ? ranked(adv, round - 1) : null;
  };

  return { rows, cuts, seatOrder, finalPairs, totalThrough };
}
