import Link from "next/link";
import { logout } from "@/lib/actions";
import { isAdminViewer } from "@/components/SiteHeader";

export async function SiteFooter() {
  const admin = await isAdminViewer();
  return (
    <footer className="wrap site-foot">
      <form action={logout}>
        <input type="hidden" name="role" value={admin ? "admin" : "viewer"} />
        <button className="link" type="submit">{admin ? "Sign out of manager mode" : "Sign out"}</button>
      </form>
      {!admin && <Link href="/admin">League managers</Link>}
    </footer>
  );
}
