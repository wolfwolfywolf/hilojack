import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeague } from "@/lib/league";
import { addMatch, deleteMatch, saveWeek } from "@/lib/actions";
import { displayName, subLabel, subStats } from "@/lib/standings";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Flash, one, type SearchParams } from "@/components/Flash";

export default async function WeekAdmin({
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
  const ms = matches.filter((m) => m.week_no === n);
  const regulars = players.filter((p) => !p.is_sub);
  const subs = players.filter((p) => p.is_sub && p.active);
  const subStatById = new Map(subStats(players, matches).map((s) => [s.sub.id, s]));

  // Warnings: someone scheduled twice, or an active player missing this week.
  const counts = new Map<number, number>();
  for (const m of ms) for (const s of m.slots) if (s.player_id != null) counts.set(s.player_id, (counts.get(s.player_id) ?? 0) + 1);
  const byId = new Map(players.map((p) => [p.id, p]));
  const doubled = [...counts].filter(([, c]) => c > 1).map(([id]) => displayName(byId.get(id)));
  const missing = regulars.filter((p) => p.active && !counts.has(p.id)).map((p) => displayName(p));
  const prev = weeks.find((w) => w.week_no === n - 1);
  const next = weeks.find((w) => w.week_no === n + 1);

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Week {n}</h1>
        <div className="row small">
          {prev && <Link href={`/admin/week/${prev.week_no}`}>← Week {prev.week_no}</Link>}
          <Link href="/admin/schedule">All weeks</Link>
          {next && <Link href={`/admin/week/${next.week_no}`}>Week {next.week_no} →</Link>}
        </div>
      </div>
      <p className="muted small">
        Change who sits where, pick a sub for anyone who can&apos;t make it, and type in each pair&apos;s points for the night
        (both partners get the same points). Then press Save. Leave points blank until the match is played.
        Use +/− for one player only, such as a no-show (−2, partner +3) or leaving early.
      </p>
      <p><Link href={`/admin/week/${n}/scores`} className="btn">Enter scores one table at a time</Link></p>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />
      {doubled.length > 0 && <p className="warn">Scheduled more than once: {doubled.join(", ")}</p>}
      {missing.length > 0 && <p className="warn">Not scheduled this week: {missing.join(", ")}</p>}

      <form action={saveWeek} id="week-form">
        <input type="hidden" name="week_no" value={n} />
        <div className="row" style={{ marginBottom: 16, alignItems: "flex-end" }}>
          <div>
            <label htmlFor="play_date">Date</label>
            <input id="play_date" type="date" name="play_date" defaultValue={week.play_date ?? ""} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label htmlFor="notes">Note for this week (shown to players)</label>
            <input id="notes" name="notes" defaultValue={week.notes} style={{ width: "100%" }} placeholder="e.g. Starts at 7 pm" />
          </div>
        </div>

        <div className="grid wide">
          {ms.map((m) => (
            <div key={m.id} className="card edit-match">
              <input type="hidden" name="match_id" value={m.id} />
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <strong>Table {m.table_no}</strong>
                <ConfirmButton
                  type="submit"
                  formAction={deleteMatch}
                  name="delete_match_id"
                  value={m.id}
                  className="link small"
                  message={`Remove table ${m.table_no} and its scores from week ${n}?`}
                >
                  Remove table
                </ConfirmButton>
              </div>
              <div className="cols"><span /><span>Player</span><span>Sub</span><span>Pair pts</span><span title="Penalty or other adjustment for this player only">+/−</span></div>
              {m.slots.map((s, i) => {
                const pos = `${s.side}${s.seat}`;
                return (
                  <div key={pos}>
                    {i === 2 && <hr />}
                    <div className="slot">
                      <span className="pos">{pos}</span>
                      <select className="s-player" name={`player_${m.id}_${pos}`} defaultValue={s.player_id ?? ""} aria-label={`Table ${m.table_no} ${pos} player`}>
                        <option value="">—</option>
                        {regulars.map((p) => (
                          <option key={p.id} value={p.id}>{displayName(p)}{p.active ? "" : " (inactive)"}</option>
                        ))}
                      </select>
                      <select className="s-sub" name={`sub_${m.id}_${pos}`} defaultValue={s.sub_id ?? ""} aria-label={`Table ${m.table_no} ${pos} sub`}>
                        <option value="">No sub</option>
                        {subs.map((p) => <option key={p.id} value={p.id}>{subLabel(p, subStatById)}</option>)}
                      </select>
                      {s.seat === 1 ? (
                        <input
                          className="s-pts"
                          placeholder="pts"
                          name={`score_${m.id}_${s.side}`}
                          defaultValue={s.score ?? ""}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label={`Table ${m.table_no} side ${s.side} pair points`}
                        />
                      ) : (
                        <span className="s-pts" />
                      )}
                      <input
                        className="s-adj"
                        name={`adjust_${m.id}_${pos}`}
                        defaultValue={s.adjust ?? ""}
                        inputMode="numeric"
                        pattern="-?[0-9]*"
                        placeholder="+/−"
                        aria-label={`Table ${m.table_no} ${pos} adjustment`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="sticky-save row">
          <button type="submit">Save week {n}</button>
          <button type="submit" formAction={addMatch} className="secondary">Add a table</button>
        </div>
      </form>
    </div>
  );
}
