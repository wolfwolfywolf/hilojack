import Link from "next/link";
import { displayName, isNoShow, NO_SHOW, sideTotal } from "@/lib/standings";
import type { MatchRow, Player, Slot } from "@/lib/types";

/** One table: team A on the left, "vs" in the middle, team B on the right. Scores sit under each team once entered. */
export function MatchCard({
  match,
  byId,
  highlight,
  highSides,
}: {
  match: MatchRow;
  byId: Map<number, Player>;
  highlight?: number;
  highSides?: string[]; // "<matchId><side>" of the week's top pair(s)
}) {
  const totals = { A: sideTotal(match, "A"), B: sideTotal(match, "B") };
  const scored = totals.A != null && totals.B != null;
  const winner = scored && totals.A !== totals.B ? (totals.A! > totals.B! ? "A" : "B") : null;
  const mine = highlight != null && match.slots.some((s) => s.player_id === highlight || s.sub_id === highlight);

  const link = (pl: Player) => (
    <Link href={`/players/${pl.id}`} className={highlight === pl.id ? "me" : undefined}>
      {displayName(pl)}
    </Link>
  );
  const seat = (s: Slot) => {
    const p = s.player_id != null ? byId.get(s.player_id) : undefined;
    const sub = s.sub_id != null ? byId.get(s.sub_id) : undefined;
    if (sub)
      return (
        <li key={s.seat}>
          {link(sub)}
          <span className="sub">for {p ? link(p) : "TBD"}</span>
        </li>
      );
    return (
      <li key={s.seat}>
        {p ? link(p) : <span className="muted">TBD</span>}
        {isNoShow(s) && <span className="sub no-show">no-show (−2)</span>}
      </li>
    );
  };
  // No-show rule extras, so the card explains points that differ from the pair score.
  const bonus = (side: "A" | "B") => {
    const mineOut = match.slots.filter((s) => s.side === side && isNoShow(s));
    const oppOut = match.slots.some((s) => s.side !== side && isNoShow(s));
    const stayed = mineOut.length === 1 ? match.slots.find((s) => s.side === side && !isNoShow(s)) : undefined;
    const stayedName = stayed?.player_id != null ? displayName(byId.get(stayed.player_id)) : null;
    const parts = [
      oppOut && `+${NO_SHOW.opponents} each (no-show)`,
      stayedName && `+${NO_SHOW.partner} for ${stayedName}`,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  };
  const team = (side: "A" | "B") => {
    const high = highSides?.includes(`${match.id}${side}`);
    return (
      <div className={`team team-${side}${winner === side ? " win" : ""}${winner && winner !== side ? " lose" : ""}`}>
        <ul>{match.slots.filter((s) => s.side === side).map(seat)}</ul>
        {totals[side] != null && (
          <div className="team-score">
            <span className={high ? "high-score" : "pts"} title={high ? "Most points this week" : undefined}>{totals[side]}</span>
            {high && <span className="badge">★ Week high</span>}
          </div>
        )}
        {bonus(side) && <div className="ns-bonus">{bonus(side)}</div>}
      </div>
    );
  };

  return (
    <div className={`card match${mine ? " mine" : ""}`}>
      {team("A")}
      <div className="vs" aria-hidden>vs</div>
      {team("B")}
    </div>
  );
}
