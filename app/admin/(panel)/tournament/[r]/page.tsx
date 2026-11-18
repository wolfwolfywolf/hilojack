import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTourney } from "@/lib/tourneyData";
import { fillRound, saveRoundSeats } from "@/lib/actions";
import { CUTS, nightOf } from "@/lib/tourney";
import { displayName } from "@/lib/standings";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Flash, one, type SearchParams } from "@/components/Flash";

const POS = ["A1", "A2", "B1", "B2"] as const;

/** Set who sits where for one tournament round. */
export default async function RoundTables({ params, searchParams }: { params: Promise<{ r: string }>; searchParams: SearchParams }) {
  const r = Number((await params).r);
  if (!Number.isInteger(r) || r < 1 || r > 7) notFound();
  const sp = await searchParams;
  const { tables, seeds, state, byId } = await loadTourney();
  const ts = tables.filter((x) => x.week_no === r).sort((a, b) => a.table_no - b.table_no);
  const hasScores = ts.some((x) => x.slots.some((s) => s.score != null));
  const order = state.seatOrder(r);
  const players = r <= 3 ? seeds.length : r === 7 ? 4 : CUTS[r - 1];
  const count = ts.length || Math.ceil(players / 4);
  const pts = (id: number) => (r > 1 && r <= 6 ? state.totalThrough(id, r - 1) : null);
  // Eligible players best first, plus anyone already seated who isn't on that list.
  const list = [...(order ?? seeds)];
  for (const x of ts) for (const s of x.slots) if (s.player_id != null && !list.includes(s.player_id)) list.push(s.player_id);
  const label = (id: number, i: number) => {
    const p = pts(id);
    return `${i < (order ?? seeds).length ? `#${i + 1} ` : ""}${displayName(byId.get(id))}${p != null ? ` · ${p} pts` : ""}`;
  };

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Round {r} tables</h1>
        <div className="row small">
          {r > 1 && <Link href={`/admin/tournament/${r - 1}`}>← Round {r - 1}</Link>}
          <Link href="/admin/tournament">Tournament</Link>
          {r < 7 && <Link href={`/admin/tournament/${r + 1}`}>Round {r + 1} →</Link>}
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Night {nightOf(r)}
        {r === 6 ? " · Semifinals" : r === 7 ? " · Final" : ""}
        {ts.length > 0 && <> · <Link href={`/admin/tournament/${r}/scores`}>Enter scores</Link></>}
      </p>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />

      {r <= 3 && (
        <form action={fillRound} className="card">
          <input type="hidden" name="round" value={r} />
          <p style={{ marginTop: 0 }}>
            Seats everyone from the final season standings, the way the league did it last season: groups of four from the top
            play groups of four from the bottom (1–4 vs 33–36, 5–8 vs 29–32, and so on), with a new partner from your group each round.
          </p>
          {hasScores ? (
            <p className="muted small" style={{ marginBottom: 0 }}>This round already has scores, so move players by hand below.</p>
          ) : ts.length > 0 ? (
            <ConfirmButton type="submit" className="secondary" message={`Replace the Round ${r} tables with the seating from the season standings?`}>
              Fill tables again from the standings
            </ConfirmButton>
          ) : (
            <button type="submit">Fill Round {r} tables from the standings</button>
          )}
        </form>
      )}

      {r === 4 && (
        <form action={fillRound} className="card">
          <input type="hidden" name="round" value={4} />
          <p style={{ marginTop: 0 }}>
            Seats the top 20 from the tournament standings after Round 3, the way the league did it last season: partners are
            next to each other in the standings, and the top pair plays the bottom pair (1&amp;2 vs 19&amp;20, 3&amp;4 vs
            17&amp;18, and so on). Ties go to the higher season seed.
          </p>
          {!order ? (
            <p className="muted small" style={{ marginBottom: 0 }}>Waiting for every Round 3 score (and any tie game at 20th place).</p>
          ) : hasScores ? (
            <p className="muted small" style={{ marginBottom: 0 }}>This round already has scores, so move players by hand below.</p>
          ) : ts.length > 0 ? (
            <ConfirmButton type="submit" className="secondary" message="Replace the Round 4 tables with the seating from the standings?">
              Fill tables again from the standings
            </ConfirmButton>
          ) : (
            <button type="submit">Fill Round 4 tables from the standings</button>
          )}
        </form>
      )}

      {r >= 5 && r <= 6 && (
        <div className="card">
          {order ? (
            <>
              <p style={{ marginTop: 0 }}>
                For now, place the {order.length} players at the tables by hand. Each list is in standings order (best first,
                ties go to the higher season seed), with points through Round {r - 1}.
              </p>
              <ol className="seed-list">
                {order.map((id) => <li key={id}>{displayName(byId.get(id))} <span className="muted small">{pts(id)}</span></li>)}
              </ol>
            </>
          ) : (
            <p style={{ margin: 0 }}>
              Waiting for every Round {r - 1} score{r - 1 >= 3 ? " (and any tie game at the cut line)" : ""}. Once those are
              in, this page shows the {players} players who move on, in standings order.
            </p>
          )}
        </div>
      )}

      {r === 7 && (
        <form action={fillRound} className="card">
          <input type="hidden" name="round" value={7} />
          <p style={{ marginTop: 0 }}>The final is the two teams that won their Round 6 semifinal, with the same partners.</p>
          {state.finalPairs ? (
            <button type="submit" disabled={hasScores}>Set the final from the Round 6 winners</button>
          ) : (
            <p className="muted small" style={{ marginBottom: 0 }}>Enter both Round 6 scores first.</p>
          )}
        </form>
      )}

      <form action={saveRoundSeats}>
        <input type="hidden" name="round" value={r} />
        <input type="hidden" name="table_count" value={count} />
        <div className="grid">
          {Array.from({ length: count }, (_, i) => {
            const t = ts[i];
            return (
              <div key={i} className="card seat-edit">
                <strong>Table {i + 1}</strong>
                {POS.map((pos, j) => {
                  const cur = t?.slots[j].player_id ?? "";
                  return (
                    <div key={pos}>
                      {j === 2 && <hr />}
                      <div className="slot">
                        <span className="pos">{pos}</span>
                        <select name={`p_${i + 1}_${pos}`} defaultValue={cur} aria-label={`Table ${i + 1} ${pos}`}>
                          <option value="">—</option>
                          {list.map((id, k) => <option key={id} value={id}>{label(id, k)}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="sticky-save row">
          <button type="submit">Save Round {r} tables</button>
        </div>
      </form>
    </div>
  );
}
