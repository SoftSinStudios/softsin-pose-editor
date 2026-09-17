const MAX_RESULTS = 8;

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s/-]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function fragmentAtCaret(input) {
  const end = input.selectionStart ?? input.value.length;
  const before = input.value.slice(0, end);
  const slashIndex = before.lastIndexOf("/");
  const delimiterIndex = Math.max(before.lastIndexOf(","), before.lastIndexOf(";"), before.lastIndexOf("\n"));
  const start = slashIndex > delimiterIndex ? slashIndex : delimiterIndex + 1;
  return { start, end, raw: before.slice(start, end), slash: slashIndex > delimiterIndex };
}

function scoreEntry(entry, query) {
  const label = normalize(entry.label);
  const insert = normalize(entry.insert);
  const terms = [label, insert, ...(entry.keywords || []).map(normalize), ...(entry.aliases || []).map(normalize)];
  let score = 0;
  terms.forEach(term => {
    if (term === query) score = Math.max(score, 100);
    else if (term.startsWith(query)) score = Math.max(score, 80);
    else if (term.includes(query)) score = Math.max(score, 55);
    else if (query.split(" ").every(token => term.includes(token))) score = Math.max(score, 40);
  });
  if (entry.confidence === "official") score += 8;
  if (entry.confidence === "reliable") score += 5;
  return score;
}

export async function initSuggestions({ isAdvanced = () => false } = {}) {
  const response = await fetch("data/musicprompt/v6-vocabulary.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Vocabulary request failed: ${response.status}`);
  const data = await response.json();
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const fields = [...document.querySelectorAll("[data-suggest-scope]")];
  if (!entries.length || !fields.length) return;

  const popover = document.createElement("div");
  popover.className = "suggestion-popover";
  popover.hidden = true;
  popover.setAttribute("role", "listbox");
  popover.setAttribute("aria-label", "Music direction suggestions");
  document.body.appendChild(popover);

  let activeInput = null;
  let activeResults = [];
  let activeIndex = 0;
  let activeFragment = null;

  function close() {
    popover.hidden = true;
    popover.innerHTML = "";
    activeResults = [];
    activeIndex = 0;
    activeFragment = null;
    activeInput?.removeAttribute("aria-activedescendant");
  }

  function place() {
    if (!activeInput || popover.hidden) return;
    const rect = activeInput.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 320), 520);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    const availableBelow = window.innerHeight - rect.bottom;
    popover.style.width = `${width}px`;
    popover.style.left = `${Math.max(12, left)}px`;
    if (availableBelow >= 260) {
      popover.style.top = `${rect.bottom + 6}px`;
      popover.style.bottom = "auto";
      popover.classList.remove("above");
    } else {
      popover.style.top = "auto";
      popover.style.bottom = `${window.innerHeight - rect.top + 6}px`;
      popover.classList.add("above");
    }
  }

  function render() {
    popover.innerHTML = `<div class="suggestion-heading"><strong>Suggestions</strong><span>↑↓ navigate · Enter insert · Esc close</span></div>${activeResults.map((entry, index) => `
      <button class="suggestion-option${index === activeIndex ? " active" : ""}" id="suggestion-${index}" role="option" aria-selected="${index === activeIndex}" type="button" data-index="${index}">
        <span class="suggestion-copy"><strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(entry.description)}</small><code>${escapeHtml(entry.insert)}</code></span>
        <span class="suggestion-confidence ${escapeHtml(entry.confidence)}">${escapeHtml(entry.confidence)}</span>
      </button>`).join("")}`;
    activeInput.setAttribute("aria-activedescendant", `suggestion-${activeIndex}`);
    popover.querySelectorAll(".suggestion-option").forEach(button => {
      button.addEventListener("mousedown", event => event.preventDefault());
      button.addEventListener("click", () => insertResult(Number(button.dataset.index)));
    });
    place();
  }

  function insertResult(index) {
    const entry = activeResults[index];
    if (!entry || !activeInput || !activeFragment) return;
    const value = activeInput.value;
    const prefix = value.slice(0, activeFragment.start);
    const suffix = value.slice(activeFragment.end);
    const separator = prefix && !/[\s,;\n]$/.test(prefix) ? ", " : "";
    const inserted = `${separator}${entry.insert}`;
    activeInput.value = `${prefix}${inserted}${suffix}`;
    const caret = prefix.length + inserted.length;
    activeInput.setSelectionRange(caret, caret);
    activeInput.dispatchEvent(new Event("input", { bubbles: true }));
    activeInput.dispatchEvent(new Event("change", { bubbles: true }));
    close();
    activeInput.focus();
  }

  function update(input) {
    activeInput = input;
    activeFragment = fragmentAtCaret(input);
    const query = normalize(activeFragment.raw.replace(/^\//, ""));
    if (query.length < 2) { close(); return; }
    const scope = input.dataset.suggestScope;
    activeResults = entries
      .filter(entry => entry.scopes?.includes(scope))
      .filter(entry => isAdvanced() || !["experimental", "legacy"].includes(entry.confidence))
      .map(entry => ({ ...entry, score: scoreEntry(entry, query) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, MAX_RESULTS);
    if (!activeResults.length) { close(); return; }
    activeIndex = 0;
    popover.hidden = false;
    render();
  }

  fields.forEach(input => {
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.addEventListener("input", () => { update(input); input.setAttribute("aria-expanded", String(!popover.hidden)); });
    input.addEventListener("click", () => update(input));
    input.addEventListener("keydown", event => {
      if (popover.hidden) return;
      if (event.key === "ArrowDown") { event.preventDefault(); activeIndex = (activeIndex + 1) % activeResults.length; render(); }
      if (event.key === "ArrowUp") { event.preventDefault(); activeIndex = (activeIndex - 1 + activeResults.length) % activeResults.length; render(); }
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); insertResult(activeIndex); }
      if (event.key === "Escape") { event.preventDefault(); close(); }
    });
    input.addEventListener("blur", () => setTimeout(close, 120));
  });

  window.addEventListener("resize", place);
  document.addEventListener("scroll", place, true);
}
