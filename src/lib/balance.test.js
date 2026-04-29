import test from "node:test";
import assert from "node:assert/strict";
import { buildRowsForDate, calcTotals, compareStatus } from "./balance.js";

const services = [
  { id: "fuel", name: "Топливо", defaultNorma: 100, isArchived: false },
  { id: "road", name: "Дороги", defaultNorma: 50, isArchived: true },
];

test("compareStatus classifies balances against norma", () => {
  assert.equal(compareStatus(100, 90), "below");
  assert.equal(compareStatus(100, 100), "equal");
  assert.equal(compareStatus(100, 120), "above");
});

test("buildRowsForDate uses default norma unless explicit override exists", () => {
  const rows = buildRowsForDate([{ ...services[0], defaultNorma: 150 }], {
    fuel: { fact: 90 },
  });

  assert.equal(rows[0].norma, 150);
  assert.equal(rows[0].fact, 90);
  assert.equal(rows[0].refill, 60);
});

test("buildRowsForDate keeps explicit daily norma override", () => {
  const rows = buildRowsForDate(services, {
    fuel: { fact: 90, normaOverride: 120 },
  });

  assert.equal(rows[0].norma, 120);
  assert.equal(rows[0].normaOverride, 120);
});

test("calcTotals returns reserve and refill", () => {
  const totals = calcTotals([
    { norma: 100, fact: 90 },
    { norma: 50, fact: 75 },
  ]);

  assert.equal(totals.norma, 150);
  assert.equal(totals.fact, 165);
  assert.equal(totals.refill, 10);
  assert.equal(totals.reserve, 15);
});

test("archived services are hidden unless they have historical records", () => {
  assert.equal(buildRowsForDate(services, {}).length, 1);
  assert.equal(
    buildRowsForDate(services, { road: { fact: 25 } }, { includeArchivedWithRecords: true }).length,
    2
  );
});
