"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Your name in the header; tap it to pick or switch who you are on this phone. */
export function MeLink({ name }: { name: string | null }) {
  const path = usePathname();
  return (
    <Link href={`/me?next=${encodeURIComponent(path === "/me" ? "/" : path)}`} className={name ? "me-link" : "me-link empty"} title="Switch player">
      <span aria-hidden>👤</span> {name ?? "Pick your name"}
    </Link>
  );
}
