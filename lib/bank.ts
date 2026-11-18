// League bank and player purse (managers only). Pure functions so they can be tested without a database.
// Money is kept in whole cents so splits like $100 between 6 players add up cleanly.
import { computeStandings, displayName, isNoShow, sideTotal } from "./standings.ts";
import type { MatchRow, Player, Settings } from "./types.ts";

/** Prize amounts the managers set on the Bank page, in whole dollars. */
export interface BankSettings {
  ante: number;          // each player pays this once a season
  weekly_prize: number;  // split by the week's high-scoring pair (or pairs, on a tie)
  season_1: number;      // final standings, individual
  season_2: number;
  season_3: number;
  playoff_1: number;     // tournament winning team (split between the two partners)
  playoff_2: number;     // runner-up team
  playoff_semi: number;  // each of the two teams knocked out in the semifinals ("3rd place")
}

export const BANK_DEFAULTS: BankSettings = {
  ante: 125, weekly_prize: 100, season_1: 0, season_2: 0, season_3: 0, playoff_1: 0, playoff_2: 0, playoff_semi: 0,
};

/** Playoff finishing places a manager records (later the tournament page can fill these in). */
export const PLAYOFF_PLACES = [
  { key: "first", label: "Champions" },
  { key: "second", label: "Runners-up" },
  { key: "semi_a", label: "Semifinal team" },
  { key: "semi_b", label: "Semifinal team" },
] as const;
export type PlayoffPlace = (typeof PLAYOFF_PLACES)[number]["key"];
export interface PlayoffResult { place: PlayoffPlace; seat: 1 | 2; player_id: number }

/** Split a total in cents between n people, handing out leftover pennies one at a time. */
export function splitCents(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  return Array.from({ length: n }, (_, i) => base + (i < totalCents - base * n ? 1 : 0));
}

/** Every pair has a score (or a no-show settled the table), so the week's high pair is final. */
export function weekComplete(matches: MatchRow[]): boolean {
  return matches.length > 0 && matches.every((m) =>
    m.slots.some(isNoShow) || (sideTotal(m, "A") != null && sideTotal(m, "B") != null));
}

export interface WeeklyWinner {
  week_no: number;
  score: number;
  /** Who gets paid: the person who sat at the table (a sub, if one played), and how much in cents. */
  payees: { person_id: number; for_player_id: number | null; cents: number }[];
}

/**
 * The weekly high pair(s), using the raw pair score (the no-show +6 doesn't count toward the high).
 * Ties split the prize evenly between everyone in the tied pairs. A player marked no-show gets no share;
 * their partner takes the pair's share. Weeks that aren't fully scored are left out.
 */
export function weeklyWinners(matches: MatchRow[], weeklyPrizeDollars: number): WeeklyWinner[] {
  const byWeek = new Map<number, MatchRow[]>();
  for (const m of matches) byWeek.set(m.week_no, [...(byWeek.get(m.week_no) ?? []), m]);
  const out: WeeklyWinner[] = [];
  for (const [week_no, ms] of [...byWeek].sort((a, b) => a[0] - b[0])) {
    if (!weekComplete(ms)) continue;
    let best: number | null = null;
    let seats: { person_id: number; for_player_id: number | null }[][] = [];
    for (const m of ms)
      for (const side of ["A", "B"] as const) {
        const t = sideTotal(m, side);
        if (t == null) continue;
        const pair = m.slots
          .filter((s) => s.side === side && !isNoShow(s) && (s.sub_id ?? s.player_id) != null)
          .map((s) => ({ person_id: (s.sub_id ?? s.player_id)!, for_player_id: s.sub_id != null ? s.player_id : null }));
        if (!pair.length) continue;
        if (best == null || t > best) { best = t; seats = [pair]; }
        else if (t === best) seats.push(pair);
      }
    if (best == null) continue;
    // Each tied pair gets an equal share, then partners split their pair's share.
    const pairShares = splitCents(weeklyPrizeDollars * 100, seats.length);
    const payees = seats.flatMap((pair, i) => {
      const each = splitCents(pairShares[i], pair.length);
      return pair.map((p, j) => ({ ...p, cents: each[j] }));
    });
    out.push({ week_no, score: best, payees });
  }
  return out;
}

export interface SeasonPrize { player_id: number; place: number; cents: number; tied: boolean }

/**
 * Season prizes from the final standings. Tied players share the prizes for the places they cover:
 * two tied for 2nd split the 2nd and 3rd prizes; three tied for 3rd split the 3rd prize.
 */
export function seasonPrizes(
  players: Player[], matches: MatchRow[], settings: Pick<Settings, "sub_credit">, bank: BankSettings,
): SeasonPrize[] {
  const rows = computeStandings(players, matches, settings).filter((r) => r.weeksPlayed > 0);
  const prizes = [bank.season_1, bank.season_2, bank.season_3];
  const out: SeasonPrize[] = [];
  for (let i = 0; i < rows.length && i < prizes.length; ) {
    const group = rows.filter((r) => r.rank === rows[i].rank);
    const pot = prizes.slice(i, i + group.length).reduce((a, b) => a + b, 0) * 100;
    const shares = splitCents(pot, group.length);
    group.forEach((r, j) => out.push({ player_id: r.player.id, place: r.rank, cents: shares[j], tied: group.length > 1 }));
    i += group.length;
  }
  return out.filter((p) => p.cents > 0);
}

/** Playoff payouts: each team's prize is split between its two partners. */
export function playoffPrizes(results: PlayoffResult[], bank: BankSettings): { player_id: number; place: PlayoffPlace; cents: number }[] {
  const amount: Record<PlayoffPlace, number> = {
    first: bank.playoff_1, second: bank.playoff_2, semi_a: bank.playoff_semi, semi_b: bank.playoff_semi,
  };
  return PLAYOFF_PLACES.flatMap(({ key }) => {
    const team = results.filter((r) => r.place === key).sort((a, b) => a.seat - b.seat);
    const shares = splitCents(amount[key] * 100, team.length);
    return team.map((r, i) => ({ player_id: r.player_id, place: key, cents: shares[i] }));
  });
}

export interface PurseRow {
  person: Player;
  weeks: number[];      // weeks they shared the high-pair prize
  weeklyCents: number;
  seasonCents: number;
  playoffCents: number;
  totalCents: number;
}

/** Everyone who has won something, biggest total first. */
export function purse(
  players: Player[],
  weekly: WeeklyWinner[],
  season: SeasonPrize[] | null,
  playoffs: { player_id: number; cents: number }[],
): PurseRow[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const rows = new Map<number, PurseRow>();
  const row = (id: number) => {
    let r = rows.get(id);
    if (!r && byId.has(id)) {
      r = { person: byId.get(id)!, weeks: [], weeklyCents: 0, seasonCents: 0, playoffCents: 0, totalCents: 0 };
      rows.set(id, r);
    }
    return r;
  };
  for (const w of weekly)
    for (const p of w.payees) {
      const r = row(p.person_id);
      if (r) { r.weeklyCents += p.cents; r.weeks.push(w.week_no); }
    }
  for (const s of season ?? []) { const r = row(s.player_id); if (r) r.seasonCents += s.cents; }
  for (const p of playoffs) { const r = row(p.player_id); if (r) r.playoffCents += p.cents; }
  for (const r of rows.values()) r.totalCents = r.weeklyCents + r.seasonCents + r.playoffCents;
  return [...rows.values()]
    .filter((r) => r.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents || displayName(a.person).localeCompare(displayName(b.person)));
}

/** What the season's prizes add up to if every prize is paid. */
export function bankTotals(bank: BankSettings, payingPlayers: number, numWeeks: number) {
  const collected = bank.ante * payingPlayers;
  const weekly = bank.weekly_prize * numWeeks;
  const season = bank.season_1 + bank.season_2 + bank.season_3;
  const playoffs = bank.playoff_1 + bank.playoff_2 + 2 * bank.playoff_semi;
  const prizes = weekly + season + playoffs;
  return { collected, weekly, season, playoffs, prizes, left: collected - prizes };
}

export function fmtMoney(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const c = abs % 100;
  return `${neg ? "-" : ""}$${whole}${c ? "." + String(c).padStart(2, "0") : ""}`;
}
