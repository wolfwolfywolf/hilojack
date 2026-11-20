import Link from "next/link";
import { getLeague } from "@/lib/league";
import { generateSeason, importScheduleText, setWeekDates, skipWeek, unskipDate } from "@/lib/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { currentWeek } from "@/lib/standings";
import { Flash, one, type SearchParams } from "@/components/Flash";
import { allOffDates, fmtDate } from "@/components/format";

export default async function ScheduleAdmin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { settings, players, weeks, matches, offDates } = await getLeague();
  const cw = currentWeek(weeks.map((w) => w.week_no), matches);
  // Two weeks on one date is almost always a typo.
  const sameDate = (w: { week_no: number; play_date: string | null }) =>
    w.play_date ? weeks.filter((x) => x.week_no !== w.week_no && x.play_date === w.play_date).map((x) => x.week_no) : [];
  const dupWeeks = weeks.filter((w) => sameDate(w).length > 0);
  const gaps = allOffDates(weeks, []);
  const skippable = weeks.filter((w) => w.play_date && (cw == null || w.week_no >= cw));
  const regulars = players.filter((p) => !p.is_sub && p.active).length;
  const hasScores = matches.some((m) => m.slots.some((s) => s.score != null));

  return (
    <div className="stack">
      <h1>Schedule &amp; scores</h1>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />
      {dupWeeks.length > 0 && (
        <p className="warn">
          Two weeks are on the same date: {dupWeeks.map((w) => `week ${w.week_no}`).join(", ")}. Fix the date on one of them.
        </p>
      )}

      {weeks.length > 0 && (
        <p className="row">
          <Link href="/admin/print/season" className="btn secondary">Print score sheets for the whole season</Link>
        </p>
      )}

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
                    <td>
                      {fmtDate(w.play_date) || <span className="muted">no date</span>}
                      {sameDate(w).length > 0 && <span className="warn-inline"> ⚠ same as wk {sameDate(w).join(", ")}</span>}
                    </td>
                    <td className="num">{ms.length}</td>
                    <td className="num">{scored === seats.length && seats.length > 0 ? "✓ all" : `${scored}/${seats.length}`}</td>
                    <td className="num">{subs || ""}</td>
                    <td><Link href={`/admin/week/${w.week_no}/scores`}>Enter scores</Link> · <Link href={`/admin/week/${w.week_no}`}>Edit week</Link> · <Link href={`/admin/print/${w.week_no}`}>Print sheets</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {weeks.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>No league this week (holiday)</h2>
          <p className="muted small">
            Pick the night that&apos;s off. That week and every week after it move back 7 days, and players see
            &quot;No league&quot; for that night on the schedule.
          </p>
          <form action={skipWeek} className="stack-form">
            <label htmlFor="skip_week">Night off</label>
            <select id="skip_week" name="week_no" required defaultValue="">
              <option value="" disabled>Pick a date…</option>
              {skippable.map((w) => (
                <option key={w.week_no} value={w.week_no}>{fmtDate(w.play_date)} (week {w.week_no})</option>
              ))}
            </select>
            <label htmlFor="skip_reason">Reason players will see (optional)</label>
            <input id="skip_reason" name="reason" maxLength={60} placeholder="e.g. Thanksgiving" />
            <ConfirmButton type="submit" message="Mark this night as no league and move it and every later week back one week?">
              Skip this night
            </ConfirmButton>
          </form>
          {gaps.length > 0 && (
            <p className="muted small">
              Gaps already in the schedule, shown to players as &quot;No league&quot;: {gaps.map((g) => fmtDate(g.off_date)).join(", ")}.
            </p>
          )}
          {offDates.length > 0 && (
            <ul className="off-list">
              {offDates.map((o) => (
                <li key={o.off_date}>
                  <span><strong>No league {fmtDate(o.off_date)}</strong>{o.reason && <> · {o.reason}</>}</span>
                  <form action={unskipDate}>
                    <input type="hidden" name="off_date" value={o.off_date} />
                    <ConfirmButton type="submit" className="link small" message={`Undo the ${fmtDate(o.off_date)} night off? Every week after it moves forward one week.`}>
                      Undo
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
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
        <p className="muted small">Every later week is set 7 days after the one before. This clears any holidays, so use &quot;No league this week&quot; afterwards.</p>
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
