import Link from "next/link";
import { displayName, sideTotal } from "@/lib/standings";
import type { MatchRow, Player } from "@/lib/types";

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
  const a = sideTotal(match, "A");
  const b = sideTotal(match, "B");
  const winner = a != null && b != null && a !== b ? (a > b ? "A" : "B") : null;
  const mine = highlight != null && match.slots.some((s) => s.player_id === highlight || s.sub_id === highlight);
  return (
    <div className={`card match${mine ? " mine" : ""}`}>
      {(["A", "B"] as const).map((side) => (
        <div key={side} className={`side${winner === side ? " win" : ""}`}>
          <div className="names">
            {match.slots
              .filter((s) => s.side === side)
              .map((s) => {
                const p = s.player_id != null ? byId.get(s.player_id) : undefined;
                const sub = s.sub_id != null ? byId.get(s.sub_id) : undefined;
                const link = (pl: Player) => (
                  <Link href={`/players/${pl.id}`} className={highlight === pl.id ? "me" : undefined}>
                    {displayName(pl)}
                  </Link>
                );
                return (
                  <span key={s.seat} className="p">
                    {sub ? (
                      <>
                        {link(sub)} <span className="sub">sub for {p ? link(p) : "TBD"}</span>
                      </>
                    ) : p ? (
                      link(p)
                    ) : (
                      <span className="muted">TBD</span>
                    )}
                  </span>
                );
              })}
            {highSides?.includes(`${match.id}${side}`) && (
              <div className="hi">
                <span className="badge" title="Most points this week">★ Week high</span>
              </div>
            )}
          </div>
          <div className="total">
            {highSides?.includes(`${match.id}${side}`) ? (
              <span className="high-score" title="Most points this week">{side === "A" ? a : b}</span>
            ) : side === "A" ? a ?? "" : b ?? ""}
          </div>
        </div>
      ))}
    </div>
  );
}
