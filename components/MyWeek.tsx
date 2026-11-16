import Link from "next/link";
import { pickMe } from "@/lib/actions";
import { displayName } from "@/lib/standings";
import type { MatchRow, Player, WeekInfo } from "@/lib/types";
import { fmtDate } from "./format";

/** "Who am I playing this week?" card, remembered per device. */
export function MyWeek({
  me,
  players,
  weeks,
  matches,
  week,
}: {
  me: Player | undefined;
  players: Player[];
  weeks: WeekInfo[];
  matches: MatchRow[];
  week: number | null;
}) {
  const regulars = players.filter((p) => !p.is_sub && p.active);
  const byId = new Map(players.map((p) => [p.id, p]));
  const picker = (
    <form action={pickMe} className="row">
      <select name="player" defaultValue={me?.id ?? ""} aria-label="Your name">
        <option value="">Pick your name…</option>
        {regulars.map((p) => (
          <option key={p.id} value={p.id}>{displayName(p)}</option>
        ))}
      </select>
      <button type="submit" className={me ? "secondary" : undefined}>{me ? "Change" : "Show my match"}</button>
    </form>
  );

  if (!me) {
    return (
      <section className="card myweek">
        <h2 style={{ marginTop: 0 }}>Who am I playing this week?</h2>
        <p className="muted small">Pick your name once and this phone will remember it.</p>
        {picker}
      </section>
    );
  }

  const label = (pid: number | null, subId: number | null) => {
    const p = pid != null ? byId.get(pid) : undefined;
    const sub = subId != null ? byId.get(subId) : undefined;
    if (sub) return <><strong>{displayName(sub)}</strong> <span className="muted small">(sub for {displayName(p)})</span></>;
    return <strong>{displayName(p)}</strong>;
  };

  // This week and the next one with a match for me.
  const upcoming = weeks
    .filter((w) => week == null || w.week_no >= week)
    .map((w) => ({ w, m: matches.find((m) => m.week_no === w.week_no && m.slots.some((s) => s.player_id === me.id)) }))
    .filter((x) => x.m)
    .slice(0, 2);

  return (
    <section className="card myweek">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{displayName(me)}&apos;s matches</h2>
        {picker}
      </div>
      {upcoming.length === 0 && <p className="muted">No upcoming matches on the schedule.</p>}
      {upcoming.map(({ w, m }, i) => {
        const mine = m!.slots.find((s) => s.player_id === me.id)!;
        const partner = m!.slots.find((s) => s.side === mine.side && s.seat !== mine.seat)!;
        const opps = m!.slots.filter((s) => s.side !== mine.side);
        return (
          <div key={w.week_no} className={i === 0 ? "mw-main" : "mw-next"}>
            <div className="muted small">
              {i === 0 ? "This week" : "Next"} · Week {w.week_no}
              {w.play_date && ` · ${fmtDate(w.play_date)}`} · Table {m!.table_no}
            </div>
            {mine.sub_id != null && (
              <div className="warn">Your sub: {displayName(byId.get(mine.sub_id))}</div>
            )}
            <div className="mw-line">Partner: {label(partner.player_id, partner.sub_id)}</div>
            <div className="mw-line">
              Against: {label(opps[0].player_id, opps[0].sub_id)} &amp; {label(opps[1].player_id, opps[1].sub_id)}
            </div>
          </div>
        );
      })}
      <p className="small" style={{ marginBottom: 0 }}>
        <Link href={`/players/${me.id}`}>My whole season</Link>
      </p>
    </section>
  );
}
