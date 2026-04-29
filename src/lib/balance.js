export function compareStatus(norma, fact) {
  if (fact < norma) {
    return "below";
  }

  if (fact > norma) {
    return "above";
  }

  return "equal";
}

export function buildRowsForDate(services, day = {}, options = {}) {
  const includeArchivedWithRecords = Boolean(options.includeArchivedWithRecords);

  return services
    .filter((service) => !service.isArchived || (includeArchivedWithRecords && day[service.id]))
    .map((service) => {
      const cell = day[service.id] || {};
      const hasNormaOverride = cell.normaOverride !== undefined;
      const norma = hasNormaOverride ? Number(cell.normaOverride) || 0 : Number(service.defaultNorma) || 0;
      const fact = Number(cell.fact) || 0;

      return {
        service,
        norma,
        fact,
        normaOverride: hasNormaOverride ? norma : undefined,
        refill: Math.max(norma - fact, 0),
        reserve: fact - norma,
      };
    });
}

export function calcTotals(rows) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.norma += Number(row.norma) || 0;
      acc.fact += Number(row.fact) || 0;
      acc.refill += Math.max((Number(row.norma) || 0) - (Number(row.fact) || 0), 0);
      return acc;
    },
    { norma: 0, fact: 0, refill: 0 }
  );

  return {
    norma: totals.norma,
    fact: totals.fact,
    refill: totals.refill,
    reserve: totals.fact - totals.norma,
  };
}

export function getDayStatus(totals) {
  if (totals.refill > 0) {
    return "needs-refill";
  }

  if (totals.reserve > 0) {
    return "reserve";
  }

  return "balanced";
}
