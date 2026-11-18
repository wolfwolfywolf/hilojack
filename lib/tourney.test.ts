import { test } from "node:test";
import assert from "node:assert/strict";
import { earlyRoundTables, foldedTables, seasonSeeds, tourneyState } from "./tourney.ts";
import type { MatchRow, Player } from "./types.ts";

const seeds36 = Array.from({ length: 36 }, (_, i) => i + 1); // player id = seed

test("Rounds 1-3 match last season's seating sheet", () => {
  // Every table from the 2025-26 Night 1 sheet, by seed: A1, A2 vs B1, B2.
  assert.deepEqual(earlyRoundTables(seeds36, 1), [
    [1, 2, 35, 36], [3, 4, 33, 34], [5, 6, 31, 32], [7, 8, 29, 30], [9, 10, 27, 28],
    [11, 12, 25, 26], [13, 14, 23, 24], [15, 16, 21, 22], [17, 18, 19, 20],
  ]);
  assert.deepEqual(earlyRoundTables(seeds36, 2), [
    [1, 3, 34, 36], [2, 4, 33, 35], [5, 7, 30, 32], [6, 8, 29, 31], [9, 11, 26, 28],
    [10, 12, 25, 27], [13, 15, 22, 24], [14, 16, 21, 23], [17, 19, 18, 20],
  ]);
  assert.deepEqual(earlyRoundTables(seeds36, 3), [
    [1, 4, 34, 35], [2, 3, 33, 36], [5, 8, 30, 31], [6, 7, 29, 32], [9, 12, 26, 27],
    [10, 11, 25, 28], [13, 16, 22, 23], [14, 15, 21, 24], [17, 20, 18, 19],
  ]);
});

test("every player sits once per round and gets three different partners", () => {
  const partners = new Map<number, Set<number>>();
  for (const r of [1, 2, 3] as const) {
    const tables = earlyRoundTables(seeds36, r)!;
    assert.deepEqual(tables.flat().sort((a, b) => a - b), seeds36);
    for (const [a, b, c, d] of tables)
      for (const [x, y] of [[a, b], [c, d]]) {
        partners.set(x, (partners.get(x) ?? new Set()).add(y));
        partners.set(y, (partners.get(y) ?? new Set()).add(x));
      }
  }
  for (const id of seeds36) assert.equal(partners.get(id)!.size, 3);
});

test("needs a multiple of 4 players", () => {
  assert.equal(earlyRoundTables(seeds36.slice(0, 35), 1), null);
});

const P = (id: number): Player => ({ id, last_name: `P${String(id).padStart(2, "0")}`, first_initial: "A", is_sub: false, active: true });
const table = (round: number, no: number, ids: number[], a: number | null, b: number | null): MatchRow => ({
  id: round * 100 + no, week_no: round, table_no: no,
  slots: ids.map((player_id, i) => ({
    side: i < 2 ? "A" : "B", seat: ((i % 2) + 1) as 1 | 2, player_id, sub_id: null, score: i < 2 ? a : b, adjust: null, no_show: false,
  })),
});

test("season seeds break ties on the week before the final week", () => {
  const players = [P(1), P(2), P(3), P(4)];
  // Final totals: 4 has 24, 1 and 2 tie on 20 (2 was ahead after week 1), 3 has 16.
  const matches = [table(1, 1, [1, 3, 2, 4], 8, 12), table(2, 1, [1, 4, 2, 3], 12, 8)];
  assert.deepEqual(seasonSeeds(players, matches, { sub_credit: "scheduled" }), [4, 2, 1, 3]);
});

/** Rounds 1-3 for 36 players where seed n scores (37 - n) per round, so standings follow seeds. */
function night1(points: (id: number) => number) {
  const out: MatchRow[] = [];
  for (const r of [1, 2, 3] as const)
    earlyRoundTables(seeds36, r)!.forEach((t, i) => {
      // Both partners get the pair's points; give each pair the points of its first player.
      out.push(table(r, i + 1, t, points(t[0]), points(t[2])));
    });
  return out;
}

test("cut to 20 after Round 3, and Round 4 seating comes from tournament points", () => {
  const tables = night1((id) => id); // pairs led by a higher seed number score more
  const st = tourneyState(seeds36, tables, []);
  const cut = st.cuts[0];
  assert.equal(cut.ready, true);
  assert.equal(cut.tie, null);
  assert.equal(cut.advancing!.length, 20);
  assert.equal(st.rows.filter((r) => r.outAfter === 3).length, 16);
  const order = st.seatOrder(4)!;
  assert.equal(order.length, 20);
  for (let i = 1; i < order.length; i++) assert.ok(st.totalThrough(order[i - 1], 3) >= st.totalThrough(order[i], 3));
  assert.equal(st.seatOrder(5), null); // Round 4 not played yet
});

test("a tie at 20th waits for the playoff game, then the winner moves on", () => {
  const tables = night1(() => 5); // everyone level
  let st = tourneyState(seeds36, tables, []);
  assert.deepEqual(st.cuts[0].tie, { players: seeds36, spots: 20, place: 1 });
  assert.equal(st.seatOrder(4), null);

  // A smaller tie: one pair scores more in Round 1, so 18 players are clear and 18 tie for 2 spots.
  const t2 = night1(() => 5).map((t) => (t.week_no === 1 && t.table_no <= 9 && t.table_no % 2 === 1 ? table(1, t.table_no, t.slots.map((s) => s.player_id!), 9, 5) : t));
  st = tourneyState(seeds36, t2, []);
  const tie = st.cuts[0].tie!;
  assert.equal(tie.spots, 20 - 10);
  st = tourneyState(seeds36, t2, tie.players.slice(0, tie.spots).map((player_id) => ({ cut_after: 3, player_id })));
  assert.equal(st.cuts[0].tie, null);
  assert.equal(st.cuts[0].advancing!.length, 20);
});

test("semifinal winners make the final; the final decides champions", () => {
  // Skip straight to Night 3 with 8 players by giving the semis/final directly.
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const tables = [table(6, 1, [1, 8, 4, 5], 14, 9), table(6, 2, [2, 7, 3, 6], 8, 13)];
  let st = tourneyState(seeds, tables, []);
  assert.deepEqual(st.finalPairs, [1, 8, 3, 6]);
  st = tourneyState(seeds, [...tables, table(7, 1, [1, 8, 3, 6], 10, 15)], []);
  const place = (id: number) => st.rows.find((r) => r.playerId === id)!.place;
  assert.equal(place(3), "Champions");
  assert.equal(place(1), "2nd place");
  assert.equal(place(4), "3rd place");
  assert.equal(st.rows[0].place, "Champions");
});

test("last season's Night 1 results: partners match, standings and the top 20 come out the same", () => {
  // From the league's 2025-26 Night 1 results sheet, in finishing order: [season seed, R1, R2, R3].
  const results: [number, number, number, number][] = [
    [3, 8, 10, 5], [4, 8, 6, 6], [17, 7, 2, 11], [31, 8, 5, 7], [1, 3, 10, 6], [7, 3, 9, 7], [24, 10, 7, 2],
    [20, 0, 7, 11], [11, 4, 6, 7], [16, 4, 7, 6], [30, 9, 0, 7], [36, 7, 0, 9], [14, 3, 7, 5], [2, 3, 6, 5],
    [10, 2, 5, 7], [18, 7, 7, 0], [29, 9, 5, 0], [12, 4, 5, 4], [23, 10, 0, 3], [27, 4, 4, 5],
    [9, 2, 6, 4], [22, 2, 7, 3], [25, 5, 4, 3], [26, 5, 2, 5], [33, 0, 3, 9], [35, 7, 3, 2], [13, 3, 2, 6],
    [15, 4, 2, 5], [6, 0, 3, 7], [5, 0, 9, 0], [28, 4, 2, 3], [32, 8, 0, 0], [8, 3, 3, 0], [21, 2, 0, 2],
    [19, 0, 2, 0], [34, 0, 0, 2],
  ];
  const pts = new Map(results.map(([seed, ...r]) => [seed, r]));
  const tables: MatchRow[] = [];
  for (const r of [1, 2, 3] as const)
    earlyRoundTables(seeds36, r)!.forEach(([a1, a2, b1, b2], i) => {
      // Partners always got the same points on the sheet, which confirms the seating pattern.
      assert.equal(pts.get(a1)![r - 1], pts.get(a2)![r - 1], `round ${r}: seeds ${a1} & ${a2}`);
      assert.equal(pts.get(b1)![r - 1], pts.get(b2)![r - 1], `round ${r}: seeds ${b1} & ${b2}`);
      tables.push(table(r, i + 1, [a1, a2, b1, b2], pts.get(a1)![r - 1], pts.get(b1)![r - 1]));
    });
  const st = tourneyState(seeds36, tables, []);
  assert.deepEqual(st.rows.map((r) => r.playerId), results.map(([seed]) => seed));
  assert.equal(st.cuts[0].tie, null);
  assert.deepEqual(st.cuts[0].advancing, results.slice(0, 20).map(([seed]) => seed));
  assert.deepEqual(st.seatOrder(4), results.slice(0, 20).map(([seed]) => seed));

  // Last season's Round 4 sheet, by Night 1 finishing position: 1&2 vs 19&20, 3&4 vs 17&18, ...
  const byPos = (n: number) => results[n - 1][0];
  assert.deepEqual(
    foldedTables(st.seatOrder(4)!),
    [[1, 2, 19, 20], [3, 4, 17, 18], [5, 6, 15, 16], [7, 8, 13, 14], [9, 10, 11, 12]].map((t) => t.map(byPos)),
  );
});

test("Round 6 matches last season's sheet: 1&2 vs 7&8, 3&4 vs 5&6", () => {
  // Players listed in standings order after Round 5 (Leite, Zabbo, Moskal, Graves, Goncalves, Michael, Petito, Fontaine).
  const order = [3, 4, 7, 11, 16, 1, 29, 17];
  assert.deepEqual(foldedTables(order), [[3, 4, 29, 17], [7, 11, 16, 1]]);
});

test("last season's Night 3: semifinal winners meet in the final, both semifinal losers take 3rd", () => {
  // Season seeds: Leite 3, Zabbo 4, Moskal 7, Graves 11, Goncalves 16, Michael 1, Petito 29, Fontaine 17.
  // Round 6 from last season's sheet; winners from the final results (Graves & Moskal champions, Fontaine & Petito 2nd).
  const seeds = [3, 4, 7, 11, 16, 1, 29, 17];
  const semis = [table(6, 1, [3, 4, 29, 17], 8, 12), table(6, 2, [7, 11, 16, 1], 13, 9)];
  let st = tourneyState(seeds, semis, []);
  assert.deepEqual(st.finalPairs, [29, 17, 7, 11]);
  st = tourneyState(seeds, [...semis, table(7, 1, [29, 17, 7, 11], 9, 14)], []);
  const placeOf = (id: number) => st.rows.find((r) => r.playerId === id)!.place;
  assert.deepEqual([11, 7].map(placeOf), ["Champions", "Champions"]); // Graves, Moskal: $600
  assert.deepEqual([17, 29].map(placeOf), ["2nd place", "2nd place"]); // Fontaine, Petito: $400
  assert.deepEqual([3, 4, 16, 1].map(placeOf), Array(4).fill("3rd place")); // Leite, Zabbo, Goncalves, Michael: $250
});
