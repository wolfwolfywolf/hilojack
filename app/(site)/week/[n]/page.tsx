import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeague } from "@/lib/league";
import { weekHigh } from "@/lib/standings";
import { MatchCard } from "@/components/MatchCard";
import { fmtDate } from "@/components/format";

export default async function WeekPage({ params }: { params: Promise<{ n: string }> }) {
  const n = Number((await params).n);
  const { players, weeks, matches } = await getLeague();
  const week = weeks.find((w) => w.week_no === n);
  if (!week) notFound();
  const byId = new Map(players.map((p) => [p.id, p]));
  const ms = matches.filter((m) => m.week_no === n);
  const high = weekHigh(matches, n);

  return (
    <div>
      <h1>
        Week {n}
        {week.play_date && <span className="muted"> · {fmtDate(week.play_date)}</span>}
      </h1>
      <nav className="weeks-nav" aria-label="Weeks">
        {weeks.map((w) => (
          <Link key={w.week_no} href={`/week/${w.week_no}`} className={w.week_no === n ? "on" : undefined}>
            {w.week_no}
          </Link>
        ))}
      </nav>
      {week.notes && <p className="notice">{week.notes}</p>}
      {ms.length === 0 ? (
        <p className="muted">No matches this week.</p>
      ) : (
        <div className="grid">
          {ms.map((m) => (
            <MatchCard key={m.id} match={m} byId={byId} highSides={high?.matchSides} />
          ))}
        </div>
      )}
    </div>
  );
}
