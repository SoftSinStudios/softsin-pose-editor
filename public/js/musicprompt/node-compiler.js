function clean(value) {
  return String(value || "").trim();
}

function titleCaseId(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "song";
}

function structureNodes(project) {
  return project.nodes.filter(node => node.kind === "structure");
}

function flowOrderedSections(project) {
  const sections = structureNodes(project);
  const ids = new Set(sections.map(node => node.id));
  const flowEdges = project.edges.filter(edge => (edge.type || "modifier") === "flow" && ids.has(edge.from) && ids.has(edge.to));

  if (!flowEdges.length) {
    return sections.sort((a, b) => a.x - b.x || a.y - b.y);
  }

  const incoming = new Map(sections.map(node => [node.id, 0]));
  const outgoing = new Map(sections.map(node => [node.id, []]));

  flowEdges.forEach(edge => {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.get(edge.from)?.push(edge.to);
  });

  const queue = sections
    .filter(node => (incoming.get(node.id) || 0) === 0)
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .map(node => node.id);

  const ordered = [];
  const seen = new Set();

  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const node = sections.find(item => item.id === id);
    if (node) ordered.push(node);

    (outgoing.get(id) || []).forEach(nextId => {
      incoming.set(nextId, (incoming.get(nextId) || 0) - 1);
      if ((incoming.get(nextId) || 0) <= 0) queue.push(nextId);
    });
  }

  const leftovers = sections
    .filter(node => !seen.has(node.id))
    .sort((a, b) => a.x - b.x || a.y - b.y);

  return [...ordered, ...leftovers];
}

function attachedModifiers(project, sectionId) {
  const modifierIds = project.edges
    .filter(edge => (edge.type || "modifier") === "modifier" && edge.to === sectionId)
    .map(edge => edge.from);

  return modifierIds
    .map(id => project.nodes.find(node => node.id === id))
    .filter(Boolean)
    .filter(node => node.kind === "modifier")
    .sort((a, b) => a.type.localeCompare(b.type) || a.value.localeCompare(b.value));
}

function compileHeader(section, modifiers) {
  const label = clean(section.label || section.type);
  const values = modifiers
    .filter(mod => mod.type !== "negative")
    .map(mod => clean(mod.value))
    .filter(Boolean);

  return values.length ? `[${label} | ${values.join(" | ")}]` : `[${label}]`;
}

export function compileNodeProject(project) {
  const lines = [];
  const title = clean(project.meta?.title) || "Untitled Song";
  const style = clean(project.global?.style);
  const globalNegative = clean(project.global?.negative);

  lines.push("TITLE:");
  lines.push(title);
  lines.push("");
  lines.push("STYLE:");
  lines.push(style || "Add style direction here.");
  lines.push("");

  const sectionNegatives = project.edges
    .filter(edge => (edge.type || "modifier") === "modifier")
    .map(edge => {
      const mod = project.nodes.find(node => node.id === edge.from && node.kind === "modifier" && node.type === "negative");
      return mod ? clean(mod.value) : "";
    })
    .filter(Boolean);

  const negatives = [...new Set([globalNegative, ...sectionNegatives].filter(Boolean))];
  if (negatives.length) {
    lines.push("NEGATIVE:");
    lines.push(negatives.join(", "));
    lines.push("");
  }

  lines.push("LYRICS:");
  lines.push("");

  flowOrderedSections(project).forEach(section => {
    const modifiers = attachedModifiers(project, section.id);
    lines.push(compileHeader(section, modifiers));
    const lyrics = clean(section.lyrics);
    if (lyrics) lines.push(lyrics);
    lines.push("");
  });

  return {
    filename: `${titleCaseId(title)}_suno_prompt.txt`,
    text: lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim() + "\n"
  };
}
