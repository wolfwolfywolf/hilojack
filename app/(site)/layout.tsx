import Link from "next/link";
import { getSettings } from "@/lib/league";
import { logout } from "@/lib/actions";
import { InstallTip } from "@/components/InstallTip";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand">
            <img src="/icons/icon-192.png" alt="" className="logo" width={34} height={34} />
            {s.league_name}
          </Link>
          <nav>
            <Link href="/">Standings</Link>
            <Link href="/schedule">Schedule</Link>
            <Link href="/playoffs">Playoffs</Link>
            <Link href="/rules">Rules</Link>
          </nav>
        </div>
      </header>
      <main className="wrap">{children}</main>
      <footer className="wrap site-foot">
        <form action={logout}>
          <input type="hidden" name="role" value="viewer" />
          <button className="link" type="submit">Sign out</button>
        </form>
        <Link href="/admin">League managers</Link>
      </footer>
      <InstallTip />
    </>
  );
}
