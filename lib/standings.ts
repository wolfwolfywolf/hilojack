import type { MatchRow, Player, Settings, Slot, StandingRow, SubAppearance } from "./types";

export function displayName(p: Pick<Player, "last_name" | "first_initial"> | null | undefined) {
  if (!p) return "TBD";
  const init = p.first_initial.trim();
  return init ? `${p.last_name}, ${init.charAt(0).toUpperCase()}.` : p.last_name;
}

/** Penalty and bonuses from the league's no-show / leaving-early rule. */
export const NO_SHOW = { self: -2, partner: 3, opponents: 6 } as const;

/** True when this seat was a no-show (or left early). A seat with a sub is never a no-show. */
export const isNoShow = (s: Slot) => s.no_show && s.sub_id == null;

/**
 * Points a seat earns for the night, before sub crediting rules, or null if nothing is entered yet.
 * No-show / left early: that player gets -2 and none of the pair's points; a partner who stayed
 * gets the pair's points + 3; both opponents get their pair's points + 6. A blank pair score counts
 * as 0 once anyone at the table is marked, since the game may never have been played.
 */
export function seatPoints(m: MatchRow, s: Slot): number | null {
  const anyNoShow = m.slots.some(isNoShow);
  let pts: number | null;
  if (isNoShow(s)) pts = NO_SHOW.self;
  else {
    const pair = s.score;
    const partnerOut = m.slots.some((o) => o.side === s.side && o.seat !== s.seat && isNoShow(o));
    const oppOut = m.slots.some((o) => o.side !== s.side && isNoShow(o));
    pts = pair == null && !anyNoShow ? null : (pair ?? 0) + (partnerOut ? NO_SHOW.partner : 0) + (oppOut ? NO_SHOW.opponents : 0);
  }
  if (s.adjust != null) pts = (pts ?? 0) + s.adjust;
  return pts;
}

/** The score each regular player is credited with, per week. */
export function creditedScores(
  matches: MatchRow[],
  subCredit: Settings["sub_credit"],
): Map<number, Map<number, number>> {
  const out = new Map<number, Map<number, number>>();
  for (const m of matches)
    for (const s of m.slots) {
      if (s.player_id == null) continue;
      // With sub_credit "none" an absent player keeps only their own old +/- adjustment.
      const pts = s.sub_id != null && subCredit === "none" ? s.adjust : seatPoints(m, s);
      if (pts == null) continue;
      const byWeek = out.get(s.player_id) ?? new Map<number, number>();
      byWeek.set(m.week_no, (byWeek.get(m.week_no) ?? 0) + pts);
      out.set(s.player_id, byWeek);
    }
  return out;
}

export function computeStandings(
  players: Player[],
  matches: MatchRow[],
  settings: Pick<Settings, "sub_credit">,
): StandingRow[] {
  const credited = creditedScores(matches, settings.sub_credit);
  const subbedOut = new Map<number, number>();
  for (const m of matches)
    for (const s of m.slots)
      if (s.player_id != null && s.sub_id != null)
        subbedOut.set(s.player_id, (subbedOut.get(s.player_id) ?? 0) + 1);

  const rows = players
    .filter((p) => !p.is_sub && (p.active || credited.has(p.id)))
    .map((player) => {
      const weeks = [...(credited.get(player.id)?.values() ?? [])];
      const total = weeks.reduce((a, b) => a + b, 0);
      return {
        player,
        rank: 0,
        weeksPlayed: weeks.length,
        total,
        average: weeks.length ? total / weeks.length : 0,
        high: weeks.length ? Math.max(...weeks) : null,
        subbedOut: subbedOut.get(player.id) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.average - a.average ||
        displayName(a.player).localeCompare(displayName(b.player)),
    );

  // Ties on total share a rank (1, 2, 2, 4).
  rows.forEach((r, i) => {
    r.rank = i > 0 && rows[i - 1].total === r.total ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

export function subAppearances(players: Player[], matches: MatchRow[]): SubAppearance[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const out: SubAppearance[] = [];
  for (const m of matches)
    for (const s of m.slots) {
      const sub = s.sub_id != null ? byId.get(s.sub_id) : undefined;
      if (!sub) continue;
      out.push({
        week_no: m.week_no,
        sub,
        forPlayer: s.player_id != null ? byId.get(s.player_id) ?? null : null,
        score: s.score,
      });
    }
  return out.sort((a, b) => a.week_no - b.week_no);
}

export interface SubStat {
  sub: Player;
  nights: number;
  total: number;
  average: number;
  high: number;
}

/** How each sub has done on nights they filled in (pair score for that night). Only subs with a score are listed. */
export function subStats(players: Player[], matches: MatchRow[]): SubStat[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const scores = new Map<number, number[]>();
  for (const m of matches)
    for (const s of m.slots)
      if (s.sub_id != null && s.score != null) scores.set(s.sub_id, [...(scores.get(s.sub_id) ?? []), s.score]);
  return [...scores]
    .filter(([id]) => byId.has(id))
    .map(([id, xs]) => {
      const total = xs.reduce((a, b) => a + b, 0);
      return { sub: byId.get(id)!, nights: xs.length, total, average: total / xs.length, high: Math.max(...xs) };
    })
    .sort((a, b) => b.average - a.average || b.nights - a.nights || displayName(a.sub).localeCompare(displayName(b.sub)));
}

/** "Evans, R. · 3 nights, avg 9.7" for sub pickers, so managers see how a sub has done. */
export function subLabel(p: Player, stats: Map<number, SubStat>): string {
  const st = stats.get(p.id);
  if (!st) return `${displayName(p)} · no games yet`;
  return `${displayName(p)} · ${st.nights} night${st.nights === 1 ? "" : "s"}, avg ${st.average.toFixed(1)}`;
}

/** Week whose scores are not all in yet, or the last week if all are done. */
export function currentWeek(weeks: number[], matches: MatchRow[]): number | null {
  if (!weeks.length) return null;
  for (const w of [...weeks].sort((a, b) => a - b)) {
    const ms = matches.filter((m) => m.week_no === w);
    const open = ms.some((m) => m.slots.some((s) => s.player_id != null && s.score == null));
    if (open || ms.length === 0) return w;
  }
  return Math.max(...weeks);
}

/** A pair's points for the night. Partners share one score, so take the first one entered. */
export function sideTotal(m: MatchRow, side: "A" | "B"): number | null {
  const scores = m.slots.filter((s) => s.side === side && s.score != null).map((s) => s.score!);
  return scores.length ? scores[0] : null;
}

/** Pairs with the most points in a week (the weekly contest). */
export function weekHigh(matches: MatchRow[], weekNo: number): { score: number; matchSides: string[] } | null {
  let best: number | null = null;
  let sides: string[] = [];
  for (const m of matches.filter((m) => m.week_no === weekNo))
    for (const side of ["A", "B"] as const) {
      const t = sideTotal(m, side);
      if (t == null) continue;
      if (best == null || t > best) { best = t; sides = [`${m.id}${side}`]; }
      else if (t === best) sides.push(`${m.id}${side}`);
    }
  return best == null ? null : { score: best, matchSides: sides };
}
