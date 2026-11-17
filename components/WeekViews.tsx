"use client";

import { useEffect, useState, type ReactNode } from "react";

export type PlayerSeat = { id: number; name: string; table: number; subField: string };
type View = "tables" | "players";
const KEY = "hlj_week_view";

/**
 * Toggle between the normal "By table" editor and an A to Z list of this week's players.
 * The A to Z list only mirrors the Sub boxes: picking a sub there sets the real Sub box in the
 * (hidden) table view, so Save still sends every field exactly as before.
 */
export function WeekViews({ seats, subs, children }: { seats: PlayerSeat[]; subs: { id: number; label: string }[]; children: ReactNode }) {
  const [view, setView] = useState<View>("tables");
  const [subOf, setSubOf] = useState<Record<string, string>>({});

  useEffect(() => {
    try { if (localStorage.getItem(KEY) === "players") setView("players"); } catch {}
  }, []);

  const real = (field: string) => document.querySelector<HTMLSelectElement>(`select[name="${field}"]`);

  useEffect(() => {
    if (view !== "players") return;
    const now: Record<string, string> = {};
    for (const s of seats) now[s.subField] = real(s.subField)?.value ?? "";
    setSubOf(now);
  }, [view, seats]);

  function choose(v: View) {
    setView(v);
    try { localStorage.setItem(KEY, v); } catch {}
  }

  function pickSub(field: string, value: string) {
    const el = real(field);
    if (el) el.value = value;
    setSubOf((o) => ({ ...o, [field]: value }));
  }

  return (
    <>
      <div className="view-toggle" role="tablist">
        <button type="button" role="tab" aria-selected={view === "tables"} className={view === "tables" ? "on" : ""} onClick={() => choose("tables")}>By table</button>
        <button type="button" role="tab" aria-selected={view === "players"} className={view === "players" ? "on" : ""} onClick={() => choose("players")}>By player (A–Z)</button>
      </div>
      <div hidden={view !== "tables"}>{children}</div>
      {view === "players" && (
        <div className="card by-player">
          <p className="muted small" style={{ marginTop: 0 }}>Pick a sub next to anyone who can&apos;t make it, then press Save. Switch to By table to change seats or points.</p>
          <ul>
            {seats.map((s) => (
              <li key={s.subField} className={subOf[s.subField] ? "has-sub" : undefined}>
                <span className="bp-name">{s.name}<span className="bp-table">Table {s.table}</span></span>
                <select value={subOf[s.subField] ?? ""} onChange={(e) => pickSub(s.subField, e.target.value)} aria-label={`Sub for ${s.name}`}>
                  <option value="">No sub</option>
                  {subs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
