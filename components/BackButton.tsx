"use client";
import { useRouter } from "next/navigation";

/** Goes back to the page you came from (works in the home-screen app, which has no browser back button). */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="back-btn"
      onClick={() => {
        // Opened fresh (e.g. a shared link)? There's nothing to go back to, so go to Standings.
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      ‹ Back
    </button>
  );
}
