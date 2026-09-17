import { compileProject, diagnoseProject } from "./compiler.js";

const PROJECT_VERSION = "1.0.0";
const SECTION_TYPES = ["Intro", "Verse", "Pre-Chorus", "Chorus", "Post-Chorus", "Hook", "Break", "Buildup", "Drop", "Bridge", "Breakdown", "Interlude", "Instrumental", "Solo", "Spoken", "Outro", "Custom"];
const FALLBACK_TEMPLATES = [
  { id: "blank", name: "Blank Project", sections: [] },
  { id: "verse-chorus", name: "Verse / Chorus", sections: ["Verse", "Chorus", "Verse", "Chorus", "Bridge", "Final Chorus"] },
  { id: "story-ballad", name: "Story Ballad", sections: ["Intro", "Verse", "Verse", "Chorus", "Verse", "Bridge", "Final Chorus", "Outro"] },
  { id: "progressive-build", name: "Progressive Build", sections: ["Intro", "Movement I", "Interlude", "Movement II", "Breakdown", "Finale", "Outro"] },
  { id: "electronic-drop", name: "Electronic Drop", sections: ["Intro", "Buildup", "Drop", "Break", "Buildup", "Final Drop", "Outro"] },
  { id: "instrumental-arc", name: "Instrumental Arc", sections: ["Intro", "Theme", "Development", "Interlude", "Climax", "Outro"] }
];

const byId = id => document.getElementById(id);
const els = Object.fromEntries([
  "basicMode", "advancedMode", "newProject", "saveProject", "loadProject", "toggleOutput", "collapseDirection", "collapseInspector",
  "songTitle", "modelTarget", "structureTemplate", "applyTemplate", "identity", "pulse", "players", "performance", "arc", "mix", "constraints",
  "addSection", "addFirstSection", "structureBoard", "emptyStructure", "sectionInspector", "inspectorEmpty", "sectionType", "sectionName",
  "sectionLyrics", "sectionDirection", "sectionEnergy", "sectionVocal", "sectionInstruments", "sectionArrangement", "sectionMix", "sectionExclude",
  "outputDrawer", "closeOutput", "styleOutput", "lyricsOutput", "diagnosticCount", "diagnosticList", "copyPackage", "downloadTxt",
  "sectionDialog", "sectionTypeGrid", "customSectionName", "confirmAddSection"
].map(id => [id, byId(id)]));

let templates = FALLBACK_TEMPLATES;
let selectedSectionId = null;
let pendingSectionType = "Verse";
let draggedSectionId = null;
let project = blankProject();

function blankProject() {
  return {
    version: PROJECT_VERSION,
    title: "",
    model: "v6",
    mode: "basic",
    global: { identity: "", pulse: "", players: "", performance: "", arc: "", mix: "", constraints: "" },
    sections: []
  };
}

function uid() {
  return `section_${crypto.randomUUID().slice(0, 8)}`;
}

function sectionBase(type, explicitName = "") {
  const normalizedType = SECTION_TYPES.includes(type) ? type : "Custom";
  const sameTypeCount = project.sections.filter(item => item.type === normalizedType).length + 1;
  const numbered = ["Verse", "Chorus", "Pre-Chorus", "Hook", "Drop", "Bridge"].includes(normalizedType);
  return {
    id: uid(),
    type: normalizedType,
    name: explicitName || (numbered && sameTypeCount > 1 ? `${normalizedType} ${sameTypeCount}` : normalizedType),
    lyrics: "",
    direction: "",
    energy: "",
    vocal: "",
    instruments: "",
    arrangement: "",
    mix: "",
    exclude: ""
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function selectedSection() {
  return project.sections.find(section => section.id === selectedSectionId) || null;
}

function lineCount(value) {
  const text = String(value || "").trim();
  return text ? text.split(/\n/).length : 0;
}

async function loadTemplates() {
  try {
    const response = await fetch("data/musicprompt/structure-templates.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Template request failed: ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data.templates) && data.templates.length) templates = data.templates;
  } catch (error) {
    console.warn("Structure templates unavailable; using built-in templates.", error);
  }
  els.structureTemplate.innerHTML = templates.map(template => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`).join("");
}

function setMode(mode) {
  project.mode = mode === "advanced" ? "advanced" : "basic";
  document.body.classList.toggle("advanced-mode", project.mode === "advanced");
  els.basicMode.classList.toggle("active", project.mode === "basic");
  els.advancedMode.classList.toggle("active", project.mode === "advanced");
  els.basicMode.setAttribute("aria-pressed", String(project.mode === "basic"));
  els.advancedMode.setAttribute("aria-pressed", String(project.mode === "advanced"));
}

function syncGlobalInputs() {
  els.songTitle.value = project.title;
  els.modelTarget.value = project.model;
  Object.keys(project.global).forEach(key => { if (els[key]) els[key].value = project.global[key] || ""; });
  setMode(project.mode);
}

function updateProjectFromGlobals() {
  project.title = els.songTitle.value.trim();
  project.model = els.modelTarget.value;
  Object.keys(project.global).forEach(key => { project.global[key] = els[key]?.value.trim() || ""; });
  updateOutput();
}

function renderBoard() {
  els.emptyStructure.hidden = project.sections.length > 0;
  els.structureBoard.hidden = project.sections.length === 0;
  els.structureBoard.innerHTML = project.sections.map((section, index) => {
    const selected = section.id === selectedSectionId;
    const detail = section.direction || section.arrangement || section.vocal || "No section direction yet";
    return `<article class="section-card${selected ? " selected" : ""}" data-id="${escapeHtml(section.id)}" draggable="true" role="listitem" aria-label="${escapeHtml(`${index + 1}. ${section.name}`)}">
      <button class="section-select" type="button" data-action="select">
        <span class="section-order">${index + 1}</span>
        <span class="section-card-copy"><strong>${escapeHtml(section.name)}</strong><small>${escapeHtml(section.type)} · ${lineCount(section.lyrics)} lyric lines</small><span>${escapeHtml(detail)}</span></span>
        <span class="energy-indicator">${escapeHtml(section.energy || "Energy unset")}</span>
      </button>
      <div class="section-actions" aria-label="Section actions">
        <button type="button" data-action="left" aria-label="Move ${escapeHtml(section.name)} left" ${index === 0 ? "disabled" : ""}>←</button>
        <button type="button" data-action="right" aria-label="Move ${escapeHtml(section.name)} right" ${index === project.sections.length - 1 ? "disabled" : ""}>→</button>
        <button type="button" data-action="duplicate" aria-label="Duplicate ${escapeHtml(section.name)}">Duplicate</button>
        <button class="danger" type="button" data-action="delete" aria-label="Delete ${escapeHtml(section.name)}">Delete</button>
      </div>
    </article>`;
  }).join("");
  bindBoardEvents();
  renderInspector();
  updateOutput();
}

function bindBoardEvents() {
  els.structureBoard.querySelectorAll(".section-card").forEach(card => {
    card.querySelectorAll("button").forEach(button => button.addEventListener("click", () => handleSectionAction(card.dataset.id, button.dataset.action)));
    card.addEventListener("dragstart", event => { draggedSectionId = card.dataset.id; event.dataTransfer.effectAllowed = "move"; card.classList.add("dragging"); });
    card.addEventListener("dragend", () => { draggedSectionId = null; card.classList.remove("dragging"); });
    card.addEventListener("dragover", event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; });
    card.addEventListener("drop", event => { event.preventDefault(); reorderById(draggedSectionId, card.dataset.id); });
  });
}

function handleSectionAction(id, action) {
  const index = project.sections.findIndex(section => section.id === id);
  if (index < 0) return;
  if (action === "select") selectedSectionId = id;
  if (action === "left" && index > 0) [project.sections[index - 1], project.sections[index]] = [project.sections[index], project.sections[index - 1]];
  if (action === "right" && index < project.sections.length - 1) [project.sections[index + 1], project.sections[index]] = [project.sections[index], project.sections[index + 1]];
  if (action === "duplicate") {
    const copy = { ...project.sections[index], id: uid(), name: `${project.sections[index].name} Copy` };
    project.sections.splice(index + 1, 0, copy);
    selectedSectionId = copy.id;
  }
  if (action === "delete") {
    if (!window.confirm(`Delete ${project.sections[index].name}?`)) return;
    project.sections.splice(index, 1);
    selectedSectionId = project.sections[index]?.id || project.sections[index - 1]?.id || null;
  }
  renderBoard();
}

function reorderById(sourceId, targetId) {
  if (!sourceId || sourceId === targetId) return;
  const sourceIndex = project.sections.findIndex(section => section.id === sourceId);
  const targetIndex = project.sections.findIndex(section => section.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [moved] = project.sections.splice(sourceIndex, 1);
  project.sections.splice(targetIndex, 0, moved);
  renderBoard();
}

function renderInspector() {
  const section = selectedSection();
  els.inspectorEmpty.hidden = Boolean(section);
  els.sectionInspector.hidden = !section;
  if (!section) return;
  els.sectionType.value = section.type;
  els.sectionName.value = section.name;
  els.sectionLyrics.value = section.lyrics;
  els.sectionDirection.value = section.direction;
  els.sectionEnergy.value = section.energy;
  els.sectionVocal.value = section.vocal;
  els.sectionInstruments.value = section.instruments;
  els.sectionArrangement.value = section.arrangement;
  els.sectionMix.value = section.mix;
  els.sectionExclude.value = section.exclude;
}

function updateSelectedSection() {
  const section = selectedSection();
  if (!section) return;
  section.type = els.sectionType.value;
  section.name = els.sectionName.value.trim() || section.type;
  section.lyrics = els.sectionLyrics.value;
  section.direction = els.sectionDirection.value.trim();
  section.energy = els.sectionEnergy.value;
  section.vocal = els.sectionVocal.value.trim();
  section.instruments = els.sectionInstruments.value.trim();
  section.arrangement = els.sectionArrangement.value.trim();
  section.mix = els.sectionMix.value.trim();
  section.exclude = els.sectionExclude.value.trim();
  renderBoard();
}

function showAddSectionDialog() {
  pendingSectionType = "Verse";
  els.customSectionName.value = "";
  els.sectionTypeGrid.innerHTML = SECTION_TYPES.map(type => `<button class="section-type-option${type === pendingSectionType ? " selected" : ""}" type="button" data-type="${escapeHtml(type)}">${escapeHtml(type)}</button>`).join("");
  els.sectionTypeGrid.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    pendingSectionType = button.dataset.type;
    els.sectionTypeGrid.querySelectorAll("button").forEach(item => item.classList.toggle("selected", item === button));
    els.customSectionName.closest("label").classList.toggle("visible", pendingSectionType === "Custom");
  }));
  els.customSectionName.closest("label").classList.remove("visible");
  els.sectionDialog.showModal();
}

function addPendingSection() {
  const name = pendingSectionType === "Custom" ? els.customSectionName.value.trim() : "";
  if (pendingSectionType === "Custom" && !name) { els.customSectionName.focus(); return; }
  const section = sectionBase(pendingSectionType, name);
  project.sections.push(section);
  selectedSectionId = section.id;
  els.sectionDialog.close();
  renderBoard();
}

function applySelectedTemplate() {
  const template = templates.find(item => item.id === els.structureTemplate.value);
  if (!template) return;
  if (project.sections.length && !window.confirm("Replace the current song structure with this template?")) return;
  project.sections = (template.sections || []).map(name => {
    const known = SECTION_TYPES.find(type => name === type || name.startsWith(type));
    return sectionBase(known || "Custom", name);
  });
  selectedSectionId = project.sections[0]?.id || null;
  renderBoard();
}

function updateOutput() {
  const compiled = compileProject(project);
  els.styleOutput.value = compiled.style;
  els.lyricsOutput.value = compiled.lyrics;
  const issues = diagnoseProject(project);
  els.diagnosticCount.textContent = `${issues.length} ${issues.length === 1 ? "item" : "items"}`;
  els.diagnosticList.innerHTML = issues.map(issue => `<article class="diagnostic-item ${escapeHtml(issue.level)}"><span>${issue.level === "good" ? "✓" : issue.level === "error" ? "!" : "•"}</span><p>${escapeHtml(issue.text)}</p></article>`).join("");
}

function slug(value) {
  return String(value || "song").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "song";
}

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function saveProject() {
  updateProjectFromGlobals();
  download(`${slug(project.title)}.softsin-music.json`, JSON.stringify(project, null, 2), "application/json");
}

function loadProject() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,.softsin-music.json";
  input.addEventListener("change", async () => {
    try {
      const data = JSON.parse(await input.files[0].text());
      if (!data || !Array.isArray(data.sections) || typeof data.global !== "object") throw new Error("Invalid project file");
      project = { ...blankProject(), ...data, global: { ...blankProject().global, ...data.global }, version: PROJECT_VERSION };
      selectedSectionId = project.sections[0]?.id || null;
      syncGlobalInputs();
      renderBoard();
    } catch (error) {
      window.alert(`This project could not be loaded. ${error.message}`);
    }
  });
  input.click();
}

function newProject() {
  if ((project.sections.length || project.title || Object.values(project.global).some(Boolean)) && !window.confirm("Start a new project? Unsaved changes will be lost.")) return;
  project = blankProject();
  selectedSectionId = null;
  syncGlobalInputs();
  renderBoard();
}

async function copyText(value, button) {
  await navigator.clipboard.writeText(value);
  const original = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => { button.textContent = original; }, 1200);
}

function togglePanel(name) {
  document.body.classList.toggle(`${name}-collapsed`);
}

function bindEvents() {
  els.basicMode.addEventListener("click", () => setMode("basic"));
  els.advancedMode.addEventListener("click", () => setMode("advanced"));
  els.newProject.addEventListener("click", newProject);
  els.saveProject.addEventListener("click", saveProject);
  els.loadProject.addEventListener("click", loadProject);
  els.toggleOutput.addEventListener("click", () => { updateOutput(); els.outputDrawer.hidden = false; document.body.classList.add("output-open"); });
  els.closeOutput.addEventListener("click", () => { els.outputDrawer.hidden = true; document.body.classList.remove("output-open"); });
  els.collapseDirection.addEventListener("click", () => togglePanel("direction"));
  els.collapseInspector.addEventListener("click", () => togglePanel("inspector"));
  els.addSection.addEventListener("click", showAddSectionDialog);
  els.addFirstSection.addEventListener("click", showAddSectionDialog);
  els.confirmAddSection.addEventListener("click", addPendingSection);
  els.applyTemplate.addEventListener("click", applySelectedTemplate);

  [els.songTitle, els.modelTarget, els.identity, els.pulse, els.players, els.performance, els.arc, els.mix, els.constraints].forEach(input => input.addEventListener("input", updateProjectFromGlobals));
  [els.sectionType, els.sectionName, els.sectionLyrics, els.sectionDirection, els.sectionEnergy, els.sectionVocal, els.sectionInstruments, els.sectionArrangement, els.sectionMix, els.sectionExclude].forEach(input => input.addEventListener("change", updateSelectedSection));
  els.sectionLyrics.addEventListener("input", () => { const section = selectedSection(); if (section) { section.lyrics = els.sectionLyrics.value; updateOutput(); } });

  document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", () => copyText(button.dataset.copy === "style" ? els.styleOutput.value : els.lyricsOutput.value, button)));
  els.copyPackage.addEventListener("click", () => copyText(compileProject(project).packageText, els.copyPackage));
  els.downloadTxt.addEventListener("click", () => download(`${slug(project.title)}-v6-prompt.txt`, compileProject(project).packageText, "text/plain"));
}

async function init() {
  els.sectionType.innerHTML = SECTION_TYPES.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("");
  await loadTemplates();
  bindEvents();
  syncGlobalInputs();
  renderBoard();
}

init();
