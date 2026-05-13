import { compileNodeProject } from "./compiler.js";

const STORAGE_VERSION = "node-graph-0.3.0";
const canvas = document.querySelector("#node-canvas");
const worldSize = document.querySelector("#node-world-size");
const world = document.querySelector("#node-world");
const edgeLayer = document.querySelector("#edge-layer");
const output = document.querySelector("#compiled-output");
const titleInput = document.querySelector("#song-title");
const styleInput = document.querySelector("#style-text");
const stylePreset = document.querySelector("#style-preset");
const negativeInput = document.querySelector("#negative-text");
const lyricsDialog = document.querySelector("#lyrics-dialog");
const lyricsEditor = document.querySelector("#lyrics-editor");
const dialogTitle = document.querySelector("#dialog-title");
const dialogMeta = document.querySelector("#dialog-meta");
const outputDialog = document.querySelector("#output-dialog");
const projectDialog = document.querySelector("#project-dialog");
const contextMenu = document.querySelector("#context-menu");

let SECTION_TYPES = [
  { id: "intro", label: "Intro", tag: "Intro" },
  { id: "verse", label: "Verse", tag: "Verse", numbered: true },
  { id: "pre_chorus", label: "Pre-Chorus", tag: "Pre-Chorus" },
  { id: "chorus", label: "Chorus", tag: "Chorus", numbered: true },
  { id: "bridge", label: "Bridge", tag: "Bridge" },
  { id: "outro", label: "Outro", tag: "Outro" }
];

let NODE_LIBRARY = [];
let MODIFIER_LIBRARY = [];
let STYLE_LIBRARY = [];
let NEGATIVE_LIBRARY = [];

const FALLBACK_MODIFIERS = {
  vocal: "Raspy Male Vocals",
  arrangement: "Sparse Arrangement",
  energy: "Rising Intensity",
  instrument: "Guitar Solo",
  production: "Raw Analog Production",
  negative: "no trap hi-hats"
};

// Keep this layout data aligned with the CSS node dimensions.
// Important: this only moves nodes. Edge rendering remains unchanged,
// so existing connector behavior stays stable.
const NODE_SIZE = {
  structure: { width: 220, height: 160 },
  modifier: { width: 210, height: 142 },
  title: { width: 240, height: 128 },
  style: { width: 240, height: 220 },
  output: { width: 240, height: 138 }
};

const LAYOUT = {
  marginX: 50,
  nodeGapX: 60,
  // The starter graph auto-fits smaller screens so the base scaffold does not require horizontal scrolling.
  // Ultrawide setups remain at 100%.
  fitPaddingX: 120,
  minInitialZoom: 0.4
};

const CHILD_STACK = {
  offsetX: 5,
  // Parent bottom padding + first child top gap.
  // Kept generous so wrapped labels/buttons cannot visually collide.
  offsetY: 212,
  // Vertical breathing room between stacked child nodes.
  gapY: 34
};

let activeLyricsNodeId = null;
let dragState = null;
let connectState = null;
let zoomLevel = 1;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.08;
let lastContextPoint = { x: 260, y: 180 };
let worldBounds = { width: 3000, height: 1800 };

const project = {
  meta: { title: "", version: STORAGE_VERSION },
  global: { style: "", negative: "" },
  nodes: [],
  edges: []
};

function uid(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

function normalizeLibrary() {
  MODIFIER_LIBRARY = NODE_LIBRARY.filter(item => item.nodeKind === "modifier");
  STYLE_LIBRARY = NODE_LIBRARY.filter(item => item.nodeKind === "style");
  NEGATIVE_LIBRARY = MODIFIER_LIBRARY.filter(item => item.modifierType === "negative");
}

async function loadNodeData() {
  try {
    const [sections, library] = await Promise.all([
      fetchJson("data/musicprompt/sectionTypes.json"),
      fetchJson("data/musicprompt/nodeLibrary.json")
    ]);
    if (Array.isArray(sections.sections) && sections.sections.length) SECTION_TYPES = sections.sections;
    if (Array.isArray(library.nodes)) NODE_LIBRARY = library.nodes;
    normalizeLibrary();
  } catch (error) {
    console.warn("Node library failed to load. Falling back to built-in defaults.", error);
    NODE_LIBRARY = [];
    normalizeLibrary();
  }
}

function sectionOptionsHtml() {
  return SECTION_TYPES.map(section => `<option value="${escapeHtml(section.tag || section.label)}">${escapeHtml(section.label)}</option>`).join("");
}

function modifierTypes() {
  const types = [...new Set(MODIFIER_LIBRARY.map(item => item.modifierType).filter(Boolean))];
  return types.length ? types : Object.keys(FALLBACK_MODIFIERS);
}

function titleFromId(value) {
  return String(value || "").replace(/_/g, " ").replace(/\w/g, char => char.toUpperCase());
}

function modifierTypeOptionsHtml(selected = "") {
  return modifierTypes().map(type => `<option value="${escapeHtml(type)}" ${type === selected ? "selected" : ""}>${escapeHtml(titleFromId(type))}</option>`).join("");
}

function modifierItems(type) {
  return MODIFIER_LIBRARY.filter(item => item.modifierType === type);
}

function modifierItemOptionsHtml(type) {
  const items = modifierItems(type);
  if (!items.length) return `<option value="custom">Custom</option>`;
  return items.map(item => `<option value="${escapeHtml(item.id)}" data-output="${escapeHtml(item.output)}">${escapeHtml(item.label)}</option>`).join("") + `<option value="custom">Custom...</option>`;
}

function styleOptionsHtml() {
  if (!STYLE_LIBRARY.length) return `<option value="custom">Custom</option>`;
  return STYLE_LIBRARY.map(item => `<option value="${escapeHtml(item.id)}" data-output="${escapeHtml(item.output)}">${escapeHtml(item.label)} · ${escapeHtml(item.category || "style")}</option>`).join("") + `<option value="custom">Custom...</option>`;
}

function styleNodeOptionsHtml(currentValue = "") {
  const options = [`<option value="">Select style preset...</option>`];
  STYLE_LIBRARY.forEach(item => {
    const selected = item.output === currentValue ? " selected" : "";
    options.push(`<option value="${escapeHtml(item.output)}"${selected}>${escapeHtml(item.label)} · ${escapeHtml(item.category || "style")}</option>`);
  });
  options.push(`<option value="custom">Custom...</option>`);
  return options.join("");
}

function firstModifierValue(type) {
  return modifierItems(type)[0]?.output || FALLBACK_MODIFIERS[type] || "";
}

function populateStylePresetSelect() {
  if (!stylePreset) return;
  const current = stylePreset.value || "";
  const options = [`<option value="">No preset selected</option>`];
  STYLE_LIBRARY.forEach(item => {
    options.push(`<option value="${escapeHtml(item.output)}">${escapeHtml(item.label)} · ${escapeHtml(item.category || "style")}</option>`);
  });
  options.push(`<option value="custom">Custom / manual entry</option>`);
  stylePreset.innerHTML = options.join("");
  stylePreset.value = current && [...stylePreset.options].some(opt => opt.value === current) ? current : "";
}

function compiledLineCount(text) {
  const cleanText = String(text || "").trim();
  return cleanText ? cleanText.split(/\n/).length : 0;
}

function wireLibraryMenuControls(menu) {
  const typeSelect = menu.querySelector("#ctx-mod-type");
  const itemSelect = menu.querySelector("#ctx-mod-item");
  const valueInput = menu.querySelector("#ctx-mod-value");
  const styleSelect = menu.querySelector("#ctx-style-item");
  const styleInput = menu.querySelector("#ctx-style-value");

  function syncModifierItems() {
    if (!typeSelect || !itemSelect || !valueInput) return;
    itemSelect.innerHTML = modifierItemOptionsHtml(typeSelect.value);
    const first = itemSelect.selectedOptions[0];
    valueInput.value = first?.dataset.output || firstModifierValue(typeSelect.value);
  }

  function syncModifierValue() {
    if (!itemSelect || !valueInput) return;
    const selected = itemSelect.selectedOptions[0];
    if (itemSelect.value === "custom") {
      valueInput.focus();
      valueInput.select();
      return;
    }
    valueInput.value = selected?.dataset.output || valueInput.value;
  }

  function syncStyleValue() {
    if (!styleSelect || !styleInput) return;
    const selected = styleSelect.selectedOptions[0];
    if (styleSelect.value === "custom") {
      styleInput.focus();
      styleInput.select();
      return;
    }
    styleInput.value = selected?.dataset.output || styleInput.value;
  }

  typeSelect?.addEventListener("change", syncModifierItems);
  itemSelect?.addEventListener("change", syncModifierValue);
  styleSelect?.addEventListener("change", syncStyleValue);
  syncModifierItems();
  syncStyleValue();
}

function nodeById(id) {
  return project.nodes.find(node => node.id === id);
}

function attachedModifierNodes(sectionId) {
  return project.edges
    .filter(edge => (edge.type || "modifier") === "modifier" && edge.to === sectionId)
    .map(edge => nodeById(edge.from))
    .filter(node => node && node.kind === "modifier");
}

function sortAttachedModifiers(modifiers) {
  return [...modifiers].sort((a, b) => {
    const ai = Number.isFinite(a.stackIndex) ? a.stackIndex : Number.POSITIVE_INFINITY;
    const bi = Number.isFinite(b.stackIndex) ? b.stackIndex : Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;

    const ay = Number.isFinite(a.y) ? a.y : 0;
    const by = Number.isFinite(b.y) ? b.y : 0;
    if (Math.abs(ay - by) > 8) return ay - by;

    const ax = Number.isFinite(a.x) ? a.x : 0;
    const bx = Number.isFinite(b.x) ? b.x : 0;
    if (Math.abs(ax - bx) > 8) return ax - bx;

    return String(a.value || "").localeCompare(String(b.value || ""));
  });
}

function layoutAttachedModifiers() {
  const sections = project.nodes.filter(node => node.kind === "structure");

  sections.forEach(section => {
    const attached = sortAttachedModifiers(attachedModifierNodes(section.id));
    attached.forEach((modifier, index) => {
      modifier.x = section.x + CHILD_STACK.offsetX;
      modifier.y = section.y + CHILD_STACK.offsetY + index * (NODE_SIZE.modifier.height + CHILD_STACK.gapY);
      modifier.parentId = section.id;
      modifier.stackIndex = index;
    });
  });

  const attachedIds = new Set(project.edges
    .filter(edge => (edge.type || "modifier") === "modifier")
    .map(edge => edge.from));

  project.nodes.forEach(node => {
    if (node.kind === "modifier" && !attachedIds.has(node.id)) {
      delete node.parentId;
      delete node.stackIndex;
    }
  });
}

function nextChildPoint(section) {
  const count = attachedModifierNodes(section.id).length;
  return {
    x: section.x + CHILD_STACK.offsetX,
    y: section.y + CHILD_STACK.offsetY + count * (NODE_SIZE.modifier.height + CHILD_STACK.gapY)
  };
}


function nodeVisualSize(node) {
  if (node.kind === "modifier") return NODE_SIZE.modifier;
  if (node.kind === "title") return NODE_SIZE.title;
  if (node.kind === "style") return NODE_SIZE.style;
  if (node.kind === "output") return NODE_SIZE.output;
  return NODE_SIZE.structure;
}

function updateWorldBounds() {
  const padding = { x: 90, y: 180 };
  const rect = canvas.getBoundingClientRect();
  let maxRight = Math.max(800, rect.width / Math.max(zoomLevel, 0.01));
  let maxBottom = Math.max(600, rect.height / Math.max(zoomLevel, 0.01));

  project.nodes.forEach(node => {
    const size = nodeVisualSize(node);
    maxRight = Math.max(maxRight, (node.x || 0) + size.width + padding.x);
    maxBottom = Math.max(maxBottom, (node.y || 0) + size.height + padding.y);
  });

  worldBounds = {
    width: Math.ceil(maxRight),
    height: Math.ceil(maxBottom)
  };

  if (worldSize) {
    worldSize.style.width = `${Math.ceil(worldBounds.width * zoomLevel)}px`;
    worldSize.style.height = `${Math.ceil(worldBounds.height * zoomLevel)}px`;
  }

  world.style.width = `${worldBounds.width}px`;
  world.style.height = `${worldBounds.height}px`;
  edgeLayer.style.width = `${worldBounds.width}px`;
  edgeLayer.style.height = `${worldBounds.height}px`;
}

function syncNodeElementPositions() {
  project.nodes.forEach(node => {
    const el = world.querySelector(`.graph-node[data-id="${CSS.escape(node.id)}"]`);
    if (!el) return;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
  });
}

function canvasPointFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left + canvas.scrollLeft) / zoomLevel,
    y: (clientY - rect.top + canvas.scrollTop) / zoomLevel
  };
}

function applyZoom(nextZoom, anchorEvent = null) {
  const oldZoom = zoomLevel;
  zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom.toFixed(3))));
  if (zoomLevel === oldZoom) return;

  let beforeX = null;
  let beforeY = null;
  let anchorLeft = 0;
  let anchorTop = 0;

  if (anchorEvent) {
    const rect = canvas.getBoundingClientRect();
    anchorLeft = anchorEvent.clientX - rect.left;
    anchorTop = anchorEvent.clientY - rect.top;
    beforeX = (anchorLeft + canvas.scrollLeft) / oldZoom;
    beforeY = (anchorTop + canvas.scrollTop) / oldZoom;
  }

  world.style.transform = `scale(${zoomLevel})`;
  updateWorldBounds();

  if (anchorEvent) {
    canvas.scrollLeft = Math.max(0, beforeX * zoomLevel - anchorLeft);
    canvas.scrollTop = Math.max(0, beforeY * zoomLevel - anchorTop);
  }

  drawEdges();
}

function handleZoomWheel(event) {
  if (!event.shiftKey) return;
  event.preventDefault();
  const direction = event.deltaY > 0 ? -1 : 1;
  applyZoom(zoomLevel + direction * ZOOM_STEP, event);
}

function getCanvasPoint(event) {
  return canvasPointFromClient(event.clientX, event.clientY);
}

function sectionCount(type) {
  return project.nodes.filter(node => node.kind === "structure" && node.type === type).length + 1;
}

function primaryTitleNode() {
  return project.nodes.find(node => node.kind === "title");
}

function ensureTitleNode() {
  if (primaryTitleNode()) return;
  project.nodes.unshift({
    id: uid("title"),
    kind: "title",
    type: "title",
    value: project.meta?.title || "",
    x: 60,
    y: 145
  });
}

function primaryStyleNode() {
  return project.nodes.find(node => node.kind === "style");
}

function ensureStyleNode() {
  if (primaryStyleNode()) return;
  project.nodes.unshift({
    id: uid("style"),
    kind: "style",
    type: "style",
    value: project.global?.style || "",
    x: 70,
    y: 165
  });
  if (project.global) project.global.style = "";
}

function ensureOutputNode() {
  if (project.nodes.some(node => node.kind === "output")) return;
  project.nodes.push({
    id: uid("output"),
    kind: "output",
    type: "output",
    label: "Compiled TXT",
    x: 980,
    y: 165
  });
}

function addSection(type, x, y, lyrics = "") {
  const count = sectionCount(type);
  const label = ["Verse", "Chorus"].includes(type) ? `${type} ${count}` : type;
  project.nodes.push({
    id: uid("section"),
    kind: "structure",
    type,
    label,
    lyrics,
    x: x ?? 180,
    y: y ?? 220
  });
  render();
}

function addStyleNode(value, x, y) {
  const existing = primaryStyleNode();
  if (existing) {
    existing.value = String(value || "").trim();
    existing.x = x ?? existing.x;
    existing.y = y ?? existing.y;
    render();
    return;
  }

  project.nodes.push({
    id: uid("style"),
    kind: "style",
    type: "style",
    value: String(value || "").trim(),
    x: x ?? 170,
    y: y ?? 110
  });
  render();
}

function addModifier(type, value, x, y, attachToId = null) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return;

  const id = uid("modifier");
  project.nodes.push({
    id,
    kind: "modifier",
    type,
    value: cleanValue,
    x: x ?? 220,
    y: y ?? 440
  });

  if (attachToId) addEdge(id, attachToId, "modifier", false);
  render();
}

function edgeExists(from, to, type) {
  return project.edges.some(edge => edge.from === from && edge.to === to && (edge.type || "modifier") === type);
}

function addEdge(fromId, toId, type = null, doRender = true) {
  if (!fromId || !toId || fromId === toId) return false;
  const from = nodeById(fromId);
  const to = nodeById(toId);
  if (!from || !to) return false;

  const resolvedType = type || resolveEdgeType(from, to);
  if (!resolvedType || edgeExists(fromId, toId, resolvedType)) return false;

  project.edges.push({ from: fromId, to: toId, type: resolvedType });
  layoutAttachedModifiers();
  if (doRender) render();
  return true;
}

function resolveEdgeType(from, to) {
  if (from.kind === "modifier" && to.kind === "structure") return "modifier";
  if (from.kind === "structure" && to.kind === "structure") return "flow";
  if (from.kind === "structure" && to.kind === "output") return "output";
  return null;
}

function removeNode(id) {
  const node = nodeById(id);
  if (node && ["title", "style", "output"].includes(node.kind)) return;
  project.nodes = project.nodes.filter(node => node.id !== id);
  project.edges = project.edges.filter(edge => edge.from !== id && edge.to !== id);
  render();
}

function detachEdges(id) {
  project.edges = project.edges.filter(edge => edge.from !== id && edge.to !== id);
  render();
}

function updateGlobals(closeDialog = false) {
  const titleNode = primaryTitleNode();
  if (titleNode) titleNode.value = titleInput.value.trim();
  project.meta.title = titleNode?.value || titleInput.value.trim() || "";
  const styleNode = primaryStyleNode();
  if (styleNode) styleNode.value = styleInput.value.trim();
  project.global.style = "";
  project.global.negative = negativeInput.value.trim();
  render();
  if (closeDialog) projectDialog.close();
}

function compile() {
  const titleNode = primaryTitleNode();
  if (titleNode) project.meta.title = titleNode.value || "";
  const compiled = compileNodeProject(project);
  output.value = compiled.text;
  const outputNode = project.nodes.find(node => node.kind === "output");
  if (outputNode) {
    outputNode.lines = compiledLineCount(compiled.text);
    outputNode.filename = compiled.filename;
  }
  return compiled;
}

function lineCount(text) {
  const clean = String(text || "").trim();
  return clean ? clean.split(/\n/).length : 0;
}

function openLyricsEditor(nodeId) {
  const node = nodeById(nodeId);
  if (!node || node.kind !== "structure") return;

  activeLyricsNodeId = nodeId;
  dialogTitle.textContent = `Lyrics: ${node.label}`;
  lyricsEditor.value = node.lyrics || "";
  dialogMeta.textContent = `${lineCount(node.lyrics)} lines`;
  lyricsDialog.showModal();
  lyricsEditor.focus();
}

function saveLyrics() {
  const node = nodeById(activeLyricsNodeId);
  if (!node) return;
  node.lyrics = lyricsEditor.value.trim();
  activeLyricsNodeId = null;
  lyricsDialog.close();
  render();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function createSocket(kind) {
  const socket = document.createElement("span");
  socket.className = `node-socket ${kind}`;
  socket.dataset.socket = kind;
  socket.title = kind === "out" ? "Drag from this socket" : "Connect into this socket";
  return socket;
}

function createNodeElement(node) {
  const el = document.createElement("article");
  el.className = `graph-node ${node.kind}-node ${node.type}`;
  el.dataset.id = node.id;
  el.style.left = `${node.x}px`;
  el.style.top = `${node.y}px`;
  el.draggable = false;

  if (node.kind === "structure") {
    const attached = project.edges.filter(edge => (edge.type || "modifier") === "modifier" && edge.to === node.id).length;
    const outgoing = project.edges.filter(edge => edge.type === "flow" && edge.from === node.id).length;
    el.innerHTML = `
      <div class="node-title"><strong>${escapeHtml(node.label)}</strong><span>${escapeHtml(node.type)}</span></div>
      <div class="node-meta">Lyrics: ${lineCount(node.lyrics)} lines</div>
      <div class="node-meta">Modifiers: ${attached} · Next: ${outgoing}</div>
      <div class="node-actions">
        <button class="mini-btn" data-action="lyrics" type="button">Lyrics</button>
        <button class="mini-btn" data-action="rename" type="button">Rename</button>
        <button class="mini-btn" data-action="detach" type="button">Unlink</button>
        <button class="mini-btn danger" data-action="delete" type="button">Delete</button>
      </div>
    `;
    const sectionType = String(node.type || "").toLowerCase();
    if (sectionType !== "intro") el.appendChild(createSocket("in"));
    if (!['outro', 'end'].includes(sectionType)) el.appendChild(createSocket("out"));
  } else if (node.kind === "modifier") {
    const attached = project.edges.filter(edge => (edge.type || "modifier") === "modifier" && edge.from === node.id).length;
    el.innerHTML = `
      <div class="node-title"><strong>${escapeHtml(node.value)}</strong><span>${escapeHtml(node.type)}</span></div>
      <div class="node-meta">Linked to: ${attached} section${attached === 1 ? "" : "s"}</div>
      <div class="node-actions">
        <button class="mini-btn" data-action="edit-mod" type="button">Edit</button>
        <button class="mini-btn" data-action="detach" type="button">Unlink</button>
        <button class="mini-btn danger" data-action="delete" type="button">Delete</button>
      </div>
    `;
    el.appendChild(createSocket("out"));
  } else if (node.kind === "title") {
    el.innerHTML = `
      <div class="node-title"><strong>Song Title</strong><span>title</span></div>
      <label class="node-inline-field">
        <span>Title</span>
        <input class="title-node-text" data-action="title-text" type="text" placeholder="Enter song title..." value="${escapeHtml(node.value || "")}" />
      </label>
      <div class="node-meta">Outputs TITLE when filled.</div>
    `;
  } else if (node.kind === "style") {
    el.innerHTML = `
      <div class="node-title"><strong>Global Style</strong><span>style</span></div>
      <label class="node-inline-field">
        <span>Preset</span>
        <select class="style-node-preset" data-action="style-preset">${styleNodeOptionsHtml(node.value || "")}</select>
      </label>
      <label class="node-inline-field">
        <span>Style</span>
        <textarea class="style-node-text" data-action="style-text" placeholder="Select a preset or type a custom global style...">${escapeHtml(node.value || "")}</textarea>
      </label>
      <div class="node-meta">Outputs STYLE when filled.</div>
    `;
  } else if (node.kind === "output") {
    const compiled = compileNodeProject(project);
    el.innerHTML = `
      <div class="node-title"><strong>Compiled TXT</strong><span>export</span></div>
      <div class="node-meta">${compiled.filename}</div>
      <div class="node-meta">${compiledLineCount(compiled.text)} lines ready</div>
      <div class="node-actions">
        <button class="mini-btn" data-action="open-output" type="button">Open</button>
        <button class="mini-btn" data-action="copy-output" type="button">Copy</button>
      </div>
    `;
  }

  el.addEventListener("input", event => {
    if (node.kind === "title") {
      const text = event.target.closest(".title-node-text");
      if (!text) return;
      node.value = text.value.trim();
      project.meta.title = node.value;
      compile();
      return;
    }

    if (node.kind !== "style") return;
    const text = event.target.closest(".style-node-text");
    if (!text) return;
    node.value = text.value.trim();
    const select = el.querySelector(".style-node-preset");
    if (select && ![...select.options].some(opt => opt.value === node.value)) select.value = node.value ? "custom" : "";
    compile();
  });

  el.addEventListener("change", event => {
    if (node.kind !== "style") return;
    const select = event.target.closest(".style-node-preset");
    if (!select) return;
    const text = el.querySelector(".style-node-text");
    if (select.value === "custom") {
      text?.focus();
      return;
    }
    node.value = select.value || "";
    if (text) text.value = node.value;
    compile();
  });

  el.addEventListener("pointerdown", event => {
    const socket = event.target.closest(".node-socket");
    if (socket) {
      startConnection(event, node.id, socket.dataset.socket);
      return;
    }
    if (event.target.closest("button, input, textarea, select, label")) return;
    el.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    dragState = { id: node.id, pointerId: event.pointerId, dx: point.x - node.x, dy: point.y - node.y };
    el.classList.add("dragging");
  });

  el.addEventListener("pointermove", event => {
    if (!dragState || dragState.id !== node.id) return;
    const point = getCanvasPoint(event);
    node.x = Math.max(18, point.x - dragState.dx);
    node.y = Math.max(90, point.y - dragState.dy);
    if (node.kind === "structure") {
      layoutAttachedModifiers();
      syncNodeElementPositions();
    } else {
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
    }
    drawEdges();
    compile();
  });

  el.addEventListener("pointerup", event => {
    if (!dragState || dragState.id !== node.id) return;
    el.releasePointerCapture(event.pointerId);
    el.classList.remove("dragging");
    dragState = null;
    render();
  });

  el.addEventListener("click", event => {
    const action = event.target.closest("button")?.dataset.action;
    if (action === "lyrics") openLyricsEditor(node.id);
    if (action === "delete") removeNode(node.id);
    if (action === "detach") detachEdges(node.id);
    if (action === "open-output") openOutputDialog();
    if (action === "copy-output") navigator.clipboard.writeText(compile().text);
    if (action === "rename") renameSection(node.id);
    if (action === "edit-mod") editModifier(node.id);
    if (action === "edit-style") editStyleNode(node.id);
  });

  el.addEventListener("contextmenu", event => {
    event.preventDefault();
    event.stopPropagation();
    lastContextPoint = getCanvasPoint(event);
    showContextMenu(event.clientX, event.clientY, node);
  });

  return el;
}

function renameSection(nodeId) {
  const node = nodeById(nodeId);
  if (!node) return;
  const next = prompt("Section label", node.label || node.type);
  if (next === null) return;
  node.label = next.trim() || node.type;
  render();
}

function editModifier(nodeId) {
  const node = nodeById(nodeId);
  if (!node) return;
  const next = prompt("Modifier text", node.value || "");
  if (next === null) return;
  node.value = next.trim() || node.value;
  render();
}

function editStyleNode(nodeId) {
  const node = nodeById(nodeId);
  if (!node) return;
  const next = prompt("Style text", node.value || "");
  if (next === null) return;
  node.value = next.trim() || node.value;
  render();
}

function socketPoint(node, socketKind) {
  const nodeEl = world.querySelector(`.graph-node[data-id="${CSS.escape(node.id)}"]`);
  const socketEl = nodeEl?.querySelector(`.node-socket.${socketKind}`);

  if (socketEl) {
    const socketRect = socketEl.getBoundingClientRect();
    const worldRect = world.getBoundingClientRect();
    return {
      x: (socketRect.left + socketRect.width / 2 - worldRect.left) / zoomLevel,
      y: (socketRect.top + socketRect.height / 2 - worldRect.top) / zoomLevel
    };
  }

  const width = node.kind === "output" || node.kind === "style" || node.kind === "title" ? 240 : node.kind === "modifier" ? 210 : 220;
  const height = node.kind === "modifier" ? 128 : node.kind === "output" ? 138 : node.kind === "style" ? 220 : node.kind === "title" ? 128 : 150;
  return {
    x: node.x + (socketKind === "out" ? width : 0),
    y: node.y + height * .48
  };
}

function drawEdgePath(fromPoint, toPoint, className = "edge-path") {
  const dx = Math.max(80, Math.abs(toPoint.x - fromPoint.x) * .5);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M ${fromPoint.x} ${fromPoint.y} C ${fromPoint.x + dx} ${fromPoint.y}, ${toPoint.x - dx} ${toPoint.y}, ${toPoint.x} ${toPoint.y}`);
  path.setAttribute("class", className);
  edgeLayer.appendChild(path);
}

function drawEdges(previewPoint = null) {
  edgeLayer.setAttribute("width", worldBounds.width);
  edgeLayer.setAttribute("height", worldBounds.height);
  edgeLayer.setAttribute("viewBox", `0 0 ${worldBounds.width} ${worldBounds.height}`);
  edgeLayer.innerHTML = "";

  project.edges.forEach(edge => {
    const from = nodeById(edge.from);
    const to = nodeById(edge.to);
    if (!from || !to) return;
    drawEdgePath(socketPoint(from, "out"), socketPoint(to, "in"), `edge-path ${(edge.type || "modifier")}`);
  });

  if (connectState && previewPoint) {
    const from = nodeById(connectState.fromId);
    if (from) drawEdgePath(socketPoint(from, "out"), previewPoint, "edge-path preview");
  }
}

function startConnection(event, nodeId, socketKind) {
  if (socketKind !== "out") return;
  event.preventDefault();
  event.stopPropagation();
  connectState = { fromId: nodeId };
  window.addEventListener("pointermove", onConnectionMove);
  window.addEventListener("pointerup", onConnectionEnd, { once: true });
  drawEdges(getCanvasPoint(event));
}

function onConnectionMove(event) {
  if (!connectState) return;
  drawEdges(canvasPointFromClient(event.clientX, event.clientY));
}

function onConnectionEnd(event) {
  window.removeEventListener("pointermove", onConnectionMove);
  if (!connectState) return;

  const targetNodeEl = document.elementFromPoint(event.clientX, event.clientY)?.closest(".graph-node");
  const targetId = targetNodeEl?.dataset.id;
  if (targetId) addEdge(connectState.fromId, targetId);
  connectState = null;
  render();
}

function render(options = {}) {
  ensureTitleNode();
  ensureStyleNode();
  ensureOutputNode();
  layoutAttachedModifiers();
  world.querySelectorAll(".graph-node").forEach(node => node.remove());
  project.nodes.forEach(node => world.appendChild(createNodeElement(node)));
  updateWorldBounds();

  if (options.fitToScreen) {
    // Fit after the DOM nodes exist. The previous responsive pass guessed from
    // scaffold math before the rendered boxes settled, which failed on smaller screens.
    fitStarterZoomToScreen();
  } else {
    drawEdges();
  }

  compile();
}

function showContextMenu(clientX, clientY, node = null) {
  hideContextMenu();
  contextMenu.hidden = false;
  contextMenu.style.left = `${Math.min(clientX, window.innerWidth - 270)}px`;
  contextMenu.style.top = `${Math.min(clientY, window.innerHeight - 360)}px`;

  if (!node) {
    contextMenu.innerHTML = `
      <h3>Add Node</h3>
      <small>Create nodes directly on the graph.</small>
      <div class="menu-sep"></div>
      <select id="ctx-section-type">${sectionOptionsHtml()}</select>
      <button class="btn primary" data-ctx="add-section" type="button">Add Section Node</button>
      <div class="menu-sep"></div>
      <select id="ctx-mod-type">${modifierTypeOptionsHtml("vocal")}</select>
      <select id="ctx-mod-item">${modifierItemOptionsHtml("vocal")}</select>
      <input id="ctx-mod-value" type="text" value="${escapeHtml(firstModifierValue("vocal"))}" />
      <button class="btn" data-ctx="add-modifier" type="button">Add Modifier Node</button>
      <div class="menu-sep"></div>
      <button class="btn" data-ctx="settings" type="button">Project Settings</button>
      <button class="btn" data-ctx="output" type="button">Open Output</button>
    `;
  } else if (node.kind === "structure") {
    contextMenu.innerHTML = `
      <h3>${escapeHtml(node.label)}</h3>
      <small>Structure node actions.</small>
      <div class="menu-sep"></div>
      <button class="btn primary" data-ctx="lyrics" type="button">Edit Lyrics</button>
      <button class="btn" data-ctx="rename" type="button">Rename Section</button>
      <div class="menu-sep"></div>
      <select id="ctx-mod-type">${modifierTypeOptionsHtml("vocal")}</select>
      <select id="ctx-mod-item">${modifierItemOptionsHtml("vocal")}</select>
      <input id="ctx-mod-value" type="text" value="${escapeHtml(firstModifierValue("vocal"))}" />
      <button class="btn" data-ctx="add-connected-modifier" type="button">Add Linked Modifier</button>
      <div class="menu-sep"></div>
      <button class="btn" data-ctx="detach" type="button">Unlink Connections</button>
      <button class="btn red" data-ctx="delete" type="button">Delete Node</button>
    `;
  } else if (node.kind === "modifier") {
    contextMenu.innerHTML = `
      <h3>${escapeHtml(node.value)}</h3>
      <small>Modifier controls for linked song sections.</small>
      <div class="menu-sep"></div>
      <button class="btn primary" data-ctx="edit-mod" type="button">Edit Modifier</button>
      <button class="btn" data-ctx="detach" type="button">Unlink Connections</button>
      <button class="btn red" data-ctx="delete" type="button">Delete Node</button>
    `;
  } else if (node.kind === "title") {
    contextMenu.innerHTML = `
      <h3>Song Title</h3>
      <small>Default node. Type the song title here to output TITLE.</small>
    `;
  } else if (node.kind === "style") {
    contextMenu.innerHTML = `
      <h3>Global Style</h3>
      <small>Default node. Choose a preset or type a custom global style.</small>
    `;
  } else {
    contextMenu.innerHTML = `
      <h3>Compiled TXT</h3>
      <small>Open the export popup to copy or download.</small>
      <div class="menu-sep"></div>
      <button class="btn primary" data-ctx="output" type="button">Open Output</button>
      <button class="btn" data-ctx="copy-output" type="button">Copy Output</button>
    `;
  }

  wireLibraryMenuControls(contextMenu);

  contextMenu.currentNode = node?.id || "";
}

function handleContextAction(event) {
  const node = nodeById(contextMenu.currentNode);
  const action = event.target.closest("button")?.dataset.ctx;
  if (!action) return;

  const sectionType = contextMenu.querySelector("#ctx-section-type")?.value;
  const modifierType = contextMenu.querySelector("#ctx-mod-type")?.value;
  const modifierValue = contextMenu.querySelector("#ctx-mod-value")?.value;
  const styleValue = contextMenu.querySelector("#ctx-style-value")?.value;
  hideContextMenu();

  if (action === "add-section") addSection(sectionType, lastContextPoint.x, lastContextPoint.y);
  if (action === "add-style") addStyleNode(styleValue, lastContextPoint.x, lastContextPoint.y);
  if (action === "add-modifier") addModifier(modifierType, modifierValue, lastContextPoint.x, lastContextPoint.y);
  if (action === "add-connected-modifier" && node) {
    const point = nextChildPoint(node);
    addModifier(modifierType, modifierValue, point.x, point.y, node.id);
  }
  if (action === "lyrics" && node) openLyricsEditor(node.id);
  if (action === "rename" && node) renameSection(node.id);
  if (action === "edit-mod" && node) editModifier(node.id);
  if (action === "edit-style" && node) editStyleNode(node.id);
  if (action === "detach" && node) detachEdges(node.id);
  if (action === "delete" && node) removeNode(node.id);
  if (action === "settings") openProjectSettings();
  if (action === "output") openOutputDialog();
  if (action === "copy-output") navigator.clipboard.writeText(compile().text);
}

function hideContextMenu() {
  contextMenu.hidden = true;
  contextMenu.innerHTML = "";
}

function openOutputDialog() {
  compile();
  outputDialog.showModal();
  output.focus();
  output.select();
}

function openProjectSettings() {
  titleInput.value = primaryTitleNode()?.value || project.meta.title || "";
  const styleValue = primaryStyleNode()?.value || project.global.style || "";
  styleInput.value = styleValue;
  if (stylePreset) stylePreset.value = [...stylePreset.options].some(opt => opt.value === styleValue) ? styleValue : (styleValue ? "custom" : "");
  negativeInput.value = project.global.negative || "";
  projectDialog.showModal();
}

function download(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportProject() {
  updateGlobals();
  download(`${project.meta.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "song"}_music_node_project.json`, JSON.stringify(project, null, 2), "application/json");
}

function importProject() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    project.meta = data.meta || project.meta;
    project.global = data.global || project.global;
    project.nodes = Array.isArray(data.nodes) ? data.nodes : [];
    project.edges = Array.isArray(data.edges) ? data.edges : [];
    render();
  });
  input.click();
}

function exportTxt() {
  updateGlobals();
  const compiled = compile();
  download(compiled.filename, compiled.text, "text/plain");
}

function clearGraph() {
  if (!confirm("Reset the graph to the blank starter layout?")) return;
  seedStarter();
}

function demoLayout() {
  const rect = canvas.getBoundingClientRect();
  const structureCount = 5;
  const gap = NODE_SIZE.structure.width + LAYOUT.nodeGapX;
  const total = (structureCount - 1) * gap + NODE_SIZE.structure.width;
  const startX = Math.max(LAYOUT.marginX, Math.round((rect.width - total) / 2));
  const topY = Math.max(150, canvas.scrollTop + 145);
  return { startX, topY, gap, modY: topY + CHILD_STACK.offsetY };
}


function starterScaffoldMetrics() {
  const titleX = LAYOUT.marginX;
  const styleX = titleX + NODE_SIZE.title.width + LAYOUT.nodeGapX;
  const startX = styleX + NODE_SIZE.style.width + LAYOUT.nodeGapX;
  const sectionStepX = NODE_SIZE.structure.width + LAYOUT.nodeGapX;
  const sectionCount = 7;
  const outputX = titleX;
  const outputYGap = 30;
  const rightEdge = startX + sectionStepX * (sectionCount - 1) + NODE_SIZE.structure.width;

  return { titleX, styleX, startX, sectionStepX, outputX, outputYGap, rightEdge };
}

function graphContentBounds() {
  const nodes = [...world.querySelectorAll(".graph-node")];
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = 0;
  let maxY = 0;

  nodes.forEach(el => {
    const node = nodeById(el.dataset.id);
    if (!node) return;
    const width = el.offsetWidth || nodeVisualSize(node).width;
    const height = el.offsetHeight || nodeVisualSize(node).height;
    minX = Math.min(minX, node.x || 0);
    minY = Math.min(minY, node.y || 0);
    maxX = Math.max(maxX, (node.x || 0) + width);
    maxY = Math.max(maxY, (node.y || 0) + height);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function fitStarterZoomToScreen() {
  const rect = canvas.getBoundingClientRect();
  const bounds = graphContentBounds();
  const availableWidth = Math.max(320, rect.width - LAYOUT.fitPaddingX);
  const availableHeight = Math.max(240, rect.height - 160);
  const widthZoom = availableWidth / Math.max(bounds.width, 1);
  const heightZoom = availableHeight / Math.max(bounds.height, 1);
  const desiredZoom = Math.min(1, Math.max(LAYOUT.minInitialZoom, Math.min(widthZoom, heightZoom)));

  applyZoom(desiredZoom);
  canvas.scrollLeft = Math.max(0, Math.round(bounds.minX * zoomLevel) - 42);
  canvas.scrollTop = 0;
  updateWorldBounds();
  drawEdges();
}

function seedStarter() {
  project.meta.title = "";
  project.global.style = "";
  project.global.negative = "";
  project.nodes = [];
  project.edges = [];

  const baseY = 120;
  const { titleX, styleX, startX, sectionStepX, outputX, outputYGap } = starterScaffoldMetrics();

  const sectionData = [
    ["Intro", "Intro"],
    ["Verse", "Verse 1"],
    ["Chorus", "Chorus"],
    ["Verse", "Verse 2"],
    ["Bridge", "Bridge"],
    ["Chorus", "Final Chorus"],
    ["Outro", "Outro"]
  ];

  project.nodes.push({
    id: uid("title"),
    kind: "title",
    type: "title",
    value: "",
    x: titleX,
    y: baseY
  });

  project.nodes.push({
    id: uid("style"),
    kind: "style",
    type: "style",
    value: "",
    x: styleX,
    y: baseY
  });

  const sectionIds = [];
  sectionData.forEach(([type, label], index) => {
    const id = uid("section");
    sectionIds.push(id);
    project.nodes.push({
      id,
      kind: "structure",
      type,
      label,
      lyrics: "",
      x: startX + sectionStepX * index,
      y: baseY
    });
  });

  for (let i = 0; i < sectionIds.length - 1; i += 1) {
    project.edges.push({ from: sectionIds[i], to: sectionIds[i + 1], type: "flow" });
  }

  project.nodes.push({
    id: uid("output"),
    kind: "output",
    type: "output",
    label: "Compiled TXT",
    x: outputX,
    y: baseY + NODE_SIZE.title.height + outputYGap
  });

  canvas.scrollLeft = 0;
  canvas.scrollTop = 0;
  zoomLevel = 1;
  world.style.transform = "scale(1)";
  render({ fitToScreen: true });
}

function seedDemo() {
  project.meta.title = "Two Hands on the Door";
  project.global.style = "Dark folk rock, cinematic alternative, introspective male vocals, haunting atmosphere, organic instrumentation, steady drums, rich harmonies";
  project.global.negative = "";
  project.nodes = [];
  project.edges = [];

  const layout = demoLayout();
  project.nodes.push({ id: uid("title"), kind: "title", type: "title", value: "Two Hands on the Door", x: layout.startX, y: Math.max(75, layout.topY - 210) });
  project.nodes.push({ id: uid("style"), kind: "style", type: "style", value: "dark folk rock, cinematic alternative", x: layout.startX + 270, y: Math.max(75, layout.topY - 210) });
  const sectionData = [
    ["Verse", "Verse 1", "I kept a chair for the stranger\nand a knife beneath the plate.", layout.startX, layout.topY],
    ["Chorus", "Chorus", "One hand opens.\nOne hand stays.\nOne counts blessings.\nOne counts days.", layout.startX + layout.gap, layout.topY],
    ["Verse", "Verse 2", "I gave my coat to winter,\nthen cursed the man who froze.", layout.startX + layout.gap * 2, layout.topY],
    ["Bridge", "Bridge", "Do not weigh me by the candle.\nDo not name me by the smoke.", layout.startX + layout.gap * 3, layout.topY],
    ["Chorus", "Final Chorus", "One hand opens.\nOne hand stays.\nThere are two hands on the door,\nand I answer to them all.", layout.startX + layout.gap * 4, layout.topY]
  ];

  const sectionIds = [];
  sectionData.forEach(([type, label, lyrics, x, y]) => {
    const id = uid("section");
    sectionIds.push(id);
    project.nodes.push({ id, kind: "structure", type, label, lyrics, x, y });
  });

  for (let i = 0; i < sectionIds.length - 1; i += 1) {
    project.edges.push({ from: sectionIds[i], to: sectionIds[i + 1], type: "flow" });
  }

  const modifiers = [
    ["vocal", "Introspective Male Vocals", 0, layout.startX, layout.modY],
    ["arrangement", "Sparse Arrangement", 0, layout.startX + 235, layout.modY],
    ["vocal", "Harmonized Vocals", 1, layout.startX + layout.gap + 70, layout.modY],
    ["energy", "Rising Intensity", 1, layout.startX + layout.gap + 305, layout.modY],
    ["arrangement", "Stripped Down", 3, layout.startX + layout.gap * 3, layout.modY],
    ["energy", "Emotional Climax", 4, layout.startX + layout.gap * 4, layout.modY]
  ];

  modifiers.forEach(([type, value, sectionIndex, x, y]) => {
    const id = uid("modifier");
    project.nodes.push({ id, kind: "modifier", type, value, x, y });
    project.edges.push({ from: id, to: sectionIds[sectionIndex], type: "modifier" });
  });

  project.nodes.push({ id: uid("output"), kind: "output", type: "output", label: "Compiled TXT", x: layout.startX + layout.gap * 5 + 25, y: layout.topY });
  canvas.scrollLeft = Math.max(0, layout.startX - 80);
  canvas.scrollTop = 0;
  render();
}

canvas.addEventListener("contextmenu", event => {
  if (event.target.closest(".graph-node")) return;
  event.preventDefault();
  lastContextPoint = getCanvasPoint(event);
  showContextMenu(event.clientX, event.clientY, null);
});

contextMenu.addEventListener("click", handleContextAction);

window.addEventListener("click", event => {
  if (!event.target.closest(".context-menu")) hideContextMenu();
});

canvas.addEventListener("scroll", () => drawEdges());
canvas.addEventListener("wheel", handleZoomWheel, { passive: false });

document.querySelector("#btn-save-lyrics").addEventListener("click", saveLyrics);
lyricsEditor.addEventListener("input", () => {
  dialogMeta.textContent = `${lineCount(lyricsEditor.value)} lines`;
});

document.querySelector("#btn-save-project-settings").addEventListener("click", () => updateGlobals(true));
document.querySelector("#btn-settings").addEventListener("click", openProjectSettings);
document.querySelector("#btn-save-project").addEventListener("click", exportProject);
document.querySelector("#btn-load-project").addEventListener("click", importProject);
document.querySelector("#btn-export-txt").addEventListener("click", exportTxt);
document.querySelector("#btn-download-output-modal").addEventListener("click", exportTxt);
document.querySelector("#btn-copy-output").addEventListener("click", () => navigator.clipboard.writeText(output.value));
document.querySelector("#btn-clear-graph").addEventListener("click", clearGraph);
document.querySelector("#btn-seed-demo").addEventListener("click", seedDemo);

[titleInput, styleInput, negativeInput].forEach(input => input.addEventListener("input", () => updateGlobals(false)));
stylePreset?.addEventListener("change", () => {
  if (!stylePreset.value || stylePreset.value === "custom") {
    styleInput.focus();
    return;
  }
  styleInput.value = stylePreset.value;
  updateGlobals(false);
});

loadNodeData().finally(() => {
  populateStylePresetSelect();
  seedStarter();
});
