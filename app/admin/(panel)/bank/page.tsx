import { getBank, getLeague, getPlayoffResults } from "@/lib/league";
import { saveBank, savePlayoffResults } from "@/lib/actions";
import { displayName } from "@/lib/standings";
import {
  PLAYOFF_PLACES, bankTotals, fmtMoney, playoffPrizes, purse, seasonPrizes, weeklyWinners, type BankSettings,
} from "@/lib/bank";
import { Flash, one, type SearchParams } from "@/components/Flash";

const PRIZE_FIELDS: { key: keyof BankSettings; label: string; hint?: string }[][] = [
  [
    { key: "ante", label: "Ante per player", hint: "Paid once a season" },
    { key: "weekly_prize", label: "Weekly high pair", hint: "Split by the pair" },
  ],
  [
    { key: "season_1", label: "Season 1st" },
    { key: "season_2", label: "Season 2nd" },
    { key: "season_3", label: "Season 3rd" },
  ],
  [
    { key: "playoff_1", label: "Playoff winners", hint: "Per team" },
    { key: "playoff_2", label: "Playoff 2nd", hint: "Per team" },
    { key: "playoff_semi", label: "Semifinal teams", hint: "Each of the 2 teams" },
  ],
];

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

export default async function BankPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [{ settings, players, matches }, bank, results] = await Promise.all([getLeague(), getBank(), getPlayoffResults()]);
  const byId = new Map(players.map((p) => [p.id, p]));
  const regulars = players.filter((p) => !p.is_sub && p.active);

  const weekly = weeklyWinners(matches, bank.weekly_prize);
  const seasonDone = weekly.length >= settings.num_weeks;
  const season = seasonPrizes(players, matches, settings, bank);
  const playoffs = playoffPrizes(results, bank);
  const rows = purse(players, weekly, seasonDone ? season : null, playoffs);
  // Keep the table narrow on phones: only show Season / Playoffs once someone has won one.
  const showSeason = rows.some((r) => r.seasonCents);
  const showPlayoffs = rows.some((r) => r.playoffCents);
  const split = showSeason || showPlayoffs;
  const paid = rows.reduce((a, r) => a + r.totalCents, 0);
  const t = bankTotals(bank, regulars.length, settings.num_weeks);
  const resultFor = (place: string, seat: number) => results.find((r) => r.place === place && r.seat === seat)?.player_id;

  return (
    <div className="stack bank">
      <div>
        <h1>Bank</h1>
        <p className="muted small" style={{ margin: 0 }}>{settings.season_name} · Only managers can see this page.</p>
      </div>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />

      <div className="bank-tiles">
        <div className="card"><div className="muted small">In the bank</div><div className="big">{fmtMoney(t.collected * 100)}</div><div className="muted small">{regulars.length} players × {fmtMoney(bank.ante * 100)}</div></div>
        <div className="card"><div className="muted small">All prizes this season</div><div className="big">{fmtMoney(t.prizes * 100)}</div><div className="muted small">{settings.num_weeks} weeks × {fmtMoney(bank.weekly_prize * 100)}, plus season and playoffs</div></div>
        <div className="card"><div className="muted small">Paid out so far</div><div className="big">{fmtMoney(paid)}</div><div className="muted small">{weekly.length} of {settings.num_weeks} weeks paid</div></div>
        <div className="card"><div className="muted small">{t.left >= 0 ? "Left over at season end" : "Short at season end"}</div><div className={"big" + (t.left < 0 ? " neg" : "")}>{fmtMoney(Math.abs(t.left) * 100)}</div><div className="muted small">If every prize is paid</div></div>
      </div>

      <section>
        <h2>Player purse</h2>
        {rows.length === 0 ? (
          <div className="card muted">Nobody has won yet. The weekly prize shows up here once all of a week&rsquo;s scores are in.</div>
        ) : (
          <div className="table-scroll card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  {split && <th className="num">Weekly</th>}
                  {showSeason && <th className="num">Season</th>}
                  {showPlayoffs && <th className="num">Playoffs</th>}
                  <th className="num">{split ? "Total" : "Won"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.person.id}>
                    <td>
                      {displayName(r.person)}{r.person.is_sub && <span className="muted small"> (sub)</span>}
                      {r.weeks.length > 0 && <div className="muted small">Week{r.weeks.length > 1 ? "s" : ""} {r.weeks.join(", ")}</div>}
                    </td>
                    {split && <td className="num">{r.weeklyCents ? fmtMoney(r.weeklyCents) : "–"}</td>}
                    {showSeason && <td className="num">{r.seasonCents ? fmtMoney(r.seasonCents) : "–"}</td>}
                    {showPlayoffs && <td className="num">{r.playoffCents ? fmtMoney(r.playoffCents) : "–"}</td>}
                    <td className="num"><strong>{fmtMoney(r.totalCents)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!seasonDone && season.length > 0 && (
          <p className="muted small">
            Season prizes are added once all {settings.num_weeks} weeks are scored. If the season ended today:{" "}
            {season.map((s) => `${displayName(byId.get(s.player_id))} ${ordinal(s.place)}${s.tied ? " (tie)" : ""} ${fmtMoney(s.cents)}`).join(" · ")}
          </p>
        )}
      </section>

      {weekly.length > 0 && (
        <details className="card">
          <summary><strong>Weekly winners</strong> <span className="muted small">({weekly.length} weeks)</span></summary>
          <div className="table-scroll" style={{ marginTop: 10 }}>
            <table>
              <thead><tr><th className="num">Wk</th><th className="num">Score</th><th>Won by</th></tr></thead>
              <tbody>
                {weekly.map((w) => (
                  <tr key={w.week_no}>
                    <td className="num">{w.week_no}</td>
                    <td className="num">{w.score}</td>
                    <td style={{ whiteSpace: "normal" }}>
                      {w.payees.map((p, i) => (
                        <span key={i}>
                          {i > 0 && ", "}
                          {displayName(byId.get(p.person_id))}
                          {p.for_player_id != null && <span className="muted small"> (sub for {displayName(byId.get(p.for_player_id))})</span>}
                          {" "}{fmtMoney(p.cents)}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>Ties split the prize evenly. If a sub played, the sub is paid. A no-show&rsquo;s partner gets the pair&rsquo;s share.</p>
        </details>
      )}

      <form action={saveBank} className="card">
        <h2 style={{ marginTop: 0 }}>Prize amounts</h2>
        {PRIZE_FIELDS.map((group, gi) => (
          <div className="money-row" key={gi}>
            {group.map((f) => (
              <div className="field" key={f.key}>
                <label htmlFor={f.key}>{f.label}</label>
                <div className="money"><span>$</span><input id={f.key} name={f.key} type="number" min={0} step={1} inputMode="numeric" defaultValue={bank[f.key]} /></div>
                {f.hint && <div className="muted small">{f.hint}</div>}
              </div>
            ))}
          </div>
        ))}
        <button type="submit">Save amounts</button>
      </form>

      <form action={savePlayoffResults} className="card">
        <h2 style={{ marginTop: 0 }}>Playoff results</h2>
        <p className="muted small" style={{ marginTop: 0 }}>Fill this in after the tournament. Each team&rsquo;s prize is split between the two partners.</p>
        {PLAYOFF_PLACES.map(({ key, label }) => (
          <div className="field" key={key}>
            <label>{label}</label>
            <div className="row">
              {[1, 2].map((seat) => (
                <select key={seat} name={`${key}_${seat}`} defaultValue={resultFor(key, seat) ?? ""} aria-label={`${label} player ${seat}`} style={{ flex: 1, minWidth: 0 }}>
                  <option value="">Pick a player</option>
                  {regulars.map((p) => <option key={p.id} value={p.id}>{displayName(p)}</option>)}
                </select>
              ))}
            </div>
          </div>
        ))}
        <button type="submit">Save playoff results</button>
      </form>
    </div>
  );
}
