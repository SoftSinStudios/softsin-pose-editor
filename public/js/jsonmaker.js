// /js/jsonmaker.js
(() => {
  const $ = s => document.querySelector(s);
  const $$in = (root, sel) => Array.from(root.querySelectorAll(sel));

  const under = s => (s || '')
    .trim().toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const parseTags = s => (s || '')
    .split(',')
    .map(x => under(x))
    .filter(Boolean);

  // DOM refs
  const filenameEl = $('#filename');
  const versionEl  = $('#version');
  const tagsEl     = $('#rootTags');
  const brandEl    = $('#brandMeta'); // hidden branding meta
  const catsWrap   = $('#categories');
  const countsEl   = $('#counts');
  const previewEl  = $('#jsonPreview');
  const infoEl     = $('#info');

  // Build category card
  function addCategory() {
    const card = document.createElement('div');
    card.className = 'card category';
    card.innerHTML = `
      <div class="card-head">
        <strong>Category</strong>
        <div class="actions">
          <button type="button" class="mini removeCatSoft">- Category</button>
        </div>
      </div>

      <div class="form-row">
        <label>name</label>
        <input class="catName" type="text" placeholder="category_name" />
        <div class="hint">underscores only</div>
      </div>

      <div class="items"></div>
    `;
    catsWrap.appendChild(card);

    card.querySelector('.removeCatSoft').onclick = () => { card.remove(); sync(); };
    card.querySelector('.catName').oninput = () => sync();

    // seed one item row
    addItem(card);
    sync();
    return card;
  }

  // Build item row
  function addItem(catCard, afterRow = null) {
    const items = catCard.querySelector('.items');
    const row = document.createElement('div');
    row.className = 'form-row item-row';
    row.innerHTML = `
      <label>item</label>
      <input class="itemName" type="text" placeholder="item_name" />
      <div class="row-actions">
        <button type="button" class="mini addItemBelow">+ Item</button>
        <button type="button" class="mini removeItem">- Item</button>
      </div>
    `;
    if (afterRow) afterRow.insertAdjacentElement('afterend', row);
    else items.appendChild(row);

    row.querySelector('.itemName').oninput = () => sync();
    row.querySelector('.addItemBelow').onclick = () => addItem(catCard, row);
    row.querySelector('.removeItem').onclick = () => { row.remove(); sync(); };

    sync();
    return row;
  }

  // Build payload from DOM (no dedupe; allow identical items; normalize on export)
  function buildPayload() {
    const fileName = under(filenameEl?.value || 'softsin_data');
    const version  = (versionEl?.value || '1.0.0').trim();
    const tags     = parseTags(tagsEl?.value || '');

    const categories = Array.from(document.querySelectorAll('.card.category'))
      .map(cat => {
        const nameRaw = cat.querySelector('.catName')?.value || '';
        const name = under(nameRaw);
        if (!name) return null;

        // Keep raw input per row, normalize only when exporting payload (below we still normalize!)
        const items = $$in(cat, '.itemName')
          .map(i => under(i.value || '')) // normalize for export; keep as-is in UI
          .filter(v => v);                // keep non-empty; NO DEDUPE
        return { name, items };
      })
      .filter(Boolean);

    const branding = brandEl?.value ||
      'Created with the SoftSin Studio JSON Creator V1.00: https://www.softsinstudios.com, © 2025';

    return { file: fileName, version, tags, categories, meta: { branding } };
  }

  // Sync form → preview
  function sync() {
    const payload = buildPayload();
    const nCats  = payload.categories.length;
    const nItems = payload.categories.reduce((a, c) => a + c.items.length, 0);

    if (countsEl) countsEl.textContent = `${nCats} categories • ${nItems} items`;
    if (infoEl)   infoEl.textContent   = nCats
      ? 'Categories and items displayed in JSON.'
      : 'Start by adding a Category and List Items.';

    if (previewEl) previewEl.value = JSON.stringify(payload, null, 2);
  }

  // Export — honor UI filename, bypass legacy exporters
  function exportJSON(evt) {
    if (evt) { evt.preventDefault(); evt.stopPropagation(); evt.stopImmediatePropagation(); }
    sync();

    const payload = buildPayload();

    // sanitize filename and ensure .json
    let fname = (payload.file || 'softsin_data').trim().toLowerCase();
    fname = fname.replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!fname) fname = 'softsin_data';
    if (!fname.endsWith('.json')) fname += '.json';

    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('[jsonmaker] export failed:', err);
      alert('Export failed. See console for details.');
    }
  }

  // Import (preserve raw item strings; we normalize on export)
  function importJSON() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const obj = JSON.parse(await f.text());

        if (filenameEl) filenameEl.value = (obj.file || 'softsin_data');
        if (versionEl)  versionEl.value  = (obj.version || '1.0.0');
        if (tagsEl)     tagsEl.value     = (obj.tags || []).join(', ');

        catsWrap.innerHTML = '';
        (obj.categories || []).forEach(c => {
          const card = addCategory();
          card.querySelector('.catName').value = c.name || '';
          const itemsWrap = card.querySelector('.items');
          itemsWrap.innerHTML = '';
          (c.items || []).forEach(it => {
            const r = addItem(card);
            // DO NOT normalize here; keep exactly what was in the file
            r.querySelector('.itemName').value = (it ?? '');
          });
        });
        sync();
      } catch {
        alert('Invalid JSON.');
      } finally {
        inp.value = '';
      }
    };
    inp.click();
  }

  // Wire buttons (capture phase on export to pre-empt other listeners)
  const safe = id => document.getElementById(id);

  (safe('addCategory') || {}).onclick = () => addCategory();
  (safe('addListItem') || {}).onclick = () => {
    let last = Array.from(document.querySelectorAll('.card.category')).pop();
    if (!last) last = addCategory();
    addItem(last);
  };

  const exportBtn = safe('exportJson');
  if (exportBtn) exportBtn.addEventListener('click', exportJSON, { capture: true });

  (safe('clearAll') || {}).onclick = () => {
    if (filenameEl) filenameEl.value = '';
    if (versionEl)  versionEl.value  = '';
    if (tagsEl)     tagsEl.value     = '';
    catsWrap.innerHTML = '';
    sync();
  };

  (safe('importJson') || {}).onclick = importJSON;

  (safe('btnAddCategory') || {}).onclick = () => addCategory();
  (safe('btnAddItem')     || {}).onclick = () => {
    let last = Array.from(document.querySelectorAll('.card.category')).pop();
    if (!last) last = addCategory();
    addItem(last);
  };

  // Live sync when user edits header fields
  if (filenameEl) filenameEl.oninput = sync;
  if (versionEl)  versionEl.oninput  = sync;
  if (tagsEl)     tagsEl.oninput     = sync;

  // Init
  sync();
})();
