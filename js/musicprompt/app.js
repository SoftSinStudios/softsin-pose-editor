
import { loadData } from "./loader.js";
import { compilePrompt } from "./compiler.js";
import { analyzeSelection } from "./checker.js";
import { populateSelect, renderDiagnostics, renderExclusionCheckboxes, copyText } from "./ui.js";

const STORAGE_KEY = "music_prompt_builder_recipes";

const state = {
  data: {},
  selected: {
    preset: "",
    genre: "",
    reference: "",
    mood: "",
    vocal: "",
    vocalSpace: "",
    instrument: "",
    production: "",
    structure: "",
    bpm: "",
    exclusions: [],
    suno: {
      weirdness: 25,
      styleInfluence: 85,
      excludeLimit: 950
    }
  }
};

const dom = {
  preset: document.querySelector("#preset-select"),
  genre: document.querySelector("#genre-select"),
  reference: document.querySelector("#reference-select"),
  mood: document.querySelector("#mood-select"),
  vocal: document.querySelector("#vocal-select"),
  vocalSpace: document.querySelector("#vocal-space-select"),
  instrument: document.querySelector("#instrument-select"),
  production: document.querySelector("#production-select"),
  structure: document.querySelector("#structure-select"),
  bpm: document.querySelector("#bpm-input"),
  exclusionList: document.querySelector("#exclusion-list"),
  lyrics: document.querySelector("#lyrics-input"),
  sectionDetail: document.querySelector("#section-detail"),
  customNotes: document.querySelector("#custom-notes"),
  compiledPrompt: document.querySelector("#compiled-prompt"),
  compiledExclude: document.querySelector("#compiled-exclude"),
  excludeCount: document.querySelector("#exclude-count"),
  health: document.querySelector("#prompt-health"),
  risks: document.querySelector("#risk-list"),
  warnings: document.querySelector("#warnings-list"),
  helpers: document.querySelector("#helpers-list"),
  recipeName: document.querySelector("#recipe-name"),
  savedRecipes: document.querySelector("#saved-recipes"),
  sunoWeirdness: document.querySelector("#suno-weirdness"),
  sunoStyleInfluence: document.querySelector("#suno-style-influence"),
  excludeLimit: document.querySelector("#exclude-limit")
};

function getRecipePayload() {
  return {
    selections: structuredClone(state.selected),
    lyrics: dom.lyrics.value,
    sectionDetail: dom.sectionDetail.value,
    customNotes: dom.customNotes.value,
    suno: structuredClone(state.selected.suno)
  };
}

function loadRecipes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecipes(recipes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function refreshRecipeDropdown() {
  const recipes = loadRecipes();

  dom.savedRecipes.innerHTML = '<option value="">Load saved recipe...</option>';

  recipes.forEach(recipe => {
    const option = document.createElement("option");
    option.value = recipe.name;
    option.textContent = recipe.name;
    dom.savedRecipes.appendChild(option);
  });
}

function applyRecipe(recipe) {
  if (!recipe) return;

  state.selected = structuredClone(recipe.selections || state.selected);

  dom.lyrics.value = recipe.lyrics || "";
  dom.sectionDetail.value = recipe.sectionDetail || "";
  dom.customNotes.value = recipe.customNotes || "";
  state.selected.suno = recipe.suno || state.selected.suno;

  syncControlsFromState();
  updateOutput();
}

function saveCurrentRecipe() {
  const name = dom.recipeName.value.trim();

  if (!name) {
    alert("Recipe needs a name.");
    return;
  }

  const recipes = loadRecipes().filter(r => r.name !== name);

  recipes.push({
    name,
    ...getRecipePayload()
  });

  saveRecipes(recipes);
  refreshRecipeDropdown();
  dom.savedRecipes.value = name;
}

function deleteRecipe() {
  const selected = dom.savedRecipes.value;

  if (!selected) return;

  const recipes = loadRecipes().filter(r => r.name !== selected);
  saveRecipes(recipes);

  refreshRecipeDropdown();
}

function exportRecipe() {
  const payload = {
    name: dom.recipeName.value.trim() || "exported_recipe",
    ...getRecipePayload()
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${payload.name}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function importRecipe() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    const text = await file.text();
    const recipe = JSON.parse(text);

    dom.recipeName.value = recipe.name || "";
    applyRecipe(recipe);
  });

  input.click();
}

function findById(collection, id) {
  return state.data[collection]?.find(item => item.id === id);
}

function getSelectedItems() {
  const collections = [
    ["genres", state.selected.genre],
    ["references", state.selected.reference],
    ["moods", state.selected.mood],
    ["vocals", state.selected.vocal],
    ["vocalSpace", state.selected.vocalSpace],
    ["instruments", state.selected.instrument],
    ["production", state.selected.production],
    ["structures", state.selected.structure]
  ];

  const dropdownItems = collections
    .map(([collection, id]) => findById(collection, id))
    .filter(Boolean);

  const exclusionItems = state.selected.exclusions
    .map(id => findById("exclusions", id))
    .filter(Boolean);

  return [...dropdownItems, ...exclusionItems];
}

function syncControlsFromState() {
  dom.preset.value = state.selected.preset || "";
  dom.genre.value = state.selected.genre || "";
  dom.reference.value = state.selected.reference || "";
  dom.mood.value = state.selected.mood || "";
  dom.vocal.value = state.selected.vocal || "";
  dom.vocalSpace.value = state.selected.vocalSpace || "";
  dom.instrument.value = state.selected.instrument || "";
  dom.production.value = state.selected.production || "";
  dom.structure.value = state.selected.structure || "";
  dom.bpm.value = state.selected.bpm || "";

  renderExclusionCheckboxes(dom.exclusionList, state.data.exclusions || [], state.selected.exclusions);
  bindExclusionCheckboxes();

  if (dom.sunoWeirdness) dom.sunoWeirdness.value = state.selected.suno?.weirdness ?? 25;
  if (dom.sunoStyleInfluence) dom.sunoStyleInfluence.value = state.selected.suno?.styleInfluence ?? 85;
  if (dom.excludeLimit) dom.excludeLimit.value = state.selected.suno?.excludeLimit ?? 950;
}

function updateOutput() {
  const selectedItems = getSelectedItems();

  const compiled = compilePrompt({
    selectedItems,
    lyrics: dom.lyrics.value,
    sectionDetail: dom.sectionDetail.value,
    customNotes: dom.customNotes.value,
    bpm: state.selected.bpm,
    excludeLimit: state.selected.suno?.excludeLimit ?? 950,
    suno: structuredClone(state.selected.suno)
  });

  const diagnostics = analyzeSelection({
    selectedItems,
    required: {
      genre: state.selected.genre,
      mood: state.selected.mood,
      instrument: state.selected.instrument,
      vocal: state.selected.vocal,
      bpm: state.selected.bpm,
      structure: state.selected.structure,
      production: state.selected.production,
      sectionDetail: dom.sectionDetail.value
    },
    conflicts: state.data.conflicts || [],
    helpers: state.data.helpers || [],
    riskProfiles: state.data.riskProfiles || {}
  });

  dom.compiledPrompt.value = compiled.prompt;
  dom.compiledExclude.value = compiled.exclude;

  if (dom.excludeCount) {
    dom.excludeCount.textContent = `${compiled.exclude.length} characters`;
  }

  renderDiagnostics({
    health: dom.health,
    risks: dom.risks,
    warnings: dom.warnings,
    helpers: dom.helpers
  }, diagnostics);
}

function bindSelect(selectEl, key) {
  selectEl.addEventListener("change", () => {
    state.selected[key] = selectEl.value;
    updateOutput();
  });
}

function bindExclusionCheckboxes() {
  dom.exclusionList.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", () => {
      state.selected.exclusions = [...dom.exclusionList.querySelectorAll("input:checked")]
        .map(checkbox => checkbox.value);

      updateOutput();
    });
  });
}

function applyPreset(presetId) {
  const preset = findById("presets", presetId);
  if (!preset) return;

  const selections = preset.selections || {};

  Object.assign(state.selected, {
    preset: presetId,
    genre: selections.genre || "",
    reference: selections.reference || "",
    mood: selections.mood || "",
    vocal: selections.vocal || "",
    vocalSpace: selections.vocalSpace || "",
    instrument: selections.instrument || "",
    production: selections.production || "",
    structure: selections.structure || "",
    bpm: selections.bpm || "",
    exclusions: selections.exclusions || []
  });

  syncControlsFromState();
  updateOutput();
}

async function init() {
  state.data = await loadData();

  populateSelect(dom.preset, state.data.presets);
  populateSelect(dom.genre, state.data.genres);
  populateSelect(dom.reference, state.data.references);
  populateSelect(dom.mood, state.data.moods);
  populateSelect(dom.vocal, state.data.vocals);
  populateSelect(dom.vocalSpace, state.data.vocalSpace);
  populateSelect(dom.instrument, state.data.instruments);
  populateSelect(dom.production, state.data.production);
  populateSelect(dom.structure, state.data.structures);

  renderExclusionCheckboxes(dom.exclusionList, state.data.exclusions || []);
  bindExclusionCheckboxes();

  if (dom.sunoWeirdness) dom.sunoWeirdness.value = state.selected.suno?.weirdness ?? 25;
  if (dom.sunoStyleInfluence) dom.sunoStyleInfluence.value = state.selected.suno?.styleInfluence ?? 85;
  if (dom.excludeLimit) dom.excludeLimit.value = state.selected.suno?.excludeLimit ?? 950;

  bindSelect(dom.genre, "genre");
  bindSelect(dom.reference, "reference");
  bindSelect(dom.mood, "mood");
  bindSelect(dom.vocal, "vocal");
  bindSelect(dom.vocalSpace, "vocalSpace");
  bindSelect(dom.instrument, "instrument");
  bindSelect(dom.production, "production");
  bindSelect(dom.structure, "structure");

  dom.preset.addEventListener("change", () => applyPreset(dom.preset.value));

  dom.bpm.addEventListener("input", () => {
    state.selected.bpm = dom.bpm.value.trim();
    updateOutput();
  });

  dom.lyrics.addEventListener("input", updateOutput);
  dom.sectionDetail.addEventListener("input", updateOutput);
  dom.customNotes.addEventListener("input", updateOutput);

  [dom.sunoWeirdness, dom.sunoStyleInfluence, dom.excludeLimit].forEach(input => {
    input?.addEventListener("input", () => {
      state.selected.suno = {
        weirdness: Number(dom.sunoWeirdness.value || 25),
        styleInfluence: Number(dom.sunoStyleInfluence.value || 85),
        excludeLimit: Number(dom.excludeLimit.value || 950)
      };
      updateOutput();
    });
  });

  document.querySelector("#btn-copy-main").addEventListener("click", () => copyText(dom.compiledPrompt.value));
  document.querySelector("#btn-copy-exclude").addEventListener("click", () => copyText(dom.compiledExclude.value));

  document.querySelector("#btn-save-recipe").addEventListener("click", saveCurrentRecipe);
  document.querySelector("#btn-delete-recipe").addEventListener("click", deleteRecipe);
  document.querySelector("#btn-export-recipe").addEventListener("click", exportRecipe);
  document.querySelector("#btn-import-recipe").addEventListener("click", importRecipe);

  dom.savedRecipes.addEventListener("change", () => {
    const recipes = loadRecipes();
    const recipe = recipes.find(r => r.name === dom.savedRecipes.value);

    if (recipe) {
      dom.recipeName.value = recipe.name;
      applyRecipe(recipe);
    }
  });

  refreshRecipeDropdown();
  updateOutput();
}

init();
