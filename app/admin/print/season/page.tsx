import Link from "next/link";
import { getLeague } from "@/lib/league";
import { fmtDate } from "@/components/format";
import { PrintButton } from "@/components/PrintButton";
import { WeekSheets } from "@/components/ScoreSheet";

export const metadata = { title: "Score sheets: whole season" };

export default async function SeasonScoreSheets() {
  const { players, weeks, matches } = await getLeague();
  const byId = new Map(players.map((p) => [p.id, p]));
  const withTables = [...weeks]
    .sort((a, b) => a.week_no - b.week_no)
    .map((w) => ({ w, ms: matches.filter((m) => m.week_no === w.week_no) }))
    .filter((x) => x.ms.length > 0);
  const pages = withTables.reduce((n, x) => n + x.ms.length, 0);

  return (
    <div className="ss-page">
      <div className="ss-toolbar">
        <Link href="/admin/schedule">‹ Back to schedule</Link>
        <span className="muted small">
          Whole season: {withTables.length} week{withTables.length === 1 ? "" : "s"}, {pages} sheet{pages === 1 ? "" : "s"}
          {" "}(one per table, in week order). Set your printer to landscape.
        </span>
        <PrintButton label="Print" />
      </div>
      {pages === 0 && <p className="ss-toolbar muted">There&apos;s no schedule yet.</p>}
      {withTables.map(({ w, ms }) => (
        <WeekSheets key={w.week_no} week={w.week_no} date={w.play_date ? fmtDate(w.play_date) : ""} matches={ms} byId={byId} />
      ))}
    </div>
  );
}
