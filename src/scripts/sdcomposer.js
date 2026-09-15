const SUBJECTS = {
  person: {
    label: 'Person',
    description: 'For portraits, character work, fashion, editorial images, and human-focused prompts.',
    sections: [['IDENTITY', ['subject', 'description']], ['OUTFIT', ['outfit']], ['POSE', ['pose', 'expression']], ['ENVIRONMENT', ['environment', 'details']], ['LIGHTING', ['lighting']], ['QUALITY', ['composition', 'style']]],
    fields: [
      { key: 'subject', label: 'Subject', hint: 'Example: middle-aged woman, elderly man, cyberpunk dancer' },
      { key: 'outfit', label: 'Outfit', hint: 'Clothing, materials, accessories, fabric behavior' },
      { key: 'pose', label: 'Pose / Action', hint: 'Standing, seated, walking, leaning, or physical action' },
      { key: 'expression', label: 'Expression', hint: 'Emotion, gaze, mouth, attitude, mood' },
      { key: 'environment', label: 'Environment', hint: 'Where the subject exists' },
      { key: 'lighting', label: 'Lighting', hint: 'Light direction, softness, time of day, mood' },
      { key: 'composition', label: 'Composition', hint: 'Camera angle, framing, focal feel, crop' },
      { key: 'style', label: 'Style / Quality', hint: 'Photography, cinematic still, realism, detail' },
      { key: 'description', label: 'Description', hint: 'Appearance, age cues, features, build, hair, or anything identity-related', type: 'textarea', full: true },
      { key: 'details', label: 'Extra Details', hint: 'Useful details that do not fit cleanly in the fields above', type: 'textarea', full: true },
      { key: 'negativePrompt', label: 'Negative Prompt', hint: 'Artifacts, errors, styles, or content you want the model to avoid', type: 'textarea', full: true }
    ]
  },
  creature: {
    label: 'Creature',
    description: 'For animals, monsters, aliens, biomechanical subjects, and fantasy creatures.',
    sections: [['IDENTITY', ['subject', 'description', 'surface']], ['POSE', ['action']], ['ENVIRONMENT', ['habitat', 'details']], ['LIGHTING', ['lighting']], ['QUALITY', ['composition', 'style']]],
    fields: [
      { key: 'subject', label: 'Creature', hint: 'Example: biomechanical wolf, abyssal leviathan, horned forest spirit' },
      { key: 'surface', label: 'Surface / Materials', hint: 'Fur, scales, bark, chitin, wet skin, metal plating' },
      { key: 'action', label: 'Action / State', hint: 'Prowling, roaring, perched, sleeping, stalking' },
      { key: 'habitat', label: 'Habitat / Environment', hint: 'Forest floor, frozen cave, ruined lab, alien marsh' },
      { key: 'lighting', label: 'Lighting', hint: 'Light mood and separation' },
      { key: 'composition', label: 'Composition', hint: 'View, angle, scale, framing' },
      { key: 'style', label: 'Style / Quality', hint: 'Concept art, realism, cinematic, painterly' },
      { key: 'description', label: 'Description', hint: 'Body form, size, limbs, head shape, species traits', type: 'textarea', full: true },
      { key: 'details', label: 'Extra Details', hint: 'Particles, breath, glowing eyes, scene extras', type: 'textarea', full: true },
      { key: 'negativePrompt', label: 'Negative Prompt', hint: 'Artifacts, errors, styles, or content you want the model to avoid', type: 'textarea', full: true }
    ]
  },
  vehicle: {
    label: 'Vehicle',
    description: 'For cars, bikes, aircraft, ships, mechs, and designed transport subjects.',
    sections: [['IDENTITY', ['subject', 'design', 'materials', 'condition']], ['POSE', ['action']], ['ENVIRONMENT', ['environment', 'details']], ['LIGHTING', ['lighting']], ['QUALITY', ['composition', 'style']]],
    fields: [
      { key: 'subject', label: 'Vehicle', hint: 'Example: retro muscle car, armored dropship, dieselpunk hoverbike' },
      { key: 'materials', label: 'Materials / Finish', hint: 'Brushed metal, matte paint, chrome, carbon fiber' },
      { key: 'condition', label: 'Condition', hint: 'Factory clean, weathered, battle-worn, rusted' },
      { key: 'action', label: 'Action / State', hint: 'Parked, drifting, hovering, landing, speeding' },
      { key: 'environment', label: 'Environment', hint: 'Garage, highway, stormfront, hangar, runway' },
      { key: 'lighting', label: 'Lighting', hint: 'Sunlight, studio reflections, headlights, neon spill' },
      { key: 'composition', label: 'Composition', hint: 'Three-quarter view, front profile, low angle, wide frame' },
      { key: 'style', label: 'Style / Quality', hint: 'Concept art, cinematic render, photoreal, industrial design' },
      { key: 'design', label: 'Design Language', hint: 'Shape, era, silhouette, visual identity', type: 'textarea', full: true },
      { key: 'details', label: 'Extra Details', hint: 'Decals, smoke, rain streaks, engine glow, dirt', type: 'textarea', full: true },
      { key: 'negativePrompt', label: 'Negative Prompt', hint: 'Artifacts, errors, styles, or content you want the model to avoid', type: 'textarea', full: true }
    ]
  },
  environment: {
    label: 'Environment',
    description: 'For architecture, landscapes, interiors, cityscapes, and location-first prompts.',
    sections: [['IDENTITY', ['subject', 'structure']], ['ENVIRONMENT', ['atmosphere', 'weather', 'details']], ['LIGHTING', ['lighting']], ['QUALITY', ['composition', 'style']]],
    fields: [
      { key: 'subject', label: 'Environment', hint: 'Example: abandoned cathedral interior, overgrown train station, brutalist megacity' },
      { key: 'atmosphere', label: 'Atmosphere / Mood', hint: 'Somber, sterile, nostalgic, threatening, dreamlike' },
      { key: 'weather', label: 'Weather / Time', hint: 'Rain, fog, snowfall, dawn light, dusk haze' },
      { key: 'lighting', label: 'Lighting', hint: 'How the environment is lit' },
      { key: 'composition', label: 'Composition', hint: 'Wide shot, centered path, layered depth, vanishing point' },
      { key: 'style', label: 'Style / Quality', hint: 'Matte painting, photoreal, cinematic, concept art' },
      { key: 'structure', label: 'Structure / Terrain', hint: 'Architecture, terrain, landmarks, materials, surfaces', type: 'textarea', full: true },
      { key: 'details', label: 'Extra Details', hint: 'Dust, foliage, reflections, debris, distant lights', type: 'textarea', full: true },
      { key: 'negativePrompt', label: 'Negative Prompt', hint: 'Artifacts, errors, styles, or content you want the model to avoid', type: 'textarea', full: true }
    ]
  },
  object: {
    label: 'Object',
    description: 'For props, products, artifacts, tools, tech, and isolated object prompts.',
    sections: [['IDENTITY', ['subject', 'description', 'materials']], ['ENVIRONMENT', ['placement', 'background', 'details']], ['LIGHTING', ['lighting']], ['QUALITY', ['composition', 'style']]],
    fields: [
      { key: 'subject', label: 'Object', hint: 'Example: luxury perfume bottle, antique revolver, sci-fi helmet' },
      { key: 'materials', label: 'Materials / Finish', hint: 'Glass, brass, leather, velvet, polished stone' },
      { key: 'placement', label: 'Placement / State', hint: 'Resting on black glass, suspended, displayed on pedestal' },
      { key: 'background', label: 'Background / Environment', hint: 'Studio backdrop, tabletop, velvet drape, shelf' },
      { key: 'lighting', label: 'Lighting', hint: 'Product light, reflections, edge light' },
      { key: 'composition', label: 'Composition', hint: 'Macro shot, product shot, centered framing, close crop' },
      { key: 'style', label: 'Style / Quality', hint: 'Luxury product photography, realism, sharp detail' },
      { key: 'description', label: 'Description', hint: 'Form, age, era, branding, craftsmanship', type: 'textarea', full: true },
      { key: 'details', label: 'Extra Details', hint: 'Etching, condensation, dust, fingerprints, scratches', type: 'textarea', full: true },
      { key: 'negativePrompt', label: 'Negative Prompt', hint: 'Artifacts, errors, styles, or content you want the model to avoid', type: 'textarea', full: true }
    ]
  },
  abstract: {
    label: 'Abstract',
    description: 'For symbolic, conceptual, non-literal, and design-heavy image prompts.',
    sections: [['IDENTITY', ['subject', 'symbolism', 'forms', 'palette']], ['ENVIRONMENT', ['atmosphere', 'details']], ['LIGHTING', ['lighting']], ['QUALITY', ['composition', 'style']]],
    fields: [
      { key: 'subject', label: 'Concept', hint: 'Example: grief as collapsing architecture, digital transcendence, fractured memory' },
      { key: 'forms', label: 'Forms / Shape Language', hint: 'Angular, fluid, fragmented, geometric, organic' },
      { key: 'palette', label: 'Color / Palette', hint: 'Muted cobalt and ash, red and gold contrast, monochrome' },
      { key: 'atmosphere', label: 'Atmosphere', hint: 'Dreamlike, oppressive, sterile, transcendent, surreal' },
      { key: 'lighting', label: 'Lighting', hint: 'Glow, contrast, haze, silhouette, bloom' },
      { key: 'composition', label: 'Composition', hint: 'Centered symbol, asymmetrical, void-heavy, layered' },
      { key: 'style', label: 'Style / Quality', hint: 'Graphic design, surreal painting, concept art, mixed media' },
      { key: 'symbolism', label: 'Symbolism', hint: 'Metaphors, motifs, themes, emotional language', type: 'textarea', full: true },
      { key: 'details', label: 'Extra Details', hint: 'Texture, particles, fractured surfaces, glyphs', type: 'textarea', full: true },
      { key: 'negativePrompt', label: 'Negative Prompt', hint: 'Artifacts, errors, styles, or content you want the model to avoid', type: 'textarea', full: true }
    ]
  },
  scene: {
    label: 'Scene',
    description: 'For scenes with multiple important subjects, roles, actions, or interactions.',
    sections: [['IDENTITY', ['subject', 'relationships']], ['POSE', ['action']], ['ENVIRONMENT', ['environment', 'details']], ['LIGHTING', ['lighting']], ['QUALITY', ['composition', 'style']]],
    fields: [
      { key: 'subject', label: 'Primary Subjects', hint: 'Example: knight and dragon, family at dinner, convoy in storm' },
      { key: 'action', label: 'Action / Event', hint: 'What is happening in the scene' },
      { key: 'environment', label: 'Environment', hint: 'Where the scene takes place' },
      { key: 'lighting', label: 'Lighting', hint: 'How the whole scene is lit' },
      { key: 'composition', label: 'Composition', hint: 'Subject placement, depth, focal hierarchy, angle' },
      { key: 'style', label: 'Style / Quality', hint: 'Cinematic, illustrated, photoreal, concept art' },
      { key: 'relationships', label: 'Relationships / Roles', hint: 'How the subjects relate, contrast, or interact', type: 'textarea', full: true },
      { key: 'details', label: 'Extra Details', hint: 'Secondary objects, particles, debris, supporting cues', type: 'textarea', full: true },
      { key: 'negativePrompt', label: 'Negative Prompt', hint: 'Artifacts, errors, styles, or content you want the model to avoid', type: 'textarea', full: true }
    ]
  }
};
const state = {
  activeType: 'person',
  values: {}
};
const PROJECT_SCHEMA = 'softsin-sd-prompt-project';
const PROJECT_VERSION = 2;
const DRAFT_KEY = 'softsin_sd_prompt_draft_v2';
let draftTimer = null;

function setStatus(message, tone = '') {
  const status = document.getElementById('composerStatus');
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function normalizeProjectValues(input) {
  const normalized = {};
  Object.entries(SUBJECTS).forEach(([type, config]) => {
    normalized[type] = {};
    config.fields.forEach(field => {
      const value = input?.[type]?.[field.key];
      normalized[type][field.key] = typeof value === 'string' ? value.slice(0, 50000) : '';
    });
  });
  return normalized;
}

function createProjectPayload() {
  return {
    schema: PROJECT_SCHEMA,
    version: PROJECT_VERSION,
    activeType: state.activeType,
    values: normalizeProjectValues(state.values),
    positive: buildPositivePrompt(state.activeType),
    negative: buildNegativePrompt(state.activeType)
  };
}

function saveDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(createProjectPayload()));
      const draftStatus = document.getElementById('draftStatus');
      if (draftStatus) draftStatus.textContent = 'Draft saved';
    } catch {
      const draftStatus = document.getElementById('draftStatus');
      if (draftStatus) draftStatus.textContent = 'Draft unavailable';
    }
  }, 250);
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    state.activeType = SUBJECTS[payload.activeType] ? payload.activeType : 'person';
    state.values = normalizeProjectValues(payload.values);
    return true;
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return false;
  }
}

function applyProject(payload) {
  if (!payload || typeof payload !== 'object' || !payload.values) {
    throw new Error('This file is not a valid SD Prompt Composer project.');
  }
  state.activeType = SUBJECTS[payload.activeType] ? payload.activeType : 'person';
  state.values = normalizeProjectValues(payload.values);
  renderTabs();
  renderFields();
  updatePreviews();
  saveDraft();
}

function ensureState(type) {
  if (!state.values[type]) state.values[type] = {};
  SUBJECTS[type].fields.forEach(field => {
    if (!(field.key in state.values[type])) state.values[type][field.key] = '';
  });
}

function cleanPart(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,{2,}/g, ',')
    .trim()
    .replace(/^,+|,+$/g, '')
    .trim();
}

function splitParts(value) {
  return String(value || '')
    .split(',')
    .map(part => cleanPart(part))
    .filter(Boolean);
}

function uniqParts(parts) {
  const out = [];
  const seen = new Set();
  parts.forEach(part => {
    const cleaned = cleanPart(part);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  });
  return out;
}

function buildPositivePrompt(type) {
  ensureState(type);
  const values = state.values[type];
  const sections = SUBJECTS[type].sections || [];
  const lines = sections.map(([label, keys]) => {
    const parts = [];
    keys.forEach(key => {
      splitParts(values[key] || '').forEach(part => parts.push(part));
    });
    const clean = uniqParts(parts);
    if (!clean.length) return '';
    return `${label}: ${clean.join(', ')}.`;
  }).filter(Boolean);
  return lines.join('\n\n');
}

function buildNegativePrompt(type) {
  ensureState(type);
  const values = state.values[type];
  return uniqParts(splitParts(values.negativePrompt || '')).join(', ');
}

function autoResizeField(field) {
  if (!field || field.tagName !== 'TEXTAREA') return;
  field.style.height = 'auto';
  field.style.height = field.scrollHeight + 'px';
}

function renderTabs() {
  const tabList = document.getElementById('tabList');
  tabList.innerHTML = '';
  Object.entries(SUBJECTS).forEach(([key, cfg]) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (state.activeType === key ? ' active' : '');
    btn.textContent = cfg.label;
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(state.activeType === key));
    btn.addEventListener('click', () => {
      state.activeType = key;
      renderTabs();
      renderFields();
      updatePreviews();
      saveDraft();
    });
    tabList.appendChild(btn);
  });
}

function renderFields() {
  ensureState(state.activeType);
  const cfg = SUBJECTS[state.activeType];
  document.getElementById('subjectTitle').textContent = cfg.label;
  document.getElementById('subjectDescription').textContent = cfg.description;
  const box = document.getElementById('fieldContainer');
  box.innerHTML = '';

  cfg.fields.forEach(field => {
    const row = document.createElement('div');
    row.className = 'field-row' + (field.full ? ' full' : '');

    const label = document.createElement('div');
    label.className = 'field-label';
    label.textContent = field.label;

    const wrap = document.createElement('div');
    wrap.className = 'field-wrap';

    const input = document.createElement('textarea');
    input.className = 'auto-grow-field';
    input.rows = field.type === 'textarea' ? 3 : 1;
    input.value = state.values[state.activeType][field.key] || '';
    input.placeholder = field.hint;
    input.dataset.key = field.key;
    input.addEventListener('input', e => {
      state.values[state.activeType][field.key] = e.target.value;
      autoResizeField(e.target);
      updatePreviews();
      saveDraft();
    });

    const hint = document.createElement('div');
    hint.className = 'field-hint';
    hint.textContent = field.hint;

    wrap.appendChild(input);
    wrap.appendChild(hint);
    row.appendChild(label);
    row.appendChild(wrap);
    box.appendChild(row);
    autoResizeField(input);
  });
}

function updatePreviews() {
  const positive = buildPositivePrompt(state.activeType);
  const negative = buildNegativePrompt(state.activeType);
  document.getElementById('positivePreview').textContent = positive || 'Your positive prompt preview will appear here.';
  document.getElementById('negativePreview').textContent = negative || 'Your negative prompt preview will appear here.';
  syncChipStates();
}

async function copyText(text, label) {
  if (!text) {
    setStatus(`Nothing to copy from the ${label.toLowerCase()} prompt.`, 'warning');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus(`${label} prompt copied.`, 'success');
  } catch {
    setStatus('Copy failed. Select the prompt text and copy it manually.', 'error');
  }
}

function syncChipStates() {
  const map = {
    lighting: 'lighting',
    composition: 'composition',
    style: 'style'
  };
  document.querySelectorAll('.chip-group').forEach(group => {
    const key = map[group.dataset.target];
    const current = key ? splitParts(state.values[state.activeType][key] || '') : [];
    group.querySelectorAll('.chip').forEach(chip => {
      const phrase = cleanPart(chip.textContent);
      chip.classList.toggle('active', current.includes(phrase));
    });
  });
}

function toggleMappedField(target, phrase) {
  ensureState(state.activeType);
  const map = {
    lighting: 'lighting',
    composition: 'composition',
    style: 'style'
  };
  const key = map[target];
  if (!key) return;
  const incoming = cleanPart(phrase);
  if (!incoming) return;
  const current = splitParts(state.values[state.activeType][key] || '');
  const exists = current.includes(incoming);
  const next = exists ? current.filter(part => part !== incoming) : uniqParts([...current, incoming]);
  state.values[state.activeType][key] = next.join(', ');
  const input = document.querySelector(`[data-key="${key}"]`);
  if (input) {
    input.value = state.values[state.activeType][key];
    autoResizeField(input);
  }
  updatePreviews();
  saveDraft();
}

function exportJson() {
  const payload = createProjectPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sdprompt-composer.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus('Project JSON exported.', 'success');
}


function exportTxt() {
  const positive = buildPositivePrompt(state.activeType);
  const negative = buildNegativePrompt(state.activeType);
  const subjectLabel = SUBJECTS[state.activeType]?.label || state.activeType;
  const content = [
    'SD Prompt Composer',
    'Subject Type: ' + subjectLabel,
    '',
    'POSITIVE PROMPT:',
    positive || '',
    '',
    'NEGATIVE PROMPT:',
    negative || ''
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sdprompt-composer.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus('Prompt text exported.', 'success');
}

function clearCurrent() {
  if (!window.confirm(`Clear every field for ${SUBJECTS[state.activeType].label}?`)) return;
  ensureState(state.activeType);
  SUBJECTS[state.activeType].fields.forEach(field => state.values[state.activeType][field.key] = '');
  renderFields();
  updatePreviews();
  saveDraft();
  setStatus(`${SUBJECTS[state.activeType].label} fields cleared.`, 'success');
}

function newProject() {
  const hasContent = Object.values(state.values).some(values =>
    Object.values(values || {}).some(value => String(value || '').trim())
  );
  if (hasContent && !window.confirm('Start a new project and clear every subject type?')) return;
  state.activeType = 'person';
  state.values = {};
  Object.keys(SUBJECTS).forEach(ensureState);
  localStorage.removeItem(DRAFT_KEY);
  renderTabs();
  renderFields();
  updatePreviews();
  setStatus('New project created.', 'success');
}

async function importJson(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    applyProject(payload);
    setStatus(`Imported ${file.name}.`, 'success');
  } catch (error) {
    setStatus(error?.message || 'The selected JSON file could not be imported.', 'error');
  }
}

function loadExample() {
  const samples = {
    person: {
      subject: 'middle-aged woman',
      description: 'silver hair, sharp features, elegant presence',
      outfit: 'black silk blouse, tailored pencil skirt, minimal jewelry',
      pose: 'standing beside a hotel bar',
      expression: 'calm, confident gaze',
      environment: 'luxury hotel lounge',
      lighting: 'soft warm practical lighting, subtle rim light',
      composition: 'three-quarter view, waist-up shot',
      style: 'cinematic still, photorealistic, sharp focus',
      details: 'polished marble reflections',
      negativePrompt: 'bad anatomy, bad eyes, extra fingers, merged clothing, text, watermark, blurry, lowres'
    },
    creature: {
      subject: 'biomechanical wolf',
      description: 'lean predatory frame, exposed servos, angular skull',
      surface: 'matte black plating, carbon fiber spine, amber glowing eyes',
      action: 'prowling through shallow fog',
      habitat: 'ruined industrial corridor',
      lighting: 'dramatic rim light, low ambient haze',
      composition: 'low angle, wide shot',
      style: 'concept art, highly detailed',
      details: 'sparks, drifting dust',
      negativePrompt: 'broken limbs, fused anatomy, melted textures, duplicated legs, awkward silhouette, text, watermark, blurry, lowres'
    },
    vehicle: {
      subject: 'dieselpunk hoverbike',
      design: 'low aggressive silhouette, exposed engine housings, heavy front forks',
      materials: 'weathered brass, steel plating, matte black trim',
      condition: 'battle-worn with light rust',
      action: 'hovering above a rain-soaked alley',
      environment: 'industrial city street at night',
      lighting: 'wet reflections, neon backlight',
      composition: 'three-quarter view, low angle',
      style: 'cinematic render, highly detailed',
      details: 'steam vents, rain streaks',
      negativePrompt: 'warped body, broken symmetry, melted metal, muddy reflections, distorted wheels, warped perspective, text, watermark, blurry, lowres'
    },
    environment: {
      subject: 'abandoned cathedral interior',
      structure: 'cracked marble floors, collapsed pews, towering arches, broken stained glass',
      atmosphere: 'somber, sacred, dust-heavy silence',
      weather: 'cold dawn light through lingering mist',
      lighting: 'volumetric light rays, soft ambient gloom',
      composition: 'wide shot, centered aisle, deep perspective',
      style: 'matte painting, photorealistic detail',
      details: 'floating dust, scattered debris, vine growth',
      negativePrompt: 'warped buildings, floating geometry, flat lighting, muddy fog, bad framing, cluttered scene, text, watermark, blurry, lowres'
    },
    object: {
      subject: 'luxury perfume bottle',
      description: 'sleek rectangular bottle with beveled edges and gold cap',
      materials: 'clear glass, amber liquid, brushed gold hardware',
      placement: 'resting on black reflective glass',
      background: 'dark studio backdrop',
      lighting: 'controlled product lighting with edge highlights',
      composition: 'macro product shot, centered framing',
      style: 'luxury product photography, sharp detail',
      details: 'fine condensation, faint reflection',
      negativePrompt: 'warped geometry, broken edges, bad reflections, muddy texture, cut off object, awkward framing, text, watermark, blurry, lowres'
    },
    abstract: {
      subject: 'fractured memory',
      symbolism: 'shattered mirrored forms dissolving into fog and light',
      forms: 'fragmented geometry, drifting layered shapes',
      palette: 'cold silver, pale blue, muted charcoal',
      atmosphere: 'dreamlike, distant, melancholic',
      lighting: 'soft bloom, internal glow',
      composition: 'central fracture point, negative space',
      style: 'surreal painting, mixed media texture',
      details: 'dust motes, faint glyph patterns',
      negativePrompt: 'muddy concept, unreadable symbolism, visual noise, oversaturation, bad balance, awkward spacing, text, watermark, blurry, lowres'
    },
    scene: {
      subject: 'knight and dragon',
      relationships: 'the knight stands defiant while the dragon circles overhead',
      action: 'standoff before an imminent clash',
      environment: 'ruined fortress courtyard at dusk',
      lighting: 'storm light, fire glow, rim light on armor',
      composition: 'wide cinematic frame with clear subject separation',
      style: 'epic fantasy concept art, highly detailed',
      details: 'embers, torn banners, drifting ash',
      negativePrompt: 'duplicated subjects, merged limbs, inconsistent scale, overlap confusion, poor separation, weak focal point, cluttered layout, text, watermark, blurry, lowres'
    }
  };
  state.values[state.activeType] = { ...state.values[state.activeType], ...samples[state.activeType] };
  renderFields();
  updatePreviews();
  saveDraft();
  setStatus(`${SUBJECTS[state.activeType].label} example loaded.`, 'success');
}

function init() {
  Object.keys(SUBJECTS).forEach(ensureState);
  const restored = restoreDraft();
  renderTabs();
  renderFields();
  updatePreviews();

  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const which = btn.dataset.copy;
      if (which === 'positive') await copyText(buildPositivePrompt(state.activeType), 'Positive');
      if (which === 'negative') await copyText(buildNegativePrompt(state.activeType), 'Negative');
    });
  });
  document.getElementById('newProjectBtn').addEventListener('click', newProject);
  const importInput = document.getElementById('importJsonInput');
  document.getElementById('importJsonBtn').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    await importJson(importInput.files?.[0]);
    importInput.value = '';
  });
  document.getElementById('clearBtn').addEventListener('click', clearCurrent);
  document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
  document.getElementById('exportTxtBtn').addEventListener('click', exportTxt);
  document.getElementById('loadExampleBtn').addEventListener('click', loadExample);

  document.querySelectorAll('.chip-group').forEach(group => {
    group.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      toggleMappedField(group.dataset.target, chip.textContent);
    });
  });

  if (restored) {
    setStatus('Recovered your local draft.', 'success');
  }
}

init();
