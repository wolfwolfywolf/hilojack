import Link from "next/link";
import { cookies } from "next/headers";
import { isAdminViewer } from "@/components/SiteHeader";
import { MatchCard } from "@/components/MatchCard";
import { TourneyRules } from "@/components/TourneyRules";
import { Flash, one, type SearchParams } from "@/components/Flash";
import { fmtDate } from "@/components/format";
import { loadTourney } from "@/lib/tourneyData";
import { ROUNDS, gamesIn, nightOf, roundComplete, type TourneyRow } from "@/lib/tourney";
import { displayName } from "@/lib/standings";

const status = (r: TourneyRow) =>
  r.place ?? (r.inTieGame ? "Tie game" : r.outAfter != null ? `Out after Round ${r.outAfter}` : "");

/**
 * Year-end tournament. Players see "To be determined" and the rules until a manager turns the tournament on;
 * managers always see the live view so they can check it first.
 */
export default async function PlayoffsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [t, admin, jar] = await Promise.all([loadTourney(), isAdminViewer(), cookies()]);
  const { settings, tables, state, byId } = t;
  const dates = settings.tourney_dates;
  const show = settings.tourney_live || admin;

  const intro = (
    <div>
      <h1>Year-End Tournament</h1>
      <p className="muted" style={{ margin: 0 }}>
        7 rounds over 3 nights. Players drop out after each night. Standings are individual: both partners get the
        team&apos;s points.
      </p>
    </div>
  );

  if (!show)
    return (
      <div className="stack playoffs">
        {intro}
        <div className="card">
          <strong>Matchups: to be determined</strong>
          <p className="muted small" style={{ marginBottom: 0 }}>Partners and tables will be posted here once they are set.</p>
        </div>
        <TourneyRules dates={dates} />
      </div>
    );

  const meId = Number(jar.get("hlj_me")?.value) || undefined;
  const seated = ROUNDS.filter((r) => tables.some((x) => x.week_no === r));
  const asked = Number(one(sp.r));
  const round = seated.includes(asked as never)
    ? asked
    : seated.find((r) => !roundComplete(tables, r)) ?? seated[seated.length - 1];
  const roundTables = tables.filter((x) => x.week_no === round).sort((a, b) => a.table_no - b.table_no);
  if (meId) roundTables.sort((a, b) => Number(b.slots.some((s) => s.player_id === meId || s.sub_id === meId)) - Number(a.slots.some((s) => s.player_id === meId || s.sub_id === meId)));
  const anyScores = tables.some((x) => x.slots.some((s) => s.score != null));
  const rows = state.rows;
  const placed = (p: string) => rows.filter((r) => r.place === p).map((r) => displayName(byId.get(r.playerId)));
  const champs = placed("Champions");

  return (
    <div className="stack playoffs">
      {intro}
      <Flash msg={one(sp.msg)} err={one(sp.err)} />
      {!settings.tourney_live && (
        <div className="notice">
          Managers&apos; preview. Players still see &quot;To be determined&quot;. Turn the tournament on from{" "}
          <Link href="/admin/tournament">Tournament</Link> when it&apos;s ready.
        </div>
      )}

      {champs.length > 0 && (
        <div className="card myweek">
          <div className="small muted">Tournament Champions</div>
          <div className="mw-line" style={{ fontSize: "1.25rem", fontWeight: 700 }}>🏆 {champs.join(" & ")}</div>
          <div className="small" style={{ marginTop: 6 }}>
            2nd place: {placed("2nd place").join(" & ")} · 3rd place: {placed("3rd place").join(", ")}
          </div>
        </div>
      )}

      {seated.length === 0 ? (
        <div className="card">
          <strong>Tables: to be determined</strong>
          <p className="muted small" style={{ marginBottom: 0 }}>Partners and tables will be posted here once they are set.</p>
        </div>
      ) : (
        <section>
          {seated.length > 1 && (
            <nav className="weeks-nav" aria-label="Rounds">
              {seated.map((r) => (
                <Link key={r} href={`/playoffs?r=${r}`} className={r === round ? "on" : undefined} aria-current={r === round ? "true" : undefined}>
                  Round {r}
                </Link>
              ))}
            </nav>
          )}
          <h2>
            Round {round}
            {round === 6 && " · Semifinals"}
            {round === 7 && " · Final"}
            <span className="muted"> · {dates[nightOf(round) - 1] ? fmtDate(dates[nightOf(round) - 1]) : `Night ${nightOf(round)}`}</span>
          </h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            {gamesIn(round)} games to 11{round <= 3 ? ", no bonus point" : ", bonus point for winning 4 or more"}.
          </p>
          <div className="grid">
            {roundTables.map((m) => (
              <MatchCard key={m.id} match={m} byId={byId} highlight={meId} />
            ))}
          </div>
        </section>
      )}

      {anyScores && (
        <section>
          <h2>Tournament standings</h2>
          <div className="table-scroll card" style={{ padding: 0 }}>
            <table className="standings">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Player</th>
                  <th className="num">Pts</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const p = byId.get(r.playerId);
                  const prev = rows[i - 1];
                  const same = prev && prev.total === r.total && prev.outAfter === r.outAfter && prev.place === r.place;
                  return (
                    <tr key={r.playerId} className={r.playerId === meId ? "me-row" : r.outAfter != null ? "out-row" : undefined}>
                      <td className="num">{same ? "" : i + 1}</td>
                      <td>{p ? <Link href={`/players/${p.id}`}>{displayName(p)}</Link> : "?"}</td>
                      <td className="num"><strong>{r.total}</strong></td>
                      <td className="small muted">{status(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <details className="card">
        <summary><strong>Tournament rules and prizes</strong></summary>
        <div className="stack" style={{ marginTop: 12 }}>
          <TourneyRules dates={dates} />
        </div>
      </details>
    </div>
  );
}
