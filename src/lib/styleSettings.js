export const DEFAULT_STYLE_SETTINGS = {
  factFillMode: "solid",
  surplusHighlightEnabled: true,
  surplusThresholdType: "percent",
  surplusThresholdValue: 20,
  tableDensity: "standard",
  tableFrame: "flat",
  rowHoverEnabled: true,
  showStatusPercent: true,
};

const FACT_FILL_MODES = new Set(["solid", "soft", "border"]);
const SURPLUS_THRESHOLD_TYPES = new Set(["percent", "rub"]);
const TABLE_DENSITIES = new Set(["standard", "compact"]);
const TABLE_FRAMES = new Set(["flat", "soft"]);

function sanitizeEnum(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function sanitizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function sanitizeStyleSettings(settings) {
  const source = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};

  return {
    factFillMode: sanitizeEnum(
      source.factFillMode,
      FACT_FILL_MODES,
      DEFAULT_STYLE_SETTINGS.factFillMode
    ),
    surplusHighlightEnabled:
      source.surplusHighlightEnabled === undefined
        ? DEFAULT_STYLE_SETTINGS.surplusHighlightEnabled
        : Boolean(source.surplusHighlightEnabled),
    surplusThresholdType: sanitizeEnum(
      source.surplusThresholdType,
      SURPLUS_THRESHOLD_TYPES,
      DEFAULT_STYLE_SETTINGS.surplusThresholdType
    ),
    surplusThresholdValue: sanitizeNumber(
      source.surplusThresholdValue,
      DEFAULT_STYLE_SETTINGS.surplusThresholdValue
    ),
    tableDensity: sanitizeEnum(source.tableDensity, TABLE_DENSITIES, DEFAULT_STYLE_SETTINGS.tableDensity),
    tableFrame: sanitizeEnum(source.tableFrame, TABLE_FRAMES, DEFAULT_STYLE_SETTINGS.tableFrame),
    rowHoverEnabled:
      source.rowHoverEnabled === undefined ? DEFAULT_STYLE_SETTINGS.rowHoverEnabled : Boolean(source.rowHoverEnabled),
    showStatusPercent:
      source.showStatusPercent === undefined
        ? DEFAULT_STYLE_SETTINGS.showStatusPercent
        : Boolean(source.showStatusPercent),
  };
}

export function isSurplusByStyle(norma, fact, settings) {
  const styleSettings = sanitizeStyleSettings(settings);
  const normalizedNorma = Number(norma) || 0;
  const normalizedFact = Number(fact) || 0;

  if (!styleSettings.surplusHighlightEnabled || normalizedNorma <= 0 || normalizedFact <= normalizedNorma) {
    return false;
  }

  if (styleSettings.surplusThresholdType === "rub") {
    return normalizedFact >= normalizedNorma + styleSettings.surplusThresholdValue;
  }

  return normalizedFact >= normalizedNorma * (1 + styleSettings.surplusThresholdValue / 100);
}

export function getFactTone(norma, fact, settings) {
  if ((Number(fact) || 0) < (Number(norma) || 0)) {
    return "deficit";
  }

  if (isSurplusByStyle(norma, fact, settings)) {
    return "surplus";
  }

  return "normal";
}
