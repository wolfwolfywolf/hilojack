import { getLeague } from "@/lib/league";
import { computeStandings, displayName } from "@/lib/standings";
import type { StandingRow } from "@/lib/types";

/** Standard bracket order so 1 and 2 can only meet in the final. */
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

export default async function PlayoffsPage() {
  const { settings, players, matches } = await getLeague();
  const rows = computeStandings(players, matches, settings);
  let size = 2;
  while (size * 2 <= Math.min(settings.playoff_size, rows.length)) size *= 2;
  const seeds: (StandingRow | undefined)[] = rows.slice(0, size);
  const order = seedOrder(size);
  const firstRound: [number, number][] = [];
  for (let i = 0; i < order.length; i += 2) firstRound.push([order[i], order[i + 1]]);
  const rounds: number[] = [];
  for (let n = size / 2; n >= 1; n /= 2) rounds.push(n);
  const roundName = (games: number) =>
    games === 1 ? "Final" : games === 2 ? "Semifinals" : games === 4 ? "Quarterfinals" : `Round of ${games * 2}`;

  return (
    <div className="stack">
      <div>
        <h1>Playoffs</h1>
        <p className="muted" style={{ margin: 0 }}>
          The season ends with a 3-week elimination tournament. Season standings set the partners and seeding. This is a preview seeded from the current standings (top {size}); the bracket format will be confirmed by the committee.
        </p>
      </div>
      {rows.length < 2 ? (
        <div className="card muted">Not enough players with scores yet.</div>
      ) : (
        <div className="bracket">
          {rounds.map((games, ri) => (
            <div className="round" key={games}>
              <div className="muted small"><strong>{roundName(games)}</strong></div>
              {Array.from({ length: games }, (_, gi) => (
                <div className="bm" key={gi}>
                  {ri === 0 ? (
                    firstRound[gi].map((seed) => (
                      <div key={seed}>
                        <span className="seed">{seed}</span>
                        <span>{seeds[seed - 1] ? displayName(seeds[seed - 1]!.player) : "Bye"}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div><span className="seed" /> <span className="muted">TBD</span></div>
                      <div><span className="seed" /> <span className="muted">TBD</span></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
