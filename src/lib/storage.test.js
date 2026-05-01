import test from "node:test";
import assert from "node:assert/strict";
import { loadState, saveState, STORAGE_KEY } from "./storage.js";

function createLocalStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    clear() {
      data.clear();
    },
  };
}

test("loadState falls back to defaults when saved JSON is invalid", () => {
  global.window = { localStorage: createLocalStorage() };
  window.localStorage.setItem(STORAGE_KEY, "{bad");
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    const state = loadState();

    assert.ok(state.services.length > 0);
    assert.deepEqual(state.recordsByDate, {});
  } finally {
    console.warn = originalWarn;
  }
});

test("saveState and loadState roundtrip current record shape", () => {
  global.window = { localStorage: createLocalStorage() };

  saveState({
    services: [{ id: "fuel", name: "Топливо", defaultNorma: 100, isArchived: false }],
    recordsByDate: {
      "2026-04-29": {
        fuel: { fact: 90, normaOverride: 120 },
      },
    },
    preferences: { lastDate: "2026-04-29" },
  });

  const state = loadState();

  assert.equal(state.recordsByDate["2026-04-29"].fuel.fact, 90);
  assert.equal(state.recordsByDate["2026-04-29"].fuel.normaOverride, 120);
});

test("loadState migrates old implicit norma only when it differs from service default", () => {
  global.window = { localStorage: createLocalStorage() };
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      services: [{ id: "fuel", name: "Топливо", defaultNorma: 100 }],
      recordsByDate: {
        "2026-04-29": {
          fuel: { fact: 90, norma: 100 },
        },
        "2026-04-30": {
          fuel: { fact: 90, norma: 120 },
        },
      },
      preferences: { lastDate: "2026-04-29" },
    })
  );

  const state = loadState();

  assert.equal(state.recordsByDate["2026-04-29"].fuel.normaOverride, undefined);
  assert.equal(state.recordsByDate["2026-04-30"].fuel.normaOverride, 120);
});

test("loadState adds newly introduced default services to older saved settings", () => {
  global.window = { localStorage: createLocalStorage() };
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      services: [
        { id: "tatneft", name: "Татнефть", defaultNorma: 400000 },
        { id: "avtodor", name: "Автодор", defaultNorma: 50000 },
        { id: "platon", name: "Платон", defaultNorma: 100000 },
      ],
      recordsByDate: {},
      preferences: { lastDate: "2026-04-29" },
    })
  );

  const state = loadState();

  assert.ok(state.services.some((service) => service.id === "avtodor-alvori"));
  assert.ok(state.services.some((service) => service.id === "platon-alvori"));
});

test("loadState restores default style settings when saved preferences do not include them", () => {
  global.window = { localStorage: createLocalStorage() };
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      services: [{ id: "fuel", name: "Топливо", defaultNorma: 100 }],
      recordsByDate: {},
      preferences: { lastDate: "2026-04-29" },
    })
  );

  const state = loadState();

  assert.equal(state.preferences.styleSettings.factFillMode, "solid");
  assert.equal(state.preferences.styleSettings.surplusThresholdType, "percent");
  assert.equal(state.preferences.styleSettings.surplusThresholdValue, 20);
});

test("loadState sanitizes broken style settings", () => {
  global.window = { localStorage: createLocalStorage() };
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      services: [{ id: "fuel", name: "Топливо", defaultNorma: 100 }],
      recordsByDate: {},
      preferences: {
        lastDate: "2026-04-29",
        styleSettings: {
          factFillMode: "unknown",
          surplusThresholdType: "unknown",
          surplusThresholdValue: -5,
        },
      },
    })
  );

  const state = loadState();

  assert.equal(state.preferences.styleSettings.factFillMode, "solid");
  assert.equal(state.preferences.styleSettings.surplusThresholdType, "percent");
  assert.equal(state.preferences.styleSettings.surplusThresholdValue, 20);
});
