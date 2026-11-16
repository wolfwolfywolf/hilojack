// Season schedule generator for 2-vs-2 play with rotating partners.
//
// Partners: a round-robin "circle" rotation, so nobody partners the same
// player twice until everyone has partnered everyone (35 weeks for 36 players).
// Opponents: each week the pairs are grouped into tables with a local search
// that avoids putting players against people they have already faced.

export type Pair = [number, number];
export type Match = [Pair, Pair];
export type Week = Match[];

export interface ScheduleStats {
  maxPartnerRepeats: number; // most times any two players partner each other
  maxOpponentRepeats: number; // most times any two players face each other
  opponentRepeatPairs: number; // player pairs who face each other more than once
}

/** Small seeded PRNG so a schedule can be reproduced from its seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Round-robin partner rounds (circle method). n must be even. */
function partnerRounds(players: number[]): Pair[][] {
  const n = players.length;
  const rounds: Pair[][] = [];
  const fixed = players[0];
  const ring = players.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const pairs: Pair[] = [[fixed, ring[0]]];
    for (let i = 1; i < n / 2; i++) pairs.push([ring[i], ring[n - 1 - i]]);
    rounds.push(pairs);
    ring.unshift(ring.pop()!);
  }
  return rounds;
}

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function matchCost(p: Pair, q: Pair, opp: Map<string, number>): number {
  let c = 0;
  for (const x of p)
    for (const y of q) {
      const n = opp.get(key(x, y)) ?? 0;
      c += n * n * n; // a third meeting costs much more than a second
    }
  return c;
}

/** Group a week's pairs into tables, minimising repeat opponents. */
function groupPairs(pairs: Pair[], opp: Map<string, number>, rand: () => number): Week {
  let best: Pair[] = [];
  let bestCost = Infinity;
  for (let attempt = 0; attempt < 40 && bestCost > 0; attempt++) {
    const order = shuffle(pairs, rand);
    const tables = order.length / 2;
    const cost = (t: number) => matchCost(order[2 * t], order[2 * t + 1], opp);
    let total = 0;
    for (let t = 0; t < tables; t++) total += cost(t);
    // Swap pairs between tables while that lowers the total.
    let improved = true;
    while (improved && total > 0) {
      improved = false;
      for (let i = 0; i < order.length; i++) {
        for (let j = i + 1; j < order.length; j++) {
          const ti = Math.floor(i / 2);
          const tj = Math.floor(j / 2);
          if (ti === tj) continue;
          const before = cost(ti) + cost(tj);
          [order[i], order[j]] = [order[j], order[i]];
          const after = cost(ti) + cost(tj);
          if (after < before) {
            total += after - before;
            improved = true;
          } else {
            [order[i], order[j]] = [order[j], order[i]];
          }
        }
      }
    }
    if (total < bestCost) {
      bestCost = total;
      best = order.slice();
    }
  }
  const week: Week = [];
  for (let t = 0; t < best.length / 2; t++) week.push([best[2 * t], best[2 * t + 1]]);
  return week;
}

export function generateSchedule(playerIds: number[], weeks: number, seed = Date.now()): Week[] {
  if (playerIds.length < 4 || playerIds.length % 4 !== 0) {
    throw new Error(
      `Need a multiple of 4 players to fill every table (have ${playerIds.length}).`,
    );
  }
  if (new Set(playerIds).size !== playerIds.length) throw new Error("Duplicate player ids.");
  const rand = rng(seed);
  const rounds = shuffle(partnerRounds(shuffle(playerIds, rand)), rand);
  const opp = new Map<string, number>();
  const schedule: Week[] = [];
  for (let w = 0; w < weeks; w++) {
    const week = groupPairs(rounds[w % rounds.length], opp, rand);
    for (const [p, q] of week)
      for (const x of p) for (const y of q) opp.set(key(x, y), (opp.get(key(x, y)) ?? 0) + 1);
    schedule.push(week);
  }
  return schedule;
}

export function scheduleStats(schedule: Week[]): ScheduleStats {
  const partner = new Map<string, number>();
  const opp = new Map<string, number>();
  const bump = (m: Map<string, number>, a: number, b: number) =>
    m.set(key(a, b), (m.get(key(a, b)) ?? 0) + 1);
  for (const week of schedule)
    for (const [p, q] of week) {
      bump(partner, p[0], p[1]);
      bump(partner, q[0], q[1]);
      for (const x of p) for (const y of q) bump(opp, x, y);
    }
  const vals = (m: Map<string, number>) => [...m.values()];
  return {
    maxPartnerRepeats: Math.max(0, ...vals(partner)),
    maxOpponentRepeats: Math.max(0, ...vals(opp)),
    opponentRepeatPairs: vals(opp).filter((n) => n > 1).length,
  };
}
