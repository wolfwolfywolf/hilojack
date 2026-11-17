import { test } from "node:test";
import assert from "node:assert/strict";
import { matchPlayer, splitName } from "./photoMatch.ts";

const players = [
  { id: 1, last_name: "Smith", first_initial: "J" },
  { id: 2, last_name: "Smith", first_initial: "B" },
  { id: 3, last_name: "O'Brien", first_initial: "T" },
  { id: 4, last_name: "Van Dyke", first_initial: "R" },
  { id: 5, last_name: "Jones", first_initial: "" },
];

test("splits common name shapes", () => {
  assert.deepEqual(splitName("Smith, John"), { last: "smith", initial: "j" });
  assert.deepEqual(splitName("John Smith Jr."), { last: "smith", initial: "j" });
  assert.deepEqual(splitName("John Q. Smith"), { last: "smith", initial: "j", altLast: "qsmith" });
  assert.deepEqual(splitName("John_Smith.jpg"), { last: "smith", initial: "j" });
  assert.deepEqual(splitName("Smith, J..png"), { last: "smith", initial: "j" });
});

test("matches on last name and first initial", () => {
  assert.equal(matchPlayer("John Smith", players)?.id, 1);
  assert.equal(matchPlayer("Smith, Bob", players)?.id, 2);
  assert.equal(matchPlayer("Tom OBrien", players)?.id, 3);
  assert.equal(matchPlayer("Van Dyke, Rich", players)?.id, 4);
  assert.equal(matchPlayer("Pat Jones", players)?.id, 5);
  assert.equal(matchPlayer("Rich Van Dyke", players)?.id, 4);
});

test("refuses to guess", () => {
  assert.equal(matchPlayer("Smith", players), null); // two Smiths
  assert.equal(matchPlayer("Carl Smith", players), null); // no C. Smith
  assert.equal(matchPlayer("Nobody Here", players), null);
});
