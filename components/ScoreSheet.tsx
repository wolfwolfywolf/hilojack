import { displayName } from "@/lib/standings";
import type { MatchRow, Player, Slot } from "@/lib/types";

const GAMES = [1, 2, 3, 4, 5];
const ROWS = 16;

/** Who is actually sitting in the seat: the sub if one is assigned, else the regular player. */
function seatName(s: Slot | undefined, byId: Map<number, Player>) {
  if (!s) return { name: "", note: "" };
  const regular = s.player_id != null ? byId.get(s.player_id) : undefined;
  const sub = s.sub_id != null ? byId.get(s.sub_id) : undefined;
  if (sub) return { name: displayName(sub), note: regular ? `sub for ${regular.last_name}` : "sub" };
  return { name: regular ? displayName(regular) : "", note: "" };
}

/** Last names of whoever is sitting at the seats (subs in place of regulars), for the column headings. */
function lastNames(slots: Slot[], byId: Map<number, Player>): string[] {
  return slots
    .map((s) => (s.sub_id ?? s.player_id))
    .map((id) => (id != null ? byId.get(id)?.last_name ?? "" : ""))
    .filter(Boolean);
}

function Team({ label, slots, byId, us }: { label: string; slots: Slot[]; byId: Map<number, Player>; us?: boolean }) {
  const [a, b] = slots.map((s) => seatName(s, byId));
  return (
    <div className={`ss-field ss-team${us ? " ss-us" : ""}`}>
      <span className="ss-label">{label}:</span>
      <span className="ss-line">
        {a?.name}
        {a?.note && <small> ({a.note})</small>}
        {a?.name && b?.name && " / "}
        {b?.name}
        {b?.note && <small> ({b.note})</small>}
      </span>
    </div>
  );
}

export function Sheet({ table, week, date, us, them, byId }: { table: number | null; week: number; date: string; us: Slot[]; them: Slot[]; byId: Map<number, Player> }) {
  const usNames = lastNames(us, byId);
  const themNames = lastNames(them, byId);
  return (
    <section className="ss-sheet">
      <div className="ss-corner">{table != null ? `Week ${week} · Table ${table}` : `Week ${week}`}</div>
      <div className="ss-head">
        <Team label="Team Us" slots={us} byId={byId} us />
        <Team label="Team Them" slots={them} byId={byId} />
        <div className="ss-field ss-date">
          <span className="ss-label">Date:</span>
          <span className="ss-line">{date}</span>
        </div>
      </div>

      <div className="ss-games ss-grid">
        {GAMES.map((g) => (
          <table key={g} className="ss-game">
            <thead>
              <tr>
                <th rowSpan={2} className="ss-bump ss-us"><span>Bump</span></th>
                <th colSpan={2}>Game {g}</th>
                <th rowSpan={2} className="ss-bump"><span>Bump</span></th>
              </tr>
              <tr>
                <th className="ss-us ss-colhead">
                  <b>US</b>
                  {usNames.map((n) => <span key={n}>{n}</span>)}
                </th>
                <th className="ss-colhead">
                  <b>THEM</b>
                  {themNames.map((n) => <span key={n}>{n}</span>)}
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, i) => (
                <tr key={i}><td className="ss-us" /><td className="ss-us" /><td /><td /></tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>

      <div className="ss-games ss-sums">
        {GAMES.map((g) => (
          <div key={g} className="ss-sum">
            <div className="ss-sum-title">Summary</div>
            <table>
              <thead>
                <tr><th className="ss-side" /><th>Game</th><th>Hole</th><th>Bumps</th><th>Total</th></tr>
              </thead>
              <tbody>
                <tr className="ss-us"><th className="ss-side">Us</th><td /><td /><td /><td /></tr>
                <tr><th className="ss-side">Them</th><td /><td /><td /><td /></tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="ss-foot">
        <div className="ss-foot-side ss-us">
          <span className="ss-label">Team Us Points:</span><span className="ss-blank" />
          <span className="ss-label">Bonus:</span><span className="ss-blank" />
          <span className="ss-label">Total:</span><span className="ss-blank" />
        </div>
        <div className="ss-foot-side">
          <span className="ss-label">Team Them Points:</span><span className="ss-blank" />
          <span className="ss-label">Bonus:</span><span className="ss-blank" />
          <span className="ss-label">Total:</span><span className="ss-blank" />
        </div>
      </div>
    </section>
  );
}

/** Every table of one week, one sheet each (in table order). */
export function WeekSheets({ week, date, matches, byId }: { week: number; date: string; matches: MatchRow[]; byId: Map<number, Player> }) {
  return (
    <>
      {[...matches].sort((a, b) => a.table_no - b.table_no).map((m) => (
        <Sheet
          key={m.id}
          table={m.table_no}
          week={week}
          date={date}
          us={m.slots.filter((s) => s.side === "A")}
          them={m.slots.filter((s) => s.side === "B")}
          byId={byId}
        />
      ))}
    </>
  );
}
