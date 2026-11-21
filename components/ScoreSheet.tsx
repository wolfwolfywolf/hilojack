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

/** One pair's names across the top of the sheet. Pair A is shaded so the two pairs are easy to tell apart. */
function Team({ slots, byId, shaded }: { slots: Slot[]; byId: Map<number, Player>; shaded?: boolean }) {
  const [a, b] = slots.map((s) => seatName(s, byId));
  return (
    <div className={`ss-field ss-team${shaded ? " ss-a" : ""}`}>
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

/** Stacked last names, used as a column or row heading. Empty on a blank sheet (room to write them in). */
function Names({ names }: { names: string[] }) {
  return <>{names.map((n, i) => <span key={i}>{n}</span>)}</>;
}

export function Sheet({ table, week, date, us, them, byId }: { table: number | null; week: number; date: string; us: Slot[]; them: Slot[]; byId: Map<number, Player> }) {
  const aNames = lastNames(us, byId);
  const bNames = lastNames(them, byId);
  const points = (names: string[]) => (names.length ? `${names.join(" / ")} points:` : "Points:");
  return (
    <section className="ss-sheet">
      <div className="ss-corner">{table != null ? `Week ${week} · Table ${table}` : `Week ${week}`}</div>
      <div className="ss-head">
        <Team slots={us} byId={byId} shaded />
        <span className="ss-vs">vs</span>
        <Team slots={them} byId={byId} />
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
                <th rowSpan={2} className="ss-bump ss-a"><span>Bump</span></th>
                <th colSpan={2}>Game {g}</th>
                <th rowSpan={2} className="ss-bump"><span>Bump</span></th>
              </tr>
              <tr>
                <th className="ss-a ss-colhead"><Names names={aNames} /></th>
                <th className="ss-colhead"><Names names={bNames} /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, i) => (
                <tr key={i}><td className="ss-a" /><td className="ss-a" /><td /><td /></tr>
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
                <tr className="ss-a"><th className="ss-side"><Names names={aNames} /></th><td /><td /><td /><td /></tr>
                <tr><th className="ss-side"><Names names={bNames} /></th><td /><td /><td /><td /></tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="ss-foot">
        <div className="ss-foot-side ss-a">
          <span className="ss-label">{points(aNames)}</span><span className="ss-blank" />
          <span className="ss-label">Bonus:</span><span className="ss-blank" />
          <span className="ss-label">Total:</span><span className="ss-blank" />
        </div>
        <div className="ss-foot-side">
          <span className="ss-label">{points(bNames)}</span><span className="ss-blank" />
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
