import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStandings, displayName, subStats } from "./standings.ts";
import type { MatchRow, Player } from "./types.ts";

const P = (id: number, last: string, is_sub = false): Player => ({
  id, last_name: last, first_initial: "J", is_sub, active: true,
});
const players = [P(1, "Adams"), P(2, "Baker"), P(3, "Clark"), P(4, "Davis"), P(9, "Sub", true)];
const match = (week_no: number, s: [number, number | null, number | null][]): MatchRow => ({
  id: week_no, week_no, table_no: 1,
  slots: s.map(([player_id, sub_id, score], i) => ({
    side: i < 2 ? "A" : "B", seat: ((i % 2) + 1) as 1 | 2, player_id, sub_id, score, adjust: null, no_show: false,
  })),
});

const matches = [
  match(1, [[1, null, 5], [2, null, 3], [3, null, 4], [4, 9, 6]]),
  match(2, [[1, null, 2], [3, null, 7], [2, null, 3], [4, null, 1]]),
];

test("absent player credited with sub score by default", () => {
  const rows = computeStandings(players, matches, { sub_credit: "scheduled" });
  const davis = rows.find((r) => r.player.id === 4)!;
  assert.equal(davis.total, 7);
  assert.equal(davis.weeksPlayed, 2);
  assert.equal(davis.subbedOut, 1);
  assert.ok(!rows.some((r) => r.player.is_sub));
});

test("sub_credit none gives absent player nothing", () => {
  const rows = computeStandings(players, matches, { sub_credit: "none" });
  const davis = rows.find((r) => r.player.id === 4)!;
  assert.equal(davis.total, 1);
  assert.equal(davis.weeksPlayed, 1);
});

test("ranking with ties", () => {
  const rows = computeStandings(players, matches, { sub_credit: "scheduled" });
  assert.deepEqual(rows.map((r) => [r.player.last_name, r.total, r.rank]), [
    ["Clark", 11, 1], ["Adams", 7, 2], ["Davis", 7, 2], ["Baker", 6, 4],
  ]);
});

test("display name", () => {
  assert.equal(displayName({ last_name: "Smith", first_initial: "john" }), "Smith, J.");
});

test("no-show penalties via adjustments", () => {
  const m = match(3, [[1, null, 0], [2, null, 0], [3, null, 6], [4, null, 6]]);
  m.slots[0].adjust = 3; // partner showed up: 3 points
  m.slots[1].adjust = -2; // no-show: -2
  m.slots[1].score = null;
  const rows = computeStandings(players, [m], { sub_credit: "scheduled" });
  const t = (id: number) => rows.find((r) => r.player.id === id)!.total;
  assert.deepEqual([t(1), t(2), t(3), t(4)], [3, -2, 6, 6]);
});

test("subStats lists only subs who have a score, with nights, total, average and high", () => {
  const ms = [
    match(1, [[1, null, 5], [2, null, 5], [3, 9, 8], [4, null, 8]]),
    match(2, [[1, 9, 12], [2, null, 12], [3, null, 4], [4, null, 4]]),
    match(3, [[1, 9, null], [2, null, null], [3, null, null], [4, null, null]]), // scheduled, not yet scored
  ];
  const ps = [...players, P(10, "Unused", true)];
  const stats = subStats(ps, ms);
  assert.equal(stats.length, 1);
  assert.deepEqual(
    { name: stats[0].sub.last_name, nights: stats[0].nights, total: stats[0].total, average: stats[0].average, high: stats[0].high },
    { name: "Sub", nights: 2, total: 20, average: 10, high: 12 },
  );
});

test("no-show: -2 for them, pair points +3 for partner, +6 for opponents", () => {
  const m = match(1, [[1, null, 4], [2, null, 4], [3, null, 7], [4, null, 7]]);
  m.slots[1].no_show = true; // Baker no-show (or left early with the pair at 4)
  const rows = computeStandings(players, [m], { sub_credit: "scheduled" });
  const pts = (id: number) => rows.find((r) => r.player.id === id)!.total;
  assert.equal(pts(2), -2);
  assert.equal(pts(1), 7);
  assert.equal(pts(3), 13);
  assert.equal(pts(4), 13);
});

test("no-show before any game: blank scores count as 0", () => {
  const m = match(1, [[1, null, null], [2, null, null], [3, null, null], [4, null, null]]);
  m.slots[0].no_show = true;
  m.slots[1].no_show = true;
  const rows = computeStandings(players, [m], { sub_credit: "scheduled" });
  const r = (id: number) => rows.find((x) => x.player.id === id)!;
  assert.equal(r(1).total, -2);
  assert.equal(r(2).total, -2);
  assert.equal(r(3).total, 6);
  assert.equal(r(4).weeksPlayed, 1);
});

test("a seat with a sub is never a no-show", () => {
  const m = match(1, [[1, null, 5], [2, 9, 5], [3, null, 8], [4, null, 8]]);
  m.slots[1].no_show = true;
  const rows = computeStandings(players, [m], { sub_credit: "scheduled" });
  assert.equal(rows.find((r) => r.player.id === 2)!.total, 5);
  assert.equal(rows.find((r) => r.player.id === 3)!.total, 8);
});
