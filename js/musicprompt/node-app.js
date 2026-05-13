import { compileNodeProject } from "./node-compiler.js";

const STORAGE_VERSION = "node-graph-0.2.0";
const canvas = document.querySelector("#node-canvas");
const edgeLayer = document.querySelector("#edge-layer");
const output = document.querySelector("#compiled-output");
const titleInput = document.querySelector("#song-title");
const styleInput = document.querySelector("#style-text");
const negativeInput = document.querySelector("#negative-text");
const lyricsDialog = document.querySelector("#lyrics-dialog");
const lyricsEditor = document.querySelector("#lyrics-editor");
const dialogTitle = document.querySelector("#dialog-title");
const dialogMeta = document.querySelector("#dialog-meta");
const outputDialog = document.querySelector("#output-dialog");
const projectDialog = document.querySelector("#project-dialog");
const contextMenu = document.querySelector("#context-menu");

const SECTION_TYPES = ["Intro", "Verse", "Pre-Chorus", "Chorus", "Post-Chorus", "Bridge", "Breakdown", "Interlude", "Solo", "Instrumental", "Outro", "End"];
const MODIFIER_TYPES = ["vocal", "arrangement", "energy", "instrument", "production", "negative"];
const DEFAULT_MODIFIERS = {
  vocal: "Raspy Male Vocals",
  arrangement: "Sparse Arrangement",
  energy: "Rising Intensity",
  instrument: "Guitar Solo",
  production: "Raw Analog Production",
  negative: "no trap hi-hats"
};

let activeLyricsNodeId = null;
let dragState = null;
let connectState = null;
let lastContextPoint = { x: 260, y: 180 };

const project = {
  meta: { title: "Untitled Song", version: STORAGE_VERSION },
  global: { style: "", negative: "" },
  nodes: [],
  edges: []
};

function uid(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function nodeById(id) {
  return project.nodes.find(node => node.id === id);
}

function canvasPointFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left + canvas.scrollLeft,
    y: clientY - rect.top + canvas.scrollTop
  };
}

function getCanvasPoint(event) {
  return canvasPointFromClient(event.clientX, event.clientY);
}

function sectionCount(type) {
  return project.nodes.filter(node => node.kind === "structure" && node.type === type).length + 1;
}

function ensureOutputNode() {
  if (project.nodes.some(node => node.kind === "output")) return;
  project.nodes.push({
    id: uid("output"),
    kind: "output",
    type: "output",
    label: "Suno TXT Output",
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
  if (doRender) render();
  return true;
}

function resolveEdgeType(from, to) {
  if (from.kind === "modifier" && to.kind === "structure") return "modifier";
  if (from.kind === "structure" && to.kind === "structure") return "flow";
  return null;
}

function removeNode(id) {
  project.nodes = project.nodes.filter(node => node.id !== id);
  project.edges = project.edges.filter(edge => edge.from !== id && edge.to !== id);
  render();
}

function detachEdges(id) {
  project.edges = project.edges.filter(edge => edge.from !== id && edge.to !== id);
  render();
}

function updateGlobals(closeDialog = false) {
  project.meta.title = titleInput.value.trim() || "Untitled Song";
  project.global.style = styleInput.value.trim();
  project.global.negative = negativeInput.value.trim();
  compile();
  if (closeDialog) projectDialog.close();
}

function compile() {
  const compiled = compileNodeProject(project);
  output.value = compiled.text;
  const outputNode = project.nodes.find(node => node.kind === "output");
  if (outputNode) {
    outputNode.lines = compiled.text.split(/\n/).length;
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
  dialogTitle.textContent = `Edit Lyrics: ${node.label}`;
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
  socket.title = kind === "out" ? "Drag connection from here" : "Drop connection here";
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
      <div class="node-meta">Modifiers: ${attached} · Flow out: ${outgoing}</div>
      <div class="node-actions">
        <button class="mini-btn" data-action="lyrics" type="button">Lyrics</button>
        <button class="mini-btn" data-action="rename" type="button">Rename</button>
        <button class="mini-btn" data-action="detach" type="button">Detach</button>
        <button class="mini-btn danger" data-action="delete" type="button">Delete</button>
      </div>
    `;
    el.appendChild(createSocket("in"));
    el.appendChild(createSocket("out"));
  } else if (node.kind === "modifier") {
    const attached = project.edges.filter(edge => (edge.type || "modifier") === "modifier" && edge.from === node.id).length;
    el.innerHTML = `
      <div class="node-title"><strong>${escapeHtml(node.value)}</strong><span>${escapeHtml(node.type)}</span></div>
      <div class="node-meta">Attached to: ${attached} section${attached === 1 ? "" : "s"}</div>
      <div class="node-actions">
        <button class="mini-btn" data-action="edit-mod" type="button">Edit</button>
        <button class="mini-btn" data-action="detach" type="button">Detach</button>
        <button class="mini-btn danger" data-action="delete" type="button">Delete</button>
      </div>
    `;
    el.appendChild(createSocket("out"));
  } else if (node.kind === "output") {
    const compiled = compileNodeProject(project);
    el.innerHTML = `
      <div class="node-title"><strong>Compiled TXT</strong><span>output</span></div>
      <div class="node-meta">${compiled.filename}</div>
      <div class="node-meta">${compiled.text.split(/\n/).length} lines ready</div>
      <div class="node-actions">
        <button class="mini-btn" data-action="open-output" type="button">Open</button>
        <button class="mini-btn" data-action="copy-output" type="button">Copy</button>
      </div>
    `;
  }

  el.addEventListener("pointerdown", event => {
    const socket = event.target.closest(".node-socket");
    if (socket) {
      startConnection(event, node.id, socket.dataset.socket);
      return;
    }
    if (event.target.closest("button")) return;
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
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
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
  const next = prompt("Modifier value", node.value || "");
  if (next === null) return;
  node.value = next.trim() || node.value;
  render();
}

function socketPoint(node, socketKind) {
  const width = node.kind === "output" ? 240 : node.kind === "modifier" ? 210 : 220;
  const height = node.kind === "modifier" ? 112 : node.kind === "output" ? 138 : 132;
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
  edgeLayer.setAttribute("width", Math.max(canvas.scrollWidth, 3000));
  edgeLayer.setAttribute("height", Math.max(canvas.scrollHeight, 1800));
  edgeLayer.setAttribute("viewBox", `0 0 ${Math.max(canvas.scrollWidth, 3000)} ${Math.max(canvas.scrollHeight, 1800)}`);
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

function render() {
  ensureOutputNode();
  canvas.querySelectorAll(".graph-node").forEach(node => node.remove());
  project.nodes.forEach(node => canvas.appendChild(createNodeElement(node)));
  drawEdges();
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
      <select id="ctx-section-type">${SECTION_TYPES.map(type => `<option value="${type}">${type}</option>`).join("")}</select>
      <button class="btn primary" data-ctx="add-section" type="button">Add Structure Node</button>
      <div class="menu-sep"></div>
      <select id="ctx-mod-type">${MODIFIER_TYPES.map(type => `<option value="${type}">${type}</option>`).join("")}</select>
      <input id="ctx-mod-value" type="text" value="${DEFAULT_MODIFIERS.vocal}" />
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
      <select id="ctx-mod-type">${MODIFIER_TYPES.map(type => `<option value="${type}">${type}</option>`).join("")}</select>
      <input id="ctx-mod-value" type="text" value="${DEFAULT_MODIFIERS.vocal}" />
      <button class="btn" data-ctx="add-connected-modifier" type="button">Add Connected Modifier</button>
      <div class="menu-sep"></div>
      <button class="btn" data-ctx="detach" type="button">Detach Connections</button>
      <button class="btn red" data-ctx="delete" type="button">Delete Node</button>
    `;
  } else if (node.kind === "modifier") {
    contextMenu.innerHTML = `
      <h3>${escapeHtml(node.value)}</h3>
      <small>Modifier node actions.</small>
      <div class="menu-sep"></div>
      <button class="btn primary" data-ctx="edit-mod" type="button">Edit Modifier</button>
      <button class="btn" data-ctx="detach" type="button">Detach Connections</button>
      <button class="btn red" data-ctx="delete" type="button">Delete Node</button>
    `;
  } else {
    contextMenu.innerHTML = `
      <h3>Compiled TXT Output</h3>
      <small>Open the popup to copy or export.</small>
      <div class="menu-sep"></div>
      <button class="btn primary" data-ctx="output" type="button">Open Output</button>
      <button class="btn" data-ctx="copy-output" type="button">Copy Output</button>
    `;
  }

  contextMenu.querySelector("#ctx-mod-type")?.addEventListener("change", event => {
    const valueInput = contextMenu.querySelector("#ctx-mod-value");
    if (valueInput) valueInput.value = DEFAULT_MODIFIERS[event.target.value] || "";
  });

  contextMenu.currentNode = node?.id || "";
}

function handleContextAction(event) {
  const node = nodeById(contextMenu.currentNode);
  const action = event.target.closest("button")?.dataset.ctx;
  if (!action) return;

  const sectionType = contextMenu.querySelector("#ctx-section-type")?.value;
  const modifierType = contextMenu.querySelector("#ctx-mod-type")?.value;
  const modifierValue = contextMenu.querySelector("#ctx-mod-value")?.value;
  hideContextMenu();

  if (action === "add-section") addSection(sectionType, lastContextPoint.x, lastContextPoint.y);
  if (action === "add-modifier") addModifier(modifierType, modifierValue, lastContextPoint.x, lastContextPoint.y);
  if (action === "add-connected-modifier" && node) addModifier(modifierType, modifierValue, node.x + 20, node.y + 165, node.id);
  if (action === "lyrics" && node) openLyricsEditor(node.id);
  if (action === "rename" && node) renameSection(node.id);
  if (action === "edit-mod" && node) editModifier(node.id);
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
  titleInput.value = project.meta.title || "Untitled Song";
  styleInput.value = project.global.style || "";
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
  if (!confirm("Clear the node graph?")) return;
  project.nodes = [];
  project.edges = [];
  render();
}

function demoLayout() {
  const rect = canvas.getBoundingClientRect();
  const structureCount = 5;
  const gap = 270;
  const total = (structureCount - 1) * gap + 220;
  const startX = Math.max(70, Math.round((rect.width - total) / 2));
  const topY = Math.max(150, canvas.scrollTop + 145);
  return { startX, topY, gap, modY: topY + 190 };
}

function seedDemo() {
  project.meta.title = "Two Hands on the Door";
  project.global.style = "Dark folk rock, cinematic alternative, introspective male vocals, haunting atmosphere, organic instrumentation, steady drums, rich harmonies";
  project.global.negative = "";
  project.nodes = [];
  project.edges = [];

  const layout = demoLayout();
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

  project.nodes.push({ id: uid("output"), kind: "output", type: "output", label: "Suno TXT Output", x: layout.startX + layout.gap * 5 + 25, y: layout.topY });
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

seedDemo();
