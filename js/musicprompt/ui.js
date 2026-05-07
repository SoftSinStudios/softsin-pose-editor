export function populateSelect(selectEl, items = []) {
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    selectEl.appendChild(option);
  });
}

export function renderExclusionCheckboxes(container, items = [], selectedIds = []) {
  container.innerHTML = "";

  items.forEach(item => {
    const label = document.createElement("label");
    label.className = "checkbox-pill";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = item.id;
    input.checked = selectedIds.includes(item.id);

    const span = document.createElement("span");
    span.textContent = item.label;

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  });
}

export async function copyText(text) {
  await navigator.clipboard.writeText(text || "");
}

function renderList(container, items, type) {
  container.innerHTML = "";

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = `diagnostic-item ${type || ""}`;
    div.textContent = item.message || item.suggestion || "";
    container.appendChild(div);
  });
}

function renderRisks(container, risks) {
  container.innerHTML = "";

  risks.forEach(risk => {
    const div = document.createElement("div");
    div.className = `risk-item ${risk.level}`;

    const label = document.createElement("span");
    label.textContent = risk.label;

    const value = document.createElement("strong");
    value.textContent = risk.value;

    div.appendChild(label);
    div.appendChild(value);
    container.appendChild(div);
  });
}

export function renderDiagnostics(dom, diagnostics) {
  dom.health.textContent = `Health: ${diagnostics.health}%`;

  if (diagnostics.health < 60) {
    dom.health.style.color = "var(--danger)";
  } else if (diagnostics.health < 82) {
    dom.health.style.color = "var(--warn)";
  } else {
    dom.health.style.color = "var(--ok)";
  }

  renderRisks(dom.risks, diagnostics.riskRows || []);
  renderList(dom.warnings, diagnostics.conflicts, "warning");
  renderList(dom.helpers, diagnostics.helpers, "");
}
