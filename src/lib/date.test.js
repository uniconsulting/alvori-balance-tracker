import test from "node:test";
import assert from "node:assert/strict";
import { formatHumanDate, toLocalISODate } from "./date.js";

test("toLocalISODate uses local calendar date instead of UTC string date", () => {
  const localMidnight = new Date(2026, 3, 29, 0, 30, 0);

  assert.equal(toLocalISODate(localMidnight), "2026-04-29");
});

test("formatHumanDate formats yyyy-mm-dd for Russian UI", () => {
  assert.match(formatHumanDate("2026-04-29"), /2026/);
  assert.equal(formatHumanDate("bad"), "");
});
