import type { MatchRow, Player, Settings, StandingRow, SubAppearance } from "./types";

export function displayName(p: Pick<Player, "last_name" | "first_initial"> | null | undefined) {
  if (!p) return "TBD";
  const init = p.first_initial.trim();
  return init ? `${p.last_name}, ${init.charAt(0).toUpperCase()}.` : p.last_name;
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
      // With sub_credit "none" an absent player keeps only their own adjustment.
      const counts = s.score != null && !(s.sub_id != null && subCredit === "none");
      if (!counts && s.adjust == null) continue;
      const earned = counts ? s.score! : 0;
      const byWeek = out.get(s.player_id) ?? new Map<number, number>();
      byWeek.set(m.week_no, (byWeek.get(m.week_no) ?? 0) + earned + (s.adjust ?? 0));
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
