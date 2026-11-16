import Link from "next/link";
import { getLeague } from "@/lib/league";
import { currentWeek } from "@/lib/standings";

export default async function AdminHome() {
  const { settings, players, weeks, matches } = await getLeague();
  const regulars = players.filter((p) => !p.is_sub && p.active).length;
  const subs = players.filter((p) => p.is_sub && p.active).length;
  const cw = currentWeek(weeks.map((w) => w.week_no), matches);
  const steps = [
    { done: regulars > 0, text: <>Add your players on <Link href="/admin/players">Players</Link> (paste a list, one per line).</> },
    { done: weeks.length > 0, text: <>Make the {settings.num_weeks}-week schedule on <Link href="/admin/schedule">Schedule &amp; scores</Link>.</> },
    { done: weeks.some((w) => w.play_date), text: <>Set the first league night so every week gets a date.</> },
  ];
  return (
    <div className="stack">
      <h1>{settings.league_name}</h1>
      <div className="grid">
        <div className="card"><div className="muted small">Players</div><div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{regulars}</div><div className="muted small">{subs} subs</div></div>
        <div className="card"><div className="muted small">Weeks scheduled</div><div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{weeks.length}</div><div className="muted small">of {settings.num_weeks}</div></div>
        <div className="card">
          <div className="muted small">This week</div>
          {cw != null ? (
            <>
              <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>Week {cw}</div>
              <Link href={`/admin/week/${cw}/scores`} className="btn big" style={{ marginTop: 8 }}>Enter scores →</Link>
              <div className="small" style={{ marginTop: 10 }}><Link href={`/admin/week/${cw}`}>Edit matchups</Link></div>
            </>
          ) : (
            <div className="muted">No schedule yet</div>
          )}
        </div>
      </div>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Getting started</h2>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {steps.map((s, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              {s.done ? "✓ " : ""}{s.text}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
