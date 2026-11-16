import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeague } from "@/lib/league";
import { computeStandings, creditedScores, displayName } from "@/lib/standings";
import { fmtAvg, fmtDate } from "@/components/format";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const { settings, players, weeks, matches } = await getLeague();
  const byId = new Map(players.map((p) => [p.id, p]));
  const player = byId.get(id);
  if (!player) notFound();
  const standing = computeStandings(players, matches, settings).find((r) => r.player.id === id);
  const credited = creditedScores(matches, settings.sub_credit).get(id);
  const name = (pid: number | null) => (pid != null ? byId.get(pid) : undefined);

  const rows = weeks.map((w) => {
    const m = matches.find(
      (m) => m.week_no === w.week_no && m.slots.some((s) => s.player_id === id || s.sub_id === id),
    );
    if (!m) return { w, m: null as null };
    const me = m.slots.find((s) => s.player_id === id || s.sub_id === id)!;
    const partner = m.slots.find((s) => s.side === me.side && s.seat !== me.seat)!;
    const opps = m.slots.filter((s) => s.side !== me.side);
    return { w, m, me, partner, opps, subbing: me.sub_id === id && me.player_id !== id };
  });

  const who = (s: { player_id: number | null; sub_id: number | null }) => {
    const p = name(s.sub_id ?? s.player_id);
    return p ? <Link href={`/players/${p.id}`}>{displayName(p)}</Link> : <span className="muted">TBD</span>;
  };

  return (
    <div className="stack">
      <div>
        <h1>{displayName(player)}</h1>
        {standing ? (
          <p className="muted" style={{ margin: 0 }}>
            Rank {standing.rank} · Total {standing.total} · {standing.weeksPlayed} weeks · Avg{" "}
            {fmtAvg(standing.average)} · High {standing.high ?? "–"}
          </p>
        ) : (
          player.is_sub && <p className="muted" style={{ margin: 0 }}>Sub</p>
        )}
      </div>
      <div className="table-scroll card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th className="num">Wk</th>
              <th>Date</th>
              <th>Table</th>
              <th>Partner</th>
              <th>Opponents</th>
              <th className="num">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              r.m ? (
                <tr key={r.w.week_no}>
                  <td className="num"><Link href={`/week/${r.w.week_no}`}>{r.w.week_no}</Link></td>
                  <td>{fmtDate(r.w.play_date, { short: true })}</td>
                  <td>{r.m.table_no}</td>
                  <td>{who(r.partner!)}</td>
                  <td>{who(r.opps![0])} &amp; {who(r.opps![1])}</td>
                  <td className="num">
                    {r.subbing
                      ? <span title="Played as a sub">{r.me!.score ?? "–"}*</span>
                      : r.me!.sub_id != null
                        ? <span title={`Sub: ${displayName(name(r.me!.sub_id))}`}>
                            {credited?.get(r.w.week_no) ?? "–"} <span className="muted small">(sub)</span>
                          </span>
                        : r.me!.score ?? "–"}
                  </td>
                </tr>
              ) : (
                <tr key={r.w.week_no}>
                  <td className="num">{r.w.week_no}</td>
                  <td>{fmtDate(r.w.play_date, { short: true })}</td>
                  <td colSpan={4} className="muted">Not scheduled</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        <Link href={`/schedule?player=${id}`}>Show on the schedule</Link>
      </p>
    </div>
  );
}
