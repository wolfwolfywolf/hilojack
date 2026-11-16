import { test } from "node:test";
import assert from "node:assert/strict";
import { allOffDates, offBetween } from "../components/format.ts";

const weeks = ["2026-11-04", "2026-11-11", "2026-11-18", "2026-12-02", "2026-12-09", "2027-01-06"].map((play_date) => ({ play_date }));

test("gaps in the schedule become nights off", () => {
  const off = allOffDates(weeks, []);
  assert.deepEqual(off.map((o) => o.off_date), ["2026-11-25", "2026-12-16", "2026-12-23", "2026-12-30"]);
});

test("a marked night keeps its reason and isn't doubled", () => {
  const off = allOffDates(weeks, [{ off_date: "2026-11-25", reason: "Thanksgiving" }]);
  assert.equal(off.filter((o) => o.off_date === "2026-11-25").length, 1);
  assert.equal(off[0].reason, "Thanksgiving");
});

test("offBetween picks nights strictly between two league nights", () => {
  const off = allOffDates(weeks, []);
  assert.deepEqual(offBetween(off, "2026-11-18", "2026-12-02").map((o) => o.off_date), ["2026-11-25"]);
  assert.deepEqual(offBetween(off, "2026-11-11", "2026-11-18"), []);
});
