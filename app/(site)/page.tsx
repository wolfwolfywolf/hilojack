import Link from "next/link";
import { cookies } from "next/headers";
import { MyWeek } from "@/components/MyWeek";
import { getLeague } from "@/lib/league";
import { computeStandings, currentWeek, displayName, subAppearances, weekHigh } from "@/lib/standings";
import { MatchCard } from "@/components/MatchCard";
import { fmtAvg, fmtDate, allOffDates } from "@/components/format";

export default async function StandingsPage() {
  const { settings, players, weeks, matches, offDates } = await getLeague();
  const rows = computeStandings(players, matches, settings);
  const byId = new Map(players.map((p) => [p.id, p]));
  const cw = currentWeek(weeks.map((w) => w.week_no), matches);
  const cwInfo = weeks.find((w) => w.week_no === cw);
  const cwMatches = matches.filter((m) => m.week_no === cw);
  const weeksScored = new Set(
    matches.filter((m) => m.slots.some((s) => s.score != null)).map((m) => m.week_no),
  ).size;
  const subs = subAppearances(players, matches);
  const high = cw != null ? weekHigh(matches, cw) : null;
  const meId = Number((await cookies()).get("hlj_me")?.value);
  const me = players.find((p) => p.id === meId);

  return (
    <div className="stack">
      <div>
        <h1>Standings</h1>
        <p className="muted small" style={{ margin: 0 }}>
          {settings.season_name}
          {weeks.length > 0 && ` · ${weeksScored} of ${settings.num_weeks} weeks scored`}
        </p>
      </div>

      {settings.announcement && <div className="notice">{settings.announcement}</div>}

      {weeks.length > 0 && <MyWeek me={me} players={players} weeks={weeks} matches={matches} week={cw} offDates={allOffDates(weeks, offDates)} />}

      {rows.length === 0 ? (
        <div className="card muted">No players yet. A league manager can add them on the admin pages.</div>
      ) : (
        <div className="table-scroll card" style={{ padding: 0 }}>
          <table className="standings">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Player</th>
                <th className="num">Total</th>
                <th className="num">Wks</th>
                <th className="num">Avg</th>
                <th className="num hide-sm">High</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.player.id}>
                  <td className="num">{r.rank}</td>
                  <td>
                    <Link href={`/players/${r.player.id}`}>{displayName(r.player)}</Link>
                  </td>
                  <td className="num"><strong>{r.total}</strong></td>
                  <td className="num">{r.weeksPlayed}</td>
                  <td className="num">{fmtAvg(r.average)}</td>
                  <td className="num hide-sm">{r.high ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cw != null && cwMatches.length > 0 && (
        <section>
          <h2>
            Week {cw}
            {cwInfo?.play_date && <span className="muted"> · {fmtDate(cwInfo.play_date)}</span>}
          </h2>
          {cwInfo?.notes && <p className="notice">{cwInfo.notes}</p>}
          <div className="grid">
            {cwMatches.map((m) => (
              <MatchCard key={m.id} match={m} byId={byId} highSides={high?.matchSides} />
            ))}
          </div>
          <p><Link href="/schedule">Full schedule</Link></p>
        </section>
      )}

      {subs.length > 0 && (
        <section>
          <h2>Sub appearances</h2>
          <div className="table-scroll card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr><th className="num">Wk</th><th>Sub</th><th>Played for</th><th className="num">Score</th></tr>
              </thead>
              <tbody>
                {subs.map((s, i) => (
                  <tr key={i}>
                    <td className="num">{s.week_no}</td>
                    <td>{displayName(s.sub)}</td>
                    <td>{displayName(s.forPlayer)}</td>
                    <td className="num">{s.score ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            {settings.sub_credit === "scheduled"
              ? "A sub's score counts for the player they replaced."
              : "A sub's score does not count for the player they replaced."}
          </p>
        </section>
      )}
    </div>
  );
}
