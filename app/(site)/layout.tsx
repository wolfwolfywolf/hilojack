import Link from "next/link";
import { getSettings } from "@/lib/league";
import { logout } from "@/lib/actions";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand">
            <span className="suit">♠</span>
            {s.league_name}
          </Link>
          <nav>
            <Link href="/">Standings</Link>
            <Link href="/schedule">Schedule</Link>
            <Link href="/playoffs">Playoffs</Link>
            <Link href="/rules">Rules</Link>
            <form action={logout}>
              <input type="hidden" name="role" value="viewer" />
              <button className="link" type="submit">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="wrap">{children}</main>
      <footer className="wrap small muted" style={{ paddingBottom: 24 }}>
        <Link href="/admin" className="muted">League managers</Link>
      </footer>
    </>
  );
}
