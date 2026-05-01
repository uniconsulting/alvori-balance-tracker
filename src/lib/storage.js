import { defaultServices } from "../data/defaultServices.js";
import { todayISO } from "./date.js";
import { sanitizeStyleSettings } from "./styleSettings.js";

export const STORAGE_KEY = "alvori-balance:v1";
const STORAGE_VERSION = 1;

function uid() {
  return "service-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function sanitizeServices(services) {
  if (!Array.isArray(services)) {
    return defaultServices;
  }

  const next = services
    .map((service) => ({
      id: String(service?.id || uid()),
      name: String(service?.name || "").trim(),
      defaultNorma: Number(service?.defaultNorma) || 0,
      isArchived: Boolean(service?.isArchived),
    }))
    .filter((service) => service.name);

  if (!next.length) {
    return defaultServices;
  }

  const byId = new Map(next.map((service) => [service.id, service]));
  const orderedKnown = defaultServices.map((service) => byId.get(service.id) || service);
  const customServices = next.filter(
    (service) => !defaultServices.some((defaultService) => defaultService.id === service.id)
  );

  return orderedKnown.concat(customServices);
}

function sanitizeRecords(recordsByDate, services) {
  if (!recordsByDate || typeof recordsByDate !== "object" || Array.isArray(recordsByDate)) {
    return {};
  }

  const knownServiceIds = new Set(services.map((service) => service.id));
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const normalized = {};

  Object.entries(recordsByDate).forEach(([date, day]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || typeof day !== "object" || Array.isArray(day)) {
      return;
    }

    const normalizedDay = {};

    Object.entries(day).forEach(([serviceId, cell]) => {
      if (!knownServiceIds.has(serviceId) || !cell || typeof cell !== "object" || Array.isArray(cell)) {
        return;
      }

      const service = servicesById.get(serviceId);
      const oldNorma = Number(cell.norma);
      const explicitNorma = Number(cell.normaOverride);
      const normalizedCell = {
        fact: Number(cell.fact) || 0,
      };

      if (Number.isFinite(explicitNorma)) {
        normalizedCell.normaOverride = explicitNorma;
      } else if (Number.isFinite(oldNorma) && service && oldNorma !== Number(service.defaultNorma)) {
        normalizedCell.normaOverride = oldNorma;
      }

      normalizedDay[serviceId] = normalizedCell;
    });

    normalized[date] = normalizedDay;
  });

  return normalized;
}

function sanitizePreferences(preferences) {
  const source = preferences && typeof preferences === "object" && !Array.isArray(preferences) ? preferences : {};

  return {
    lastDate: /^\d{4}-\d{2}-\d{2}$/.test(source.lastDate || "") ? source.lastDate : todayISO(),
    styleSettings: sanitizeStyleSettings(source.styleSettings),
  };
}

function migrateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  if (snapshot.version === STORAGE_VERSION && snapshot.payload) {
    return snapshot.payload;
  }

  if (snapshot.services || snapshot.recordsByDate || snapshot.preferences) {
    return snapshot;
  }

  return null;
}

export function createDefaultState() {
  return {
    services: defaultServices,
    recordsByDate: {},
    preferences: {
      lastDate: todayISO(),
    },
  };
}

export function loadState() {
  const fallback = createDefaultState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const snapshot = migrateSnapshot(parsed);
    if (!snapshot) {
      return fallback;
    }

    const services = sanitizeServices(snapshot.services);
    return {
      services,
      recordsByDate: sanitizeRecords(snapshot.recordsByDate, services),
      preferences: sanitizePreferences(snapshot.preferences),
    };
  } catch (error) {
    console.warn("Failed to restore local state", error);
    return fallback;
  }
}

export function saveState(state) {
  const services = sanitizeServices(state.services);
  const snapshot = {
    version: STORAGE_VERSION,
    payload: {
      services,
      recordsByDate: sanitizeRecords(state.recordsByDate, services),
      preferences: sanitizePreferences(state.preferences),
    },
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
