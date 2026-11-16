import Link from "next/link";
import { pickMe } from "@/lib/actions";
import { displayName } from "@/lib/standings";
import type { MatchRow, OffDate, Player, WeekInfo } from "@/lib/types";
import { fmtDate, offBetween, todayLocal } from "./format";

/** "Who am I playing this week?" card, remembered per device. */
export function MyWeek({
  me,
  players,
  weeks,
  matches,
  week,
  offDates = [],
}: {
  me: Player | undefined;
  players: Player[];
  weeks: WeekInfo[];
  matches: MatchRow[];
  week: number | null;
  offDates?: OffDate[];
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

  // Only the next match for me (normally this week's). Kept to one on purpose.
  const upcoming = weeks
    .filter((w) => week == null || w.week_no >= week)
    .map((w) => ({ w, m: matches.find((m) => m.week_no === w.week_no && m.slots.some((s) => s.player_id === me.id)) }))
    .filter((x) => x.m)
    .slice(0, 1);

  return (
    <section className="card myweek">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{displayName(me)}&apos;s match</h2>
        {picker}
      </div>
      {upcoming.length === 0 && <p className="muted">No upcoming matches on the schedule.</p>}
      {upcoming.map(({ w, m }) => {
        const mine = m!.slots.find((s) => s.player_id === me.id)!;
        const partner = m!.slots.find((s) => s.side === mine.side && s.seat !== mine.seat)!;
        const opps = m!.slots.filter((s) => s.side !== mine.side);
        return (
          <div key={w.week_no} className="mw-main">
            {offBetween(offDates, addDays(todayLocal(), -1), w.play_date).map((o) => (
              <div key={o.off_date} className="off-night">
                <strong>No league {fmtDate(o.off_date)}</strong>
                {o.reason && <> · {o.reason}</>}
              </div>
            ))}
            <div className="muted small">
              {w.week_no === week ? "This week" : "Your next match"} · Week {w.week_no}
              {w.play_date && ` · ${fmtDate(w.play_date)}`}
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

function addDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}
