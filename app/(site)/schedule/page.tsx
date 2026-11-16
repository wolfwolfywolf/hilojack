import Link from "next/link";
import { getLeague } from "@/lib/league";
import { displayName, weekHigh } from "@/lib/standings";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate } from "@/components/format";
import { one, type SearchParams } from "@/components/Flash";

export default async function SchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const pid = Number(one(sp.player)) || undefined;
  const { players, weeks, matches } = await getLeague();
  const byId = new Map(players.map((p) => [p.id, p]));
  const regulars = players.filter((p) => !p.is_sub && p.active);

  return (
    <div>
      <h1>Schedule</h1>
      <form className="row" method="get" style={{ marginBottom: 16 }}>
        <label htmlFor="player" style={{ margin: 0 }}>Show my matches:</label>
        <select id="player" name="player" defaultValue={pid ?? ""}>
          <option value="">Everyone</option>
          {regulars.map((p) => (
            <option key={p.id} value={p.id}>{displayName(p)}</option>
          ))}
        </select>
        <button type="submit">Go</button>
      </form>

      {weeks.length === 0 && <div className="card muted">The schedule hasn&apos;t been made yet.</div>}

      {weeks.map((w) => {
        let ms = matches.filter((m) => m.week_no === w.week_no);
        if (pid) ms = ms.filter((m) => m.slots.some((s) => s.player_id === pid || s.sub_id === pid));
        return (
          <section key={w.week_no}>
            <h2>
              <Link href={`/week/${w.week_no}`}>Week {w.week_no}</Link>
              {w.play_date && <span className="muted"> · {fmtDate(w.play_date)}</span>}
            </h2>
            {w.notes && <p className="notice">{w.notes}</p>}
            {ms.length === 0 ? (
              <p className="muted small">{pid ? "Not scheduled this week." : "No matches yet."}</p>
            ) : (
              <div className="grid">
                {ms.map((m) => (
                  <MatchCard key={m.id} match={m} byId={byId} highlight={pid} highSides={weekHigh(matches, w.week_no)?.matchSides} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
