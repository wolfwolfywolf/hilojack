import { test } from "node:test";
import assert from "node:assert/strict";
import { BANK_DEFAULTS, bankTotals, fmtMoney, playoffPrizes, purse, seasonPrizes, splitCents, weeklyWinners } from "./bank.ts";
import type { MatchRow, Player } from "./types.ts";

const P = (id: number, last: string, is_sub = false): Player => ({ id, last_name: last, first_initial: "J", is_sub, active: true });
const players = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => P(i, "P" + i)).concat([P(9, "Sub", true)]);
let mid = 0;
// [player, sub, pairScore, noShow]
const match = (week_no: number, s: [number, number | null, number | null, boolean?][]): MatchRow => ({
  id: ++mid, week_no, table_no: mid,
  slots: s.map(([player_id, sub_id, score, ns], i) => ({
    side: i < 2 ? "A" : "B", seat: ((i % 2) + 1) as 1 | 2, player_id, sub_id, score, adjust: null, no_show: !!ns,
  })),
});

test("splitCents hands out leftover pennies", () => {
  assert.deepEqual(splitCents(10000, 3), [3334, 3333, 3333]);
  assert.equal(splitCents(10000, 6).reduce((a, b) => a + b), 10000);
});

test("weekly high pair splits the prize; a sub's share goes to the player they filled in for", () => {
  const ms = [
    match(1, [[1, null, 30], [2, null, 30], [3, null, 20], [4, 9, 20]]),
    match(1, [[5, null, 25], [6, null, 25], [7, null, 22], [8, null, 22]]),
  ];
  const [w] = weeklyWinners(ms, 100);
  assert.equal(w.score, 30);
  assert.deepEqual(w.payees.map((p) => [p.person_id, p.cents]), [[1, 5000], [2, 5000]]);
  const ms2 = [match(2, [[1, null, 10], [2, null, 10], [3, null, 31], [4, 9, 31]])];
  const [w2] = weeklyWinners(ms2, 100);
  assert.deepEqual(w2.payees.map((p) => [p.person_id, p.sub_id, p.cents]), [[3, null, 5000], [4, 9, 5000]]);
  const rows = purse(players, [w2], null, []);
  assert.deepEqual(rows.map((r) => [r.person.id, r.subWeeks]), [[3, []], [4, [2]]]);
});

test("tied pairs share the prize four ways", () => {
  const ms = [
    match(3, [[1, null, 30], [2, null, 30], [3, null, 20], [4, null, 20]]),
    match(3, [[5, null, 30], [6, null, 30], [7, null, 22], [8, null, 22]]),
  ];
  const [w] = weeklyWinners(ms, 100);
  assert.deepEqual(w.payees.map((p) => p.cents), [2500, 2500, 2500, 2500]);
});

test("unfinished week pays nothing; no-show's partner takes the pair share", () => {
  assert.equal(weeklyWinners([match(4, [[1, null, 30], [2, null, 30], [3, null, null], [4, null, null]])], 100).length, 0);
  const [w] = weeklyWinners([match(5, [[1, null, 30], [2, null, 30, true], [3, null, 10], [4, null, 10]])], 100);
  assert.deepEqual(w.payees.map((p) => [p.person_id, p.cents]), [[1, 10000]]);
});

test("season prizes split on ties", () => {
  const ms = [
    match(1, [[1, null, 30], [2, null, 30], [3, null, 20], [4, null, 20]]),
    match(1, [[5, null, 25], [6, null, 25], [7, null, 5], [8, null, 5]]),
  ];
  const bank = { ...BANK_DEFAULTS, season_1: 300, season_2: 200, season_3: 100 };
  const got = seasonPrizes(players, ms, { sub_credit: "scheduled" }, bank).map((p) => [p.player_id, p.place, p.cents]);
  // 1 and 2 tie for 1st: share 1st+2nd ($250 each). 5 and 6 tie for 3rd: share 3rd ($50 each).
  assert.deepEqual(got, [[1, 1, 25000], [2, 1, 25000], [5, 3, 5000], [6, 3, 5000]]);
});

test("playoff teams split their prize; purse adds it all up", () => {
  const bank = { ...BANK_DEFAULTS, playoff_1: 400, playoff_2: 200, playoff_semi: 100 };
  const po = playoffPrizes([
    { place: "first", seat: 1, player_id: 1 }, { place: "first", seat: 2, player_id: 2 },
    { place: "semi_a", seat: 1, player_id: 3 }, { place: "semi_a", seat: 2, player_id: 4 },
    { place: "semi_b", seat: 1, player_id: 5 }, { place: "semi_b", seat: 2, player_id: 6 },
  ], bank);
  assert.deepEqual(po.map((p) => p.cents), [20000, 20000, 5000, 5000, 5000, 5000]);
  const weekly = weeklyWinners([match(1, [[1, null, 30], [3, null, 30], [2, null, 2], [4, null, 2]])], 100);
  const rows = purse(players, weekly, null, po);
  assert.deepEqual(rows.map((r) => [r.person.id, r.totalCents]), [[1, 25000], [2, 20000], [3, 10000], [4, 5000], [5, 5000], [6, 5000]]);
  assert.deepEqual(rows[0].weeks, [1]);
});

test("bank totals and money format", () => {
  const t = bankTotals({ ...BANK_DEFAULTS, season_1: 500, playoff_semi: 100 }, 36, 18);
  assert.equal(t.collected, 4500);
  assert.equal(t.prizes, 1800 + 500 + 200);
  assert.equal(t.left, 2000);
  assert.equal(fmtMoney(1666), "$16.66");
  assert.equal(fmtMoney(450000), "$4,500");
});
