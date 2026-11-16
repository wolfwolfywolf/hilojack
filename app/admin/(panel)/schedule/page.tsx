import Link from "next/link";
import { getLeague } from "@/lib/league";
import { generateSeason, importScheduleText, setWeekDates } from "@/lib/actions";
import { Flash, one, type SearchParams } from "@/components/Flash";
import { fmtDate } from "@/components/format";

export default async function ScheduleAdmin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { settings, players, weeks, matches } = await getLeague();
  const regulars = players.filter((p) => !p.is_sub && p.active).length;
  const hasScores = matches.some((m) => m.slots.some((s) => s.score != null));

  return (
    <div className="stack">
      <h1>Schedule &amp; scores</h1>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />

      {weeks.length > 0 && (
        <div className="table-scroll card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th className="num">Wk</th><th>Date</th><th className="num">Tables</th><th className="num">Scores in</th><th className="num">Subs</th><th /></tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const ms = matches.filter((m) => m.week_no === w.week_no);
                const seats = ms.flatMap((m) => m.slots).filter((s) => s.player_id != null);
                const scored = seats.filter((s) => s.score != null).length;
                const subs = seats.filter((s) => s.sub_id != null).length;
                return (
                  <tr key={w.week_no}>
                    <td className="num">{w.week_no}</td>
                    <td>{fmtDate(w.play_date) || <span className="muted">no date</span>}</td>
                    <td className="num">{ms.length}</td>
                    <td className="num">{scored === seats.length && seats.length > 0 ? "✓ all" : `${scored}/${seats.length}`}</td>
                    <td className="num">{subs || ""}</td>
                    <td><Link href={`/admin/week/${w.week_no}/scores`}>Enter scores</Link> · <Link href={`/admin/week/${w.week_no}`}>Edit week</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Import a schedule you already have</h2>
        <p>
          Open the tee sheet PDF, press <strong>Ctrl+A</strong> (or ⌘A) then <strong>Ctrl+C</strong>, and paste it below.
          Each &quot;Round&quot; becomes a week with its date, and every 4 names make a table: the first two are partners,
          the next two are their opponents. Names you haven&apos;t added yet are added as players.
        </p>
        <form action={importScheduleText}>
          <textarea name="schedule" required placeholder={"Round 1 (Wed, November 5)\nKhoury, John   Nolan, Ed   Lavornia, Anthony   Foley, Chris\n..."} style={{ minHeight: "10rem" }} />
          <div className="row" style={{ marginTop: 8 }}>
            {hasScores && <input name="confirm" placeholder="Type REPLACE" aria-label="Type REPLACE to confirm" />}
            <button type="submit">Import schedule</button>
          </div>
        </form>
        {weeks.length > 0 && (
          <p className="warn">Importing replaces the current schedule{hasScores ? " and all scores entered so far" : ""}.</p>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Set league night dates</h2>
        <form action={setWeekDates} className="row">
          <label htmlFor="start_date" style={{ margin: 0 }}>Week 1 is on</label>
          <input id="start_date" type="date" name="start_date" defaultValue={weeks[0]?.play_date ?? ""} required />
          <button type="submit" disabled={weeks.length === 0}>Set all dates</button>
        </form>
        <p className="muted small">Every later week is set 7 days after the one before. Change single weeks (holidays) on that week&apos;s page.</p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>{weeks.length ? "Make a new schedule" : "Make the schedule"}</h2>
        <p>
          Builds {settings.num_weeks} weeks for your {regulars} active league players. Partners rotate so nobody
          has the same partner twice, and opponents are spread out as evenly as possible. You can hand-edit any week afterwards.
        </p>
        <form action={generateSeason} className="row">
          {hasScores && (
            <input name="confirm" placeholder="Type REPLACE" aria-label="Type REPLACE to confirm" />
          )}
          <button type="submit" className={weeks.length ? "danger" : undefined}>
            {weeks.length ? "Replace the whole schedule" : "Make schedule"}
          </button>
        </form>
        {weeks.length > 0 && (
          <p className="warn">This replaces every week&apos;s matchups{hasScores ? " and throws away all scores entered so far" : ""}. Dates are kept.</p>
        )}
      </section>
    </div>
  );
}
