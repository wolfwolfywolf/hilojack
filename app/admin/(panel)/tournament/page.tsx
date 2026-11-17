import Link from "next/link";
import { loadTourney } from "@/lib/tourneyData";
import { saveTieWinners, saveTourneyDates, setTourneyLive } from "@/lib/actions";
import { CUTS, ROUNDS, nightOf, roundComplete } from "@/lib/tourney";
import { displayName, sideTotal } from "@/lib/standings";
import { Flash, one, type SearchParams } from "@/components/Flash";

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** Managers' home for the year-end tournament: who can see it, dates, each round, and the cuts. */
export default async function TournamentAdmin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { settings, tables, ties, seeds, state, byId } = await loadTourney();
  const name = (id: number) => displayName(byId.get(id));

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div>
        <h1>Tournament</h1>
        <p className="muted small" style={{ margin: 0 }}>
          Set each round&apos;s tables, enter scores, and the standings and cuts work themselves out.{" "}
          <Link href="/playoffs">See the Playoffs page</Link>
        </p>
      </div>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />

      {state.cuts.filter((c) => c.tie).map((c) => {
        const tie = c.tie!;
        const chosen = ties.filter((w) => w.cut_after === c.after).map((w) => w.player_id);
        return (
          <form action={saveTieWinners} className="card" key={c.after} style={{ borderColor: "var(--err)" }}>
            <input type="hidden" name="cut_after" value={c.after} />
            <h2 style={{ marginTop: 0 }}>Tie for {ordinal(tie.place)} place after Round {c.after}</h2>
            <p>
              These players have the same points and there {tie.spots === 1 ? "is 1 spot" : `are ${tie.spots} spots`} left
              in the top {CUTS[c.after]}. They play a single head-to-head playoff game. Tick{" "}
              {tie.spots === 1 ? "the winner" : `the ${tie.spots} players who move on`}.
            </p>
            <div className="tie-pick">
              {tie.players.map((id) => (
                <label key={id}>
                  <input type="checkbox" name="winner" value={id} defaultChecked={chosen.includes(id)} />
                  {name(id)} <span className="muted small">({state.totalThrough(id, c.after)} pts)</span>
                </label>
              ))}
            </div>
            <button type="submit" style={{ marginTop: 10 }}>Save playoff game result</button>
          </form>
        );
      })}

      <form action={setTourneyLive} className="card">
        <h2 style={{ marginTop: 0 }}>What players see</h2>
        {settings.tourney_live ? (
          <>
            <p>Players can see the tournament tables and standings on the Playoffs page.</p>
            <input type="hidden" name="live" value="0" />
            <button type="submit" className="secondary">Hide it again (show &quot;To be determined&quot;)</button>
          </>
        ) : (
          <>
            <p>Players see <strong>&quot;To be determined&quot;</strong> and the rules. Managers already see the full page, so you can check it first.</p>
            <input type="hidden" name="live" value="1" />
            <button type="submit">Show the tournament to players</button>
          </>
        )}
      </form>

      <form action={saveTourneyDates} className="card">
        <h2 style={{ marginTop: 0 }}>Dates</h2>
        <p className="muted small">Leave a date empty to show &quot;Date TBD&quot;.</p>
        {["Night 1 · Rounds 1–3", "Night 2 · Rounds 4–5", "Night 3 · Rounds 6–7"].map((label, i) => (
          <div className="field" key={i}>
            <label htmlFor={`date${i + 1}`}>{label}</label>
            <input id={`date${i + 1}`} type="date" name={`date${i + 1}`} defaultValue={settings.tourney_dates[i] ?? ""} />
          </div>
        ))}
        <button type="submit">Save dates</button>
      </form>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Rounds</h2>
        <ul className="rounds-list">
          {ROUNDS.map((r) => {
            const ts = tables.filter((x) => x.week_no === r);
            const scored = ts.filter((x) => sideTotal(x, "A") != null && sideTotal(x, "B") != null).length;
            const cut = state.cuts.find((c) => c.after === r);
            return (
              <li key={r}>
                <div>
                  <strong>Round {r}</strong>
                  <span className="muted small"> · Night {nightOf(r)}{r === 6 ? " · Semifinals" : r === 7 ? " · Final" : ""}</span>
                  <div className="small muted">
                    {ts.length === 0
                      ? "Tables not set"
                      : roundComplete(tables, r)
                        ? `All ${ts.length} tables scored ✓`
                        : `${scored} of ${ts.length} tables scored`}
                    {cut && ` · then top ${cut.size} move on`}
                  </div>
                </div>
                <div className="r-actions">
                  <Link href={`/admin/tournament/${r}`} className="btn secondary">Tables</Link>
                  {ts.length > 0 && <Link href={`/admin/tournament/${r}/scores`} className="btn">Scores</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {state.cuts.some((c) => c.advancing) && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Cuts</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {state.cuts.filter((c) => c.advancing).map((c) => (
              <li key={c.after}>
                After Round {c.after}: {c.advancing!.length} move on
                {ties.some((w) => w.cut_after === c.after) && " (after a playoff game)"}.
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="card">
        <summary><strong>Seeding from the season standings ({seeds.length} players)</strong></summary>
        <p className="muted small">
          Rounds 1–3 use this order. Ties on season points go to whoever had more points the week before the final week.
        </p>
        <ol className="seed-list">
          {seeds.map((id) => <li key={id}>{name(id)}</li>)}
        </ol>
      </details>
    </div>
  );
}
