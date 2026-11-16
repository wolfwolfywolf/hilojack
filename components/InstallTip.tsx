"use client";

import { useEffect, useState } from "react";

// One friendly banner offering to put the app on the phone's home screen.
// Shown on phones only, never inside the installed app, and hidden for 60 days after "Not now".
const KEY = "hlj_install_tip";
const QUIET_DAYS = 60;

type Kind = "prompt" | "ios" | "android";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function dismissedRecently(): boolean {
  try {
    const t = Number(localStorage.getItem(KEY));
    return Number.isFinite(t) && t > 0 && Date.now() - t < QUIET_DAYS * 864e5;
  } catch {
    return false;
  }
}
function remember() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* private mode: the banner may come back next visit, which is fine */
  }
}

export function InstallTip() {
  const [kind, setKind] = useState<Kind | null>(null);
  const [evt, setEvt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || dismissedRecently()) return;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    if (!ios && !android) return;

    if (ios) {
      const t = setTimeout(() => setKind("ios"), 1500);
      return () => clearTimeout(t);
    }
    // Android: use the browser's own install button when it offers one, else show the menu steps.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
      setKind("prompt");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = setTimeout(() => setKind((k) => k ?? "android"), 4000);
    const onInstalled = () => setKind(null);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, []);

  if (!kind) return null;
  const close = () => {
    remember();
    setKind(null);
  };

  return (
    <div className="install-tip" role="dialog" aria-label="Add to home screen">
      <img src="/icons/icon-192.png" alt="" width={48} height={48} />
      <div className="it-body">
        <strong>Put Hi Lo Jack on your home screen</strong>
        {kind === "prompt" && <p>One tap and it opens like an app, right to this week&apos;s match.</p>}
        {kind === "ios" && (
          <p>
            Tap the Share button <ShareIcon /> at the bottom of Safari, then <b>Add to Home Screen</b>.
          </p>
        )}
        {kind === "android" && (
          <p>
            Tap the <b>⋮</b> menu at the top right, then <b>Add to Home screen</b> (or <b>Install app</b>).
          </p>
        )}
        <div className="it-actions">
          {kind === "prompt" && evt && (
            <button
              type="button"
              onClick={async () => {
                await evt.prompt();
                await evt.userChoice.catch(() => null);
                close();
              }}
            >
              Add it
            </button>
          )}
          <button type="button" className="secondary" onClick={close}>
            {kind === "prompt" ? "Not now" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg className="it-share" viewBox="0 0 20 24" width="16" height="19" aria-label="Share" role="img">
      <path d="M10 2v13M5.5 6.5 10 2l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10H3v12h14V10h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
