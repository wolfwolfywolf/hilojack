"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Header link that marks itself as the current page. `match` is a path prefix (defaults to exact href). */
export function NavLink({ href, match, className, children }: { href: string; match?: string; className?: string; children: React.ReactNode }) {
  const path = usePathname();
  const on = match ? path.startsWith(match) : path === href;
  return (
    <Link href={href} className={[className, on ? "on" : ""].filter(Boolean).join(" ") || undefined} aria-current={on ? "page" : undefined}>
      {children}
    </Link>
  );
}
