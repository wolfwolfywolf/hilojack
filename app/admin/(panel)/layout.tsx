import Link from "next/link";
import { logout } from "@/lib/actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="top admin">
        <div className="wrap">
          <Link href="/admin" className="brand"><span className="suit">♠</span>League admin</Link>
          <nav>
            <Link href="/admin/players">Players</Link>
            <Link href="/admin/schedule">Schedule &amp; scores</Link>
            <Link href="/admin/settings">Settings</Link>
            <Link href="/">View site</Link>
            <form action={logout}>
              <input type="hidden" name="role" value="admin" />
              <button className="link" type="submit">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
