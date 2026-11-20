import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeague } from "@/lib/league";
import { fmtDate } from "@/components/format";
import { PrintButton } from "@/components/PrintButton";
import { Sheet, WeekSheets } from "@/components/ScoreSheet";

export const metadata = { title: "Score sheets" };

export default async function ScoreSheets({
  params,
  searchParams,
}: {
  params: Promise<{ n: string }>;
  searchParams: Promise<{ blank?: string }>;
}) {
  const n = Number((await params).n);
  const extraBlank = (await searchParams).blank === "1";
  const { players, weeks, matches } = await getLeague();
  const week = weeks.find((w) => w.week_no === n);
  if (!week) notFound();
  const ms = matches.filter((m) => m.week_no === n);
  const byId = new Map(players.map((p) => [p.id, p]));
  const date = week.play_date ? fmtDate(week.play_date) : "";

  return (
    <div className="ss-page">
      <div className="ss-toolbar">
        <Link href={`/admin/week/${n}`}>‹ Back to week {n}</Link>
        <span className="muted small">
          {ms.length} table{ms.length === 1 ? "" : "s"}, one sheet each. Your printer should be set to landscape.
        </span>
        <Link href={`/admin/print/${n}${extraBlank ? "" : "?blank=1"}`} className="small">
          {extraBlank ? "Remove the blank sheet" : "Add a blank sheet"}
        </Link>
        <PrintButton label="Print" />
      </div>
      {ms.length === 0 && !extraBlank && <p className="ss-toolbar muted">No tables on week {n} yet.</p>}
      <WeekSheets week={n} date={date} matches={ms} byId={byId} />
      {extraBlank && <Sheet table={null} week={n} date={date} us={[]} them={[]} byId={byId} />}
    </div>
  );
}
