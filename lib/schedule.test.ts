import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSchedule, scheduleStats } from "./schedule.ts";

const ids = Array.from({ length: 36 }, (_, i) => i + 1);

test("36 players, 18 weeks: everyone plays once a week", () => {
  const s = generateSchedule(ids, 18, 42);
  assert.equal(s.length, 18);
  for (const week of s) {
    assert.equal(week.length, 9);
    const seen = week.flat(2).sort((a, b) => a - b);
    assert.deepEqual(seen, ids);
  }
});

test("no repeat partners and few repeat opponents", () => {
  const stats = scheduleStats(generateSchedule(ids, 18, 7));
  assert.equal(stats.maxPartnerRepeats, 1);
  assert.ok(stats.maxOpponentRepeats <= 2, JSON.stringify(stats));
  console.log("stats", stats);
});

test("same seed gives same schedule", () => {
  assert.deepEqual(generateSchedule(ids, 18, 1), generateSchedule(ids, 18, 1));
});

test("rejects player counts that do not fill tables", () => {
  assert.throws(() => generateSchedule(ids.slice(0, 34), 18));
});
