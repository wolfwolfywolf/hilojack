import Link from "next/link";
import { displayName } from "@/lib/standings";
import type { MatchRow, OffDate, Player, WeekInfo } from "@/lib/types";
import { addDays, fmtDate, offBetween, todayLocal } from "./format";

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
  const byId = new Map(players.map((p) => [p.id, p]));
  if (!me) {
    return (
      <section className="card myweek">
        <h2 style={{ marginTop: 0 }}>Who am I playing this week?</h2>
        <p className="muted small">Pick your name once and this phone will remember it. You can switch it any time from your name at the top.</p>
        <Link href="/me" className="btn">Pick your name</Link>
      </section>
    );
  }

  const label = (pid: number | null, subId: number | null) => {
    const p = pid != null ? byId.get(pid) : undefined;
    const sub = subId != null ? byId.get(subId) : undefined;
    if (sub) return <><strong>{displayName(sub)}</strong> <span className="muted small">(sub for {displayName(p)})</span></>;
    return <strong>{displayName(p)}</strong>;
  };

  // Only the next match for me, kept to one on purpose. Go by the calendar when weeks have dates.
  const today = todayLocal();
  const dated = weeks.some((w) => w.play_date);
  const upcoming = weeks
    .filter((w) => (dated ? !!w.play_date && w.play_date >= today : week == null || w.week_no >= week))
    .map((w) => ({ w, m: matches.find((m) => m.week_no === w.week_no && m.slots.some((s) => s.player_id === me.id)) }))
    .filter((x) => x.m)
    .slice(0, 1);
  const weekEnd = addDays(today, 6);
  const next = upcoming[0]?.w;
  // A night off in the next 7 days, before my next game: "No cards this week".
  const offNow = offDates.find((o) => o.off_date >= today && o.off_date <= weekEnd && (!next?.play_date || o.off_date < next.play_date));
  const isThisWeek = (d: string | null) => (dated ? !!d && d <= weekEnd : true);

  return (
    <section className="card myweek">
      <h2 style={{ margin: 0 }}>{displayName(me)}&apos;s match</h2>
      {upcoming.length === 0 && <p className="muted">No upcoming matches on the schedule.</p>}
      {upcoming.map(({ w, m }) => {
        const mine = m!.slots.find((s) => s.player_id === me.id)!;
        const partner = m!.slots.find((s) => s.side === mine.side && s.seat !== mine.seat)!;
        const opps = m!.slots.filter((s) => s.side !== mine.side);
        return (
          <div key={w.week_no} className="mw-main">
            {offNow && (
              <div className="no-cards">
                <div className="nc-title">No cards this week</div>
                <div className="small">{fmtDate(offNow.off_date)}{offNow.reason ? ` · ${offNow.reason}` : ""}</div>
              </div>
            )}
            {offBetween(offDates.filter((o) => o !== offNow), addDays(today, -1), w.play_date).map((o) => (
              <div key={o.off_date} className="off-night">
                <strong>No league {fmtDate(o.off_date)}</strong>
                {o.reason && <> · {o.reason}</>}
              </div>
            ))}
            <div className="muted small">
              {offNow ? "Next game" : isThisWeek(w.play_date) ? "This week" : "Your next match"} · Week {w.week_no}
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

