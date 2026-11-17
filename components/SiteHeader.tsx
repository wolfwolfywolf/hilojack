import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE, tokenValid } from "@/lib/auth";
import { getLeague } from "@/lib/league";
import { displayName } from "@/lib/standings";
import { MeLink } from "@/components/MeLink";
import { currentWeek } from "@/lib/standings";
import { NavLink } from "@/components/NavLink";

export async function isAdminViewer(): Promise<boolean> {
  return tokenValid("admin", (await cookies()).get(COOKIE.admin)?.value);
}

/** One header for the whole app. League managers also get a "Managers" row of shortcuts. */
export async function SiteHeader() {
  const [{ settings, weeks, matches, players }, admin, jar] = await Promise.all([getLeague(), isAdminViewer(), cookies()]);
  const meId = Number(jar.get("hlj_me")?.value) || undefined;
  const me = meId ? players.find((p) => p.id === meId) : undefined;
  const cw = admin ? currentWeek(weeks.map((w) => w.week_no), matches) : null;
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand">
          <img src="/icons/icon-192.png" alt="" className="logo" width={34} height={34} />
          <span className="brand-name">{settings.league_name}</span>
        </Link>
        <MeLink name={me ? displayName(me) : null} />
        <nav aria-label="League">
          <NavLink href="/">Standings</NavLink>
          <NavLink href="/schedule" match="/schedule">Schedule</NavLink>
          <NavLink href="/playoffs" match="/playoffs">Playoffs</NavLink>
          <NavLink href="/rules" match="/rules">Rules</NavLink>
        </nav>
      </div>
      {admin && (
        <div className="managers">
          <div className="wrap">
            <span className="managers-label">Managers</span>
            <nav aria-label="Managers" className="pills">
              {cw != null && <NavLink href={`/admin/week/${cw}/scores`} match="/admin/week/" className="pill primary">Enter scores</NavLink>}
              <NavLink href="/admin/schedule" match="/admin/schedule" className="pill">Schedule &amp; scores</NavLink>
              <NavLink href="/admin/players" match="/admin/players" className="pill">Players</NavLink>
              <NavLink href="/admin/settings" match="/admin/settings" className="pill">Settings</NavLink>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
