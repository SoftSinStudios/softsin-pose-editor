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

function buildCompletenessWarnings(required = {}) {
  const checks = [
    ["genre", "Missing core genre. Add a genre so the generator has a musical lane."],
    ["mood", "Missing mood. Add a mood or energy cue for stronger emotional targeting."],
    ["instrument", "Missing instrumentation. Add guitars, drums, synths, piano, bass, strings, or another stack."],
    ["vocal", "Missing vocal style. Add male, female, clean, rough, spoken, chanted, or instrumental direction."],
    ["bpm", "Missing tempo/BPM. Add a BPM value so tempo is controlled from one place."],
    ["structure", "Missing song structure. Add verse, chorus, bridge, hook, intro, outro, or arrangement direction."],
    ["production", "Missing production style. Add mix, room, polish, underground, cinematic, raw, or studio direction."],
    ["sectionDetail", "Missing section detail. Add a verse, chorus, bridge, hook, intro, or outro note for better section control."]
  ];

  return checks
    .filter(([key]) => !String(required[key] || "").trim())
    .map(([, message]) => ({
      id: `missing_${message.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      severity: "low",
      message
    }));
}

export function analyzeSelection({ selectedItems, required, conflicts, helpers, riskProfiles }) {
  const traits = collectTraits(selectedItems);
  const risk = collectRisk(selectedItems);

  const triggeredConflicts = conflicts.filter(rule => {
    const ifAll = rule.ifAll || [];
    const ifAny = rule.ifAny || [];
    const allMatch = ifAll.length === 0 || ifAll.every(trait => traits.has(trait));
    const anyMatch = ifAny.length === 0 || ifAny.some(trait => traits.has(trait));
    return allMatch && anyMatch;
  });

  const completenessWarnings = buildCompletenessWarnings(required);
  const allWarnings = [...triggeredConflicts, ...completenessWarnings];

  const triggeredHelpers = helpers.filter(rule => {
    const hasTrigger = (rule.ifAny || []).some(trait => traits.has(trait));
    const hasSupport = (rule.missingAny || []).some(trait => traits.has(trait));
    return hasTrigger && !hasSupport;
  });

  const conflictPenalty = triggeredConflicts.reduce((sum, rule) => {
    if (rule.severity === "high") return sum + 25;
    if (rule.severity === "medium") return sum + 14;
    return sum + 8;
  }, 0);

  const completenessPenalty = completenessWarnings.length * 7;

  const positiveRiskPenalty = Object.values(risk)
    .filter(value => value > 0)
    .reduce((a, b) => a + b, 0) * 3;

  const health = Math.max(0, Math.min(100, 100 - conflictPenalty - completenessPenalty - positiveRiskPenalty));

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
    conflicts: allWarnings,
    helpers: triggeredHelpers,
    risk,
    riskRows
  };
}
