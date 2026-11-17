import Link from "next/link";
import { cookies } from "next/headers";
import { MyWeek } from "@/components/MyWeek";
import { getLeague } from "@/lib/league";
import { computeStandings, currentWeek, displayName, subStats, weekHigh } from "@/lib/standings";
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
  const subs = subStats(players, matches);
  const high = cw != null ? weekHigh(matches, cw) : null;
  const meId = Number((await cookies()).get("hlj_me")?.value);
  const me = players.find((p) => p.id === meId);
  const hasMe = (m: (typeof matches)[number]) => me != null && m.slots.some((s) => s.player_id === me.id || s.sub_id === me.id);
  if (me) cwMatches.sort((a, b) => Number(hasMe(b)) - Number(hasMe(a)));

  // Everyone usually has the same number of weeks, so only call it out for a player who differs.
  const wkCounts = new Map<number, number>();
  for (const r of rows) wkCounts.set(r.weeksPlayed, (wkCounts.get(r.weeksPlayed) ?? 0) + 1);
  const usualWeeks = [...wkCounts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0];

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
                <th className="num">Avg</th>
                <th className="num hide-sm">High</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.player.id} className={r.player.id === me?.id ? "me-row" : undefined}>
                  <td className="num">{r.rank}</td>
                  <td>
                    <Link href={`/players/${r.player.id}`}>{displayName(r.player)}</Link>
                  </td>
                  <td className="num"><strong>{r.total}</strong></td>
                  <td className="num">
                    {fmtAvg(r.average)}
                    {r.weeksPlayed !== usualWeeks && r.weeksPlayed > 0 && (
                      <span className="wk-note">{r.weeksPlayed} {r.weeksPlayed === 1 ? "wk" : "wks"}</span>
                    )}
                  </td>
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
              <MatchCard key={m.id} match={m} byId={byId} highlight={me?.id} highSides={high?.matchSides} />
            ))}
          </div>
          <p><Link href="/schedule">Full schedule</Link></p>
        </section>
      )}

      {subs.length > 0 && (
        <section>
          <h2>Subs</h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            This list only shows subs who have already played this season. Everyone on the league&apos;s sub list is available. Use that list to contact them.
          </p>
          <div className="table-scroll card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr><th>Sub</th><th className="num">Nights</th><th className="num">Total</th><th className="num">Avg</th><th className="num">High</th></tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.sub.id} className={s.sub.id === me?.id ? "me-row" : undefined}>
                    <td><Link href={`/players/${s.sub.id}`}>{displayName(s.sub)}</Link></td>
                    <td className="num">{s.nights}</td>
                    <td className="num"><strong>{s.total}</strong></td>
                    <td className="num">{fmtAvg(s.average)}</td>
                    <td className="num">{s.high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            Each night is the score of the pair the sub played in.{" "}
            {settings.sub_credit === "scheduled"
              ? "Those points count for the player they replaced, not the sub."
              : "Those points don't count for the player they replaced."}
          </p>
        </section>
      )}
    </div>
  );
}
