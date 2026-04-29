import test from "node:test";
import assert from "node:assert/strict";
import { formatCurrency, parseMoney } from "./money.js";

test("parseMoney keeps only digits", () => {
  assert.equal(parseMoney("487 541 ₽"), 487541);
  assert.equal(parseMoney(""), 0);
  assert.equal(parseMoney(null), 0);
});

test("formatCurrency formats rubles without kopecks", () => {
  assert.match(formatCurrency(100000), /100/);
  assert.match(formatCurrency(100000), /₽/);
});
