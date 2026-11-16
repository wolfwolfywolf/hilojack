import Link from "next/link";
import { cookies } from "next/headers";
import { getLeague } from "@/lib/league";
import { currentWeek, displayName, weekHigh } from "@/lib/standings";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate } from "@/components/format";
import { one, type SearchParams } from "@/components/Flash";

/** One week at a time, opening on the current week, with previous / next. */
export default async function SchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { players, weeks, matches } = await getLeague();
  const byId = new Map(players.map((p) => [p.id, p]));
  const meId = Number((await cookies()).get("hlj_me")?.value) || undefined;
  const me = meId ? byId.get(meId) : undefined;

  if (weeks.length === 0) {
    return (
      <div>
        <h1>Schedule</h1>
        <div className="card muted">The schedule hasn&apos;t been made yet.</div>
      </div>
    );
  }

  const cw = currentWeek(weeks.map((w) => w.week_no), matches) ?? weeks[0].week_no;
  const asked = Number(one(sp.week));
  const idx = Math.max(0, weeks.findIndex((w) => w.week_no === (weeks.some((x) => x.week_no === asked) ? asked : cw)));
  const week = weeks[idx];
  const prev = weeks[idx - 1];
  const next = weeks[idx + 1];
  const ms = matches.filter((m) => m.week_no === week.week_no);
  // Put my table first so I don't have to hunt for it.
  if (me) ms.sort((a, b) => Number(b.slots.some((s) => s.player_id === me.id || s.sub_id === me.id)) - Number(a.slots.some((s) => s.player_id === me.id || s.sub_id === me.id)));
  const high = weekHigh(matches, week.week_no);

  return (
    <div>
      <div className="week-head">
        {prev ? (
          <Link className="btn secondary arrow" href={`/schedule?week=${prev.week_no}`} aria-label={`Week ${prev.week_no}`}>‹</Link>
        ) : (
          <span className="btn secondary arrow disabled" aria-hidden>‹</span>
        )}
        <div className="week-title">
          <h1>Week {week.week_no}</h1>
          <div className="muted small">
            {week.play_date ? fmtDate(week.play_date) : "Date to be set"}
            {week.week_no === cw ? " · This week" : ""}
          </div>
        </div>
        {next ? (
          <Link className="btn secondary arrow" href={`/schedule?week=${next.week_no}`} aria-label={`Week ${next.week_no}`}>›</Link>
        ) : (
          <span className="btn secondary arrow disabled" aria-hidden>›</span>
        )}
      </div>

      {week.week_no !== cw && (
        <p className="small" style={{ textAlign: "center" }}>
          <Link href="/schedule">Back to this week (week {cw})</Link>
        </p>
      )}

      {week.notes && <p className="notice">{week.notes}</p>}
      {ms.length === 0 ? (
        <p className="muted">No matches this week.</p>
      ) : (
        <div className="grid">
          {ms.map((m) => (
            <MatchCard key={m.id} match={m} byId={byId} highlight={me?.id} highSides={high?.matchSides} />
          ))}
        </div>
      )}
      {me && (
        <p className="small muted">
          Your table is first and highlighted. <Link href={`/players/${me.id}`}>See all of {displayName(me)}&apos;s weeks</Link>
        </p>
      )}
    </div>
  );
}
