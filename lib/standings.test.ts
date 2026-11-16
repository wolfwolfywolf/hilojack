import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStandings, displayName } from "./standings.ts";
import type { MatchRow, Player } from "./types.ts";

const P = (id: number, last: string, is_sub = false): Player => ({
  id, last_name: last, first_initial: "J", is_sub, active: true,
});
const players = [P(1, "Adams"), P(2, "Baker"), P(3, "Clark"), P(4, "Davis"), P(9, "Sub", true)];
const match = (week_no: number, s: [number, number | null, number | null][]): MatchRow => ({
  id: week_no, week_no, table_no: 1,
  slots: s.map(([player_id, sub_id, score], i) => ({
    side: i < 2 ? "A" : "B", seat: ((i % 2) + 1) as 1 | 2, player_id, sub_id, score, adjust: null,
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
