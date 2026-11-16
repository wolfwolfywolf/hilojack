import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSchedule } from "./importSchedule.ts";

const sheet = `
                                 2025-26 Card League - Tee Sheet
Round 1 (Wed, November 5)
        Khoury, John       Nolan, Ed           Lavornia, Anthony   Foley, Chris
        Crowley, Richard Farrell, Kevin        Zabbo, Christophe Michael, Tom
Round 2 (Wed, December 31)
        Semenkow, Jame     Klaubert, Drew      Klaubert, Rick      Khoury, John
        Lavornia, Anthon   Nolan, Ed           Foley, Chris        Zabbo, Christoph
Round 3 (Wed, January 7, 2026)
Khoury, John
Nolan, Ed
Foley, Chris
Michael, Tom
`;

test("parses rounds, dates and pairs", () => {
  const r = parseSchedule(sheet);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.weeks.map((w) => [w.week, w.date, w.matches.length]), [
    [1, "2025-11-05", 2],
    [2, "2025-12-31", 2],
    [3, "2026-01-07", 1],
  ]);
  assert.deepEqual(r.weeks[0].matches[1].map((n) => n.last), ["Crowley", "Farrell", "Zabbo", "Michael"]);
});

test("truncated first names still match one player", () => {
  const r = parseSchedule(sheet);
  const keys = r.players.map((p) => `${p.last} ${p.initial}`);
  assert.equal(keys.filter((k) => k === "Lavornia A").length, 1);
  assert.ok(keys.includes("Klaubert D") && keys.includes("Klaubert R"));
  assert.equal(r.players.length, 11);
});

test("flags uneven tables and doubled names", () => {
  const r = parseSchedule("Week 1\nAa, B  Cc, D  Ee, F\nWeek 2\nAa, B  Aa, B  Cc, D  Ee, F");
  assert.equal(r.problems.length, 2);
});
