import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTourney } from "@/lib/tourneyData";
import { saveTourneyTable } from "@/lib/actions";
import { gamesIn } from "@/lib/tourney";
import { displayName, sideTotal } from "@/lib/standings";
import { Flash, one, type SearchParams } from "@/components/Flash";
import type { MatchRow } from "@/lib/types";

const done = (m: MatchRow) => sideTotal(m, "A") != null && sideTotal(m, "B") != null;

/** Phone-first score entry for one tournament round, one table at a time (same as weekly scores). */
export default async function TourneyScores({ params, searchParams }: { params: Promise<{ r: string }>; searchParams: SearchParams }) {
  const r = Number((await params).r);
  if (!Number.isInteger(r) || r < 1 || r > 7) notFound();
  const sp = await searchParams;
  const { players, tables, state, byId } = await loadTourney();
  const ms = tables.filter((x) => x.week_no === r).sort((a, b) => a.table_no - b.table_no);
  const entered = ms.filter(done).length;
  // Subs: the sub list, plus league players already knocked out (they may sub in the tournament).
  const out = new Set(state.rows.filter((x) => x.outAfter != null).map((x) => x.playerId));
  const subs = players
    .filter((p) => (p.is_sub && p.active) || out.has(p.id))
    .sort((a, b) => Number(a.is_sub) - Number(b.is_sub) || displayName(a).localeCompare(displayName(b)));

  const t = Number(one(sp.t));
  const after = Number(one(sp.after));
  let m: MatchRow | undefined = ms.find((x) => x.table_no === t);
  if (!m) {
    const open = ms.filter((x) => !done(x));
    m = (Number.isFinite(after) ? open.find((x) => x.table_no > after) : undefined) ?? open[0];
  }
  const allDone = ms.length > 0 && entered === ms.length;

  return (
    <div className="score-entry">
      <div className="week-head">
        {r > 1 ? (
          <Link className="btn secondary arrow" href={`/admin/tournament/${r - 1}/scores`} aria-label={`Round ${r - 1}`}>‹</Link>
        ) : (
          <span className="btn secondary arrow disabled" aria-hidden>‹</span>
        )}
        <div className="week-title">
          <h1>Round {r} scores</h1>
          <div className="muted small">
            {entered} of {ms.length} tables entered · {gamesIn(r)} games
          </div>
        </div>
        {r < 7 ? (
          <Link className="btn secondary arrow" href={`/admin/tournament/${r + 1}/scores`} aria-label={`Round ${r + 1}`}>›</Link>
        ) : (
          <span className="btn secondary arrow disabled" aria-hidden>›</span>
        )}
      </div>

      <Flash msg={one(sp.msg)} err={one(sp.err)} />

      <nav className="weeks-nav tables-nav" aria-label="Tables">
        {ms.map((x) => (
          <Link
            key={x.id}
            href={`/admin/tournament/${r}/scores?t=${x.table_no}`}
            className={[x.id === m?.id ? "on" : "", done(x) ? "done" : ""].join(" ").trim() || undefined}
            aria-current={x.id === m?.id ? "true" : undefined}
          >
            {x.table_no}
            {done(x) ? " ✓" : ""}
          </Link>
        ))}
      </nav>

      {ms.length === 0 && <p className="muted">No tables yet. <Link href={`/admin/tournament/${r}`}>Set the Round {r} tables</Link>.</p>}

      {!m && allDone && (
        <div className="card all-done">
          <h2 style={{ marginTop: 0 }}>All {ms.length} tables are in ✓</h2>
          <p>The tournament standings are already updated. Tap a table number above to fix a score.</p>
          <p style={{ marginBottom: 0 }}>
            {r < 7 ? <Link href={`/admin/tournament/${r + 1}`}>Set the Round {r + 1} tables</Link> : <Link href="/playoffs">See the results</Link>}
            {" · "}
            <Link href="/admin/tournament">Tournament</Link>
          </p>
        </div>
      )}

      {m && (
        <form action={saveTourneyTable} className="card table-entry" key={m.id}>
          <input type="hidden" name="round" value={r} />
          <input type="hidden" name="table_id" value={m.id} />
          <input type="hidden" name="table_no" value={m.table_no} />
          <h2>Table {m.table_no}</h2>
          {(["A", "B"] as const).map((side, i) => {
            const seats = m!.slots.filter((s) => s.side === side);
            const score = seats[0].score ?? seats[1].score;
            return (
              <div key={side}>
                {i === 1 && <div className="vs">vs</div>}
                <div className="pair">
                  <label className="pair-names" htmlFor={`score_${side}`}>
                    {seats.map((s) => {
                      const p = s.player_id != null ? byId.get(s.player_id) : undefined;
                      const sub = s.sub_id != null ? byId.get(s.sub_id) : undefined;
                      return (
                        <span key={s.seat} className="pn">
                          {p ? displayName(p) : "TBD"}
                          {sub && <span className="sub"> (sub: {displayName(sub)})</span>}
                        </span>
                      );
                    })}
                  </label>
                  <input
                    id={`score_${side}`}
                    name={`score_${side}`}
                    className="big-num"
                    defaultValue={score ?? ""}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    enterKeyHint={side === "A" ? "next" : "done"}
                    autoComplete="off"
                    placeholder="pts"
                  />
                </div>
              </div>
            );
          })}

          <details className="extras" open={m.slots.some((s) => s.sub_id != null)}>
            <summary>Subs</summary>
            <p className="muted small">Pick a sub for anyone who didn&apos;t play. The player they sat in for gets the points.</p>
            {m.slots.map((s) => {
              const pos = `${s.side}${s.seat}`;
              const p = s.player_id != null ? byId.get(s.player_id) : undefined;
              return (
                <div key={pos} className="extra-row">
                  <div className="extra-name">{p ? displayName(p) : "TBD"}</div>
                  <select name={`sub_${pos}`} defaultValue={s.sub_id ?? ""} aria-label={`Sub for ${displayName(p)}`} style={{ gridColumn: "1 / -1" }}>
                    <option value="">No sub</option>
                    {subs.map((x) => <option key={x.id} value={x.id}>{displayName(x)}{x.is_sub ? "" : " (out of tournament)"}</option>)}
                  </select>
                </div>
              );
            })}
          </details>

          <button type="submit" className="big-save">
            Save table {m.table_no}
            {ms.some((x) => x.id !== m!.id && !done(x)) ? " and go to next" : ""}
          </button>
        </form>
      )}

      <p className="small muted" style={{ marginTop: 16 }}>
        Need to move players? <Link href={`/admin/tournament/${r}`}>Round {r} tables</Link>
      </p>
    </div>
  );
}
