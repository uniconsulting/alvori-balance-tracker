import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STYLE_SETTINGS,
  getFactTone,
  isSurplusByStyle,
  sanitizeStyleSettings,
} from "./styleSettings.js";

test("sanitizeStyleSettings falls back to defaults for invalid values", () => {
  const result = sanitizeStyleSettings({
    factFillMode: "bad",
    surplusThresholdType: "bad",
    surplusThresholdValue: -10,
    tableDensity: "bad",
    tableFrame: "bad",
  });

  assert.deepEqual(result, DEFAULT_STYLE_SETTINGS);
});

test("percent surplus threshold highlights only values above configured percent", () => {
  const settings = sanitizeStyleSettings({
    surplusThresholdType: "percent",
    surplusThresholdValue: 20,
  });

  assert.equal(isSurplusByStyle(100, 119, settings), false);
  assert.equal(isSurplusByStyle(100, 120, settings), true);
});

test("rub surplus threshold highlights only values above configured amount", () => {
  const settings = sanitizeStyleSettings({
    surplusThresholdType: "rub",
    surplusThresholdValue: 50,
  });

  assert.equal(isSurplusByStyle(100, 149, settings), false);
  assert.equal(isSurplusByStyle(100, 150, settings), true);
});

test("getFactTone classifies deficit normal and surplus", () => {
  assert.equal(getFactTone(100, 90, DEFAULT_STYLE_SETTINGS), "deficit");
  assert.equal(getFactTone(100, 110, DEFAULT_STYLE_SETTINGS), "normal");
  assert.equal(getFactTone(100, 120, DEFAULT_STYLE_SETTINGS), "surplus");
});
