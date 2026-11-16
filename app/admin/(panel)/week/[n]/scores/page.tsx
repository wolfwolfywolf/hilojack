import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeague } from "@/lib/league";
import { saveTable } from "@/lib/actions";
import { displayName } from "@/lib/standings";
import { Flash, one, type SearchParams } from "@/components/Flash";
import type { MatchRow } from "@/lib/types";

const done = (m: MatchRow) => m.slots.every((s) => s.score != null);
const ADJUSTS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];

/** Phone-first score entry: one table at a time, two big number boxes, save and go to the next table. */
export default async function ScoreEntry({
  params,
  searchParams,
}: {
  params: Promise<{ n: string }>;
  searchParams: SearchParams;
}) {
  const n = Number((await params).n);
  const sp = await searchParams;
  const { players, weeks, matches } = await getLeague();
  const week = weeks.find((w) => w.week_no === n);
  if (!week) notFound();
  const ms = matches.filter((m) => m.week_no === n).sort((a, b) => a.table_no - b.table_no);
  const byId = new Map(players.map((p) => [p.id, p]));
  const subs = players.filter((p) => p.is_sub && p.active);
  const entered = ms.filter(done).length;
  const prev = weeks.find((w) => w.week_no === n - 1);
  const next = weeks.find((w) => w.week_no === n + 1);

  // Which table to show: ?t=, else the next one without scores after ?after=, else the first one without scores.
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
        {prev ? (
          <Link className="btn secondary arrow" href={`/admin/week/${prev.week_no}/scores`} aria-label={`Week ${prev.week_no}`}>‹</Link>
        ) : (
          <span className="btn secondary arrow disabled" aria-hidden>‹</span>
        )}
        <div className="week-title">
          <h1>Week {n} scores</h1>
          <div className="muted small">
            {entered} of {ms.length} tables entered
          </div>
        </div>
        {next ? (
          <Link className="btn secondary arrow" href={`/admin/week/${next.week_no}/scores`} aria-label={`Week ${next.week_no}`}>›</Link>
        ) : (
          <span className="btn secondary arrow disabled" aria-hidden>›</span>
        )}
      </div>

      <Flash msg={one(sp.msg)} err={one(sp.err)} />

      <nav className="weeks-nav tables-nav" aria-label="Tables">
        {ms.map((x) => (
          <Link
            key={x.id}
            href={`/admin/week/${n}/scores?t=${x.table_no}`}
            className={[x.id === m?.id ? "on" : "", done(x) ? "done" : ""].join(" ").trim() || undefined}
            aria-current={x.id === m?.id ? "true" : undefined}
          >
            {x.table_no}
            {done(x) ? " ✓" : ""}
          </Link>
        ))}
      </nav>

      {ms.length === 0 && <p className="muted">No tables this week. <Link href={`/admin/week/${n}`}>Set up the week</Link>.</p>}

      {!m && allDone && (
        <div className="card all-done">
          <h2 style={{ marginTop: 0 }}>All {ms.length} tables are in ✓</h2>
          <p>The standings are already updated. Tap a table number above to fix a score.</p>
          <p style={{ marginBottom: 0 }}><Link href="/">See the standings</Link></p>
        </div>
      )}

      {m && (
        <form action={saveTable} className="card table-entry" key={m.id}>
          <input type="hidden" name="week_no" value={n} />
          <input type="hidden" name="match_id" value={m.id} />
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
                    aria-label={`Points for ${seats.map((s) => displayName(byId.get(s.player_id ?? -1))).join(" and ")}`}
                  />
                </div>
              </div>
            );
          })}

          <details className="extras" open={m.slots.some((s) => s.sub_id != null || s.adjust != null)}>
            <summary>Subs and +/− penalties</summary>
            <p className="muted small">
              Pick a sub for anyone who didn&apos;t play. Use +/− for one player only, such as a no-show (−2, partner +3).
            </p>
            {m.slots.map((s) => {
              const pos = `${s.side}${s.seat}`;
              const p = s.player_id != null ? byId.get(s.player_id) : undefined;
              const adjOpts = s.adjust != null && !ADJUSTS.includes(s.adjust) ? [...ADJUSTS, s.adjust].sort((a, b) => a - b) : ADJUSTS;
              return (
                <div key={pos} className="extra-row">
                  <div className="extra-name">{p ? displayName(p) : "TBD"}</div>
                  <select name={`sub_${pos}`} defaultValue={s.sub_id ?? ""} aria-label={`Sub for ${displayName(p)}`}>
                    <option value="">No sub</option>
                    {subs.map((x) => <option key={x.id} value={x.id}>{displayName(x)}</option>)}
                  </select>
                  <select name={`adjust_${pos}`} defaultValue={s.adjust ?? ""} aria-label={`+/− for ${displayName(p)}`}>
                    <option value="">+/−</option>
                    {adjOpts.map((a) => <option key={a} value={a}>{a > 0 ? `+${a}` : `−${-a}`}</option>)}
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
        Need to move players or add a table? <Link href={`/admin/week/${n}`}>Full week editor</Link>
      </p>
    </div>
  );
}
