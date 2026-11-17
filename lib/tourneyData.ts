import "server-only";
import { cache } from "react";
import { getLeague, getTieWinners, getTourneyTables } from "./league";
import { seasonSeeds, tourneyState } from "./tourney";

/** Everything the tournament pages need: season seeds, tables by round, standings, cuts. */
export const loadTourney = cache(async () => {
  const [league, tables, ties] = await Promise.all([getLeague(), getTourneyTables(), getTieWinners()]);
  const seeds = seasonSeeds(league.players, league.matches, league.settings);
  const state = tourneyState(seeds, tables, ties);
  const byId = new Map(league.players.map((p) => [p.id, p]));
  return { ...league, tables, ties, seeds, state, byId };
});
