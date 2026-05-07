function collectTraits(selectedItems) {
  return new Set(selectedItems.flatMap(item => item.traits || []));
}

function collectRisk(selectedItems) {
  const risk = {};

  selectedItems.forEach(item => {
    Object.entries(item.risk || {}).forEach(([key, value]) => {
      risk[key] = (risk[key] || 0) + Number(value || 0);
    });
  });

  return risk;
}

function getRiskLevel(value, profile) {
  if (value >= (profile?.highMin ?? 6)) return "high";
  if (value > (profile?.lowMax ?? 2)) return "medium";
  return "low";
}

export function analyzeSelection({ selectedItems, conflicts, helpers, riskProfiles }) {
  const traits = collectTraits(selectedItems);
  const risk = collectRisk(selectedItems);

  const triggeredConflicts = conflicts.filter(rule => {
    const ifAll = rule.ifAll || [];
    const ifAny = rule.ifAny || [];
    const allMatch = ifAll.length === 0 || ifAll.every(trait => traits.has(trait));
    const anyMatch = ifAny.length === 0 || ifAny.some(trait => traits.has(trait));
    return allMatch && anyMatch;
  });

  const triggeredHelpers = helpers.filter(rule => {
    const hasTrigger = (rule.ifAny || []).some(trait => traits.has(trait));
    const hasSupport = (rule.missingAny || []).some(trait => traits.has(trait));
    return hasTrigger && !hasSupport;
  });

  const penalty = triggeredConflicts.reduce((sum, rule) => {
    if (rule.severity === "high") return sum + 25;
    if (rule.severity === "medium") return sum + 14;
    return sum + 8;
  }, 0);

  const positiveRiskPenalty = Object.values(risk)
    .filter(value => value > 0)
    .reduce((a, b) => a + b, 0) * 3;

  const health = Math.max(0, Math.min(100, 100 - penalty - positiveRiskPenalty));

  const riskRows = Object.entries(riskProfiles || {}).map(([id, profile]) => {
    const value = risk[id] || 0;
    return {
      id,
      label: profile.label || id,
      value,
      level: getRiskLevel(value, profile),
      description: profile.description || ""
    };
  });

  return {
    health,
    conflicts: triggeredConflicts,
    helpers: triggeredHelpers,
    risk,
    riskRows
  };
}
