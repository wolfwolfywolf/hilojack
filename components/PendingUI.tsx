"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// Instant feedback while the server works: a thin bar across the top of the
// screen, and a spinner on the button that was pressed. Works for every form
// and link without touching each page.

function Pending({ stamp }: { stamp: number }) {
  const pathname = usePathname();
  const search = useSearchParams()?.toString();
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const done = () => {
    setBusy(false);
    document.querySelectorAll(".is-pending").forEach((el) => el.classList.remove("is-pending"));
    if (timer.current) clearTimeout(timer.current);
  };

  // A new page (or a fresh render after saving) means we're finished.
  useEffect(done, [pathname, search, stamp]);

  useEffect(() => {
    const start = (el?: Element | null) => {
      el?.classList.add("is-pending");
      setBusy(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(done, 15000); // never spin forever
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page or #hash
      start(a);
    };
    const onSubmit = (e: SubmitEvent) => {
      // (A cancelled ConfirmButton never gets here: it stops the click, so no submit happens.)
      const form = e.target as HTMLFormElement;
      if (!form.checkValidity()) return;
      start(e.submitter ?? form.querySelector("button[type=submit], button:not([type])"));
    };
    document.addEventListener("click", onClick, true); // capture: before Next's Link handles it
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", done);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", done);
    };
  }, []);

  return <div className={`nav-progress${busy ? " on" : ""}`} aria-hidden />;
}

export function PendingUI({ stamp }: { stamp: number }) {
  return (
    <Suspense fallback={null}>
      <Pending stamp={stamp} />
    </Suspense>
  );
}
