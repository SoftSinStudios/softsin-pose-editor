console.info('[SoftSinDepth] depth.js loaded');

// js/core/depth.js
import { canvas } from './dom.js';
import { clamp01 } from './utils.js';
import * as EX from './exporters.js'; // unified exporters

let ctx, W = 0, H = 0;
let gray = null; // Float32Array grayscale [0..1] in *linear* space
let srcName = 'depth'; // base filename for exports

/* ---------- sRGB <-> Linear helpers (GAMMA-CORRECT) ---------- */
function toLinear(v){ return v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
function toSRGB(v){  return v <= 0.0031308 ? v*12.92 : 1.055*Math.pow(v, 1/2.4) - 0.055; }

/* ---------- repaint scheduler (fixes wheel/scroll “ignores settings”) ---------- */
let needsPaint = false;
function invalidate() {
  if (!gray || needsPaint) return;
  needsPaint = true;
  requestAnimationFrame(() => {
    needsPaint = false;
    renderDepth();
  });
}

export async function initDepth() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDepth(), { once: true });
    return;
  }

  ctx = canvas.getContext('2d', { willReadFrequently: true });

  // wire file chooser + drag/drop on the stage area
  const file = document.getElementById('file');
  const stage = document.getElementById('stageWrap');
  const status = document.getElementById('status');

  file?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) loadImageFile(f);
  });
  stage?.addEventListener('dragover', (e) => e.preventDefault());
  stage?.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) loadImageFile(f);
  });

  if (status) status.textContent = 'Load or drop an image to generate a depth map.';

  // UI wiring (order matters)
  initRangeBubbles();
  wireDepthControls();
  bindLabelReadouts();
  updateAllRangeBubbles();

  // Reset button
  document.getElementById('clearstage')?.addEventListener('click', onResetClick);
  document.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('#clearstage');
    if (btn) onResetClick(e);
  });

  // Repaint when viewport moves/zooms so settings stay applied
  stage?.addEventListener('wheel',  () => invalidate(), { passive: true });
  stage?.addEventListener('scroll', () => invalidate(), { passive: true });
  window.addEventListener('resize', () => invalidate());

  // Export: always embed SoftSin-Depth metadata
  const btn = document.getElementById('btnExportDepth');
  btn?.addEventListener('click', async () => {
    invalidate();
    await new Promise(r => requestAnimationFrame(r)); // ensure freshest frame

    const suggested = `${srcName}_depth`;
    const textMap = collectDepthTextMap(); // { 'SoftSin-Depth': JSON.stringify({...}) }

    try {
      // 1) Dedicated depth exporter (stamps metadata)
      if (typeof EX.exportDepthPNG === 'function') {
        await EX.exportDepthPNG(canvas, suggested, JSON.parse(textMap['SoftSin-Depth']));
        return;
      }
      // 2) Reuse interactive dialogs, passing textMap so they stamp tEXt
      if (typeof EX.exportPNGInteractive === 'function') {
        await EX.exportPNGInteractive({ canvas, baseName: suggested, textMap });
        return;
      }
      if (typeof EX.startExportPNG === 'function') {
        await EX.startExportPNG(canvas, suggested, textMap);
        return;
      }
      if (typeof EX.openExportDialog === 'function') {
        await EX.openExportDialog({ canvas, baseName: suggested, textMap });
        return;
      }

      // 3) No dialog? Still stamp metadata before saving.
      const typed = (prompt('Save as…', suggested) || '').trim();
      if (!typed) return;
      const base = typed.replace(/\.png$/i, '');
      if (typeof EX.exportStampedPNG === 'function') {
        await EX.exportStampedPNG(canvas, base, textMap);
      } else {
        console.warn('[SoftSinDepth] stamped exporter missing; PNG will not contain tEXt metadata.');
      }
    } catch (err) {
      if (err?.name === 'AbortError' || /cancel/i.test(String(err?.message))) {
        console.info('[SoftSinDepth] export canceled.');
        return;
      }
      console.error('[SoftSinDepth] export failed:', err);
    }
  });

  document.addEventListener('input', onRangeInputDelegated, true);
  document.addEventListener('change', onRangeInputDelegated, true);
}

function onResetClick(e){
  e.preventDefault();
  e.stopPropagation();
  resetDepthControls();
}

async function loadImageFile(file) {
  const bmp = await createImageBitmap(file);
  W = canvas.width = bmp.width;
  H = canvas.height = bmp.height;
  ctx.drawImage(bmp, 0, 0, W, H);

  srcName = (file?.name || 'depth').replace(/\.[^.]+$/, '') || 'depth';

  // If PNG with embedded settings, restore them before processing.
  try {
    if (file && typeof EX.readDepthSettingsFromPng === 'function' && /image\/png/i.test(file.type || '')) {
      const meta = await EX.readDepthSettingsFromPng(file);
      if (meta && typeof meta === 'object') {
        setDepthParams({
          bias:    meta.bias,
          contrast:meta.contrast,
          edge:    meta.edge,
          smooth:  meta.smooth,
          invert:  !!meta.invert
        });
      }
    }
  } catch (err) {
    console.warn('[SoftSinDepth] depth settings read failed (non-fatal):', err);
  }

  // build grayscale buffer in *linear space* (Rec.601 coefficients)
  const src = ctx.getImageData(0, 0, W, H).data;
  gray = new Float32Array(W * H);
  for (let i = 0, j = 0; i < src.length; i += 4, j++) {
    const r = toLinear(src[i]   / 255);
    const g = toLinear(src[i+1] / 255);
    const b = toLinear(src[i+2] / 255);
    gray[j] = 0.299*r + 0.587*g + 0.114*b;
  }
  invalidate();
  updateAllRangeBubbles();
}

function wireDepthControls() {
  ['depthBias','contrast','edgeAmt','smooth', 'invertDepth'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const onInput = () => {
      invalidate();
      if (el.type === 'range') {
        const wrap = el.closest('.range');
        if (wrap) wrap.classList.add('active');
        const b = wrap?.querySelector('.bubble');
        if (b) updateRangeBubble(el, b);
      }
    };

    el.addEventListener('input', onInput);

    el.addEventListener('change', () => {
      if (el.type === 'range') {
        const wrap = el.closest('.range');
        if (wrap) setTimeout(() => wrap.classList.remove('active'), 120);
      } else {
        invalidate();
      }
    });

    if (el.type === 'range') {
      el.addEventListener('focus', () => el.closest('.range')?.classList.add('active'));
      el.addEventListener('blur',  () => el.closest('.range')?.classList.remove('active'));
    }
  });
}

/* ---------------- depth render ---------------- */

function renderDepth() {
  if (!gray) return;
  const bias   = parseFloat(document.getElementById('depthBias')?.value ?? 0.5);
  const cont   = parseFloat(document.getElementById('contrast')?.value  ?? 1.0);
  const edge   = parseFloat(document.getElementById('edgeAmt')?.value   ?? 0.0);
  const smooth = parseFloat(document.getElementById('smooth')?.value    ?? 0.0);
  const invert = !!document.getElementById('invertDepth')?.checked;

  let base = percentileNormalize(gray, 0.01, 0.99);

  const r   = (smooth|0) * 2 + 2;
  const eps = 1e-3;
  let buf   = r > 0 ? guidedFilterGray(gray, base, W, H, r, eps) : base;

  if (edge > 0.001) {
    const e = sobelMag(gray, W, H);
    const t = Math.min(1, edge) * 0.35;
    buf = mix(buf, e, t);
  }

  const out = new Uint8ClampedArray(W * H * 4);
  const k = 2 + cont * 8;
  for (let i = 0, p = 0; i < buf.length; i++, p += 4) {
    let v = clamp01(buf[i] + (bias - 0.5));
    v = sigmoid(v, k, 0.5);
    if (invert) v = 1 - v;
    v = toSRGB(clamp01(v));
    const u8 = (v * 255) | 0;
    out[p] = out[p+1] = out[p+2] = u8;
    out[p+3] = 255;
  }
  ctx.putImageData(new ImageData(out, W, H), 0, 0);
}

/* ---------------- export text map helper ---------------- */

function collectDepthTextMap() {
  const bias   = parseFloat(document.getElementById('depthBias')?.value ?? 0.5);
  const cont   = parseFloat(document.getElementById('contrast')?.value  ?? 1.0);
  const edge   = parseFloat(document.getElementById('edgeAmt')?.value   ?? 0.0);
  const smooth = parseFloat(document.getElementById('smooth')?.value    ?? 0.0);
  const invert = !!document.getElementById('invertDepth')?.checked;
  return {
    'SoftSin-Depth': JSON.stringify({ version: 1, bias, contrast: cont, edge, smooth, invert, gamma: 'srgb' })
  };
}

/* ---------------- RESET: snap UI back to defaults ---------------- */

function resetDepthControls() {
  const set = (id, fallback) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      const hasData = el.hasAttribute('data-default');
      const def = hasData ? el.getAttribute('data-default') : (el.defaultChecked);
      el.checked = hasData ? (def === 'true' || def === '1') : !!def;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const hasData = el.hasAttribute('data-default');
      const def = hasData ? el.getAttribute('data-default')
                          : (el.defaultValue ?? fallback);
      el.value = String(def);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  set('depthBias', 0.5);
  set('contrast', 1.0);
  set('edgeAmt', 0.0);
  set('smooth', 0);
  set('invertDepth', false);

  updateAllRangeBubbles?.();
  invalidate();
}

/* ---------------- slider value bubbles ---------------- */

function initRangeBubbles() {
  const ranges = document.querySelectorAll('.range input[type="range"]');
  ranges.forEach((input) => {
    const wrap = input.closest('.range');
    if (!wrap) return;

    let bubble = wrap.querySelector('.bubble');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.setAttribute('aria-hidden', 'true');
      wrap.appendChild(bubble);
    }
    attachRangeBubble(input, bubble, wrap);
  });

  window.addEventListener('resize', updateAllRangeBubbles);
}

function bindLabelReadouts() {
  const ids = ['depthBias','contrast','edgeAmt','smooth'];
  ids.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    const label = document.querySelector(`label[for="${id}"]`);
    if (!label) return;

    let readout = label.querySelector('.readout');
    if (!readout) {
      readout = document.createElement('small');
      readout.className = 'readout';
      readout.style.marginLeft = 'auto';
      readout.style.opacity = '.7';
      label.appendChild(readout);
    }

    const update = () => {
      const step = String(input.step || '');
      const dec = step.includes('.') ? step.split('.')[1].length : 0;
      readout.textContent = dec ? Number(input.value).toFixed(dec) : String(Math.round(Number(input.value)));
    };
    input.addEventListener('input', update);
    update();
  });
}

function attachRangeBubble(input, bubble, wrap) {
  const fmt = (val, step) => {
    if (!step || String(step).indexOf('.') === -1) return String(Math.round(val));
    const dec = String(step).split('.')[1]?.length ?? 0;
    return Number(val).toFixed(dec);
  };

  const update = () => updateRangeBubble(input, bubble, fmt);
  const setActive = (on) => wrap.classList.toggle('active', on);

  input.addEventListener('input', () => { update(); setActive(true); });
  input.addEventListener('change', () => { update(); setActive(false); });

  input.addEventListener('mousedown', () => setActive(true));
  input.addEventListener('touchstart', () => setActive(true), { passive: true });
  window.addEventListener('mouseup', () => setActive(false));
  window.addEventListener('touchend', () => setActive(false), { passive: true });

  input.addEventListener('focus', () => { setActive(true); update(); });
  input.addEventListener('blur',  () => setActive(false));

  update();
}

function onRangeInputDelegated(e) {
  const input = e.target;
  if (!input || input.tagName !== 'INPUT' || input.type !== 'range') return;

  const wrap = input.closest('.range');
  const bubble = wrap?.querySelector('.bubble');
  if (!wrap || !bubble) return;

  wrap.classList.add('active');
  updateRangeBubble(input, bubble);
  if (e.type === 'change') setTimeout(() => wrap.classList.remove('active'), 120);
}

function updateRangeBubble(input, bubble, fmt = defaultFmt) {
  const min = parseFloat(input.min || '0');
  const max = parseFloat(input.max || '100');
  const val = parseFloat(input.value);

  bubble.textContent = fmt(val, input.step);

  const denom = Math.max(1e-9, max - min);
  const pct = (val - min) / denom;

  const wrap = input.closest('.range');
  const wrapW = wrap.clientWidth || 0;
  const bw = bubble.offsetWidth || 24;

  const x = Math.max(bw / 2, Math.min(wrapW - bw / 2, pct * wrapW));
  bubble.style.left = `${x}px`;
}

function updateAllRangeBubbles() {
  document.querySelectorAll('.range input[type="range"]').forEach((input) => {
    const bubble = input.closest('.range')?.querySelector('.bubble');
    if (bubble) updateRangeBubble(input, bubble);
  });
}

function defaultFmt(val, step) {
  if (!step || String(step).indexOf('.') === -1) return String(Math.round(val));
  const dec = String(step).split('.')[1]?.length ?? 0;
  return Number(val).toFixed(dec);
}

/* -------- depth helpers (edge-aware + math) -------- */

function percentileNormalize(buf, loP = 0.01, hiP = 0.99) {
  const n = buf.length;
  const step = Math.max(1, Math.floor(n / 200000));
  const samp = [];
  for (let i = 0; i < n; i += step) samp.push(buf[i]);
  samp.sort((a, b) => a - b);
  const lo = samp[Math.max(0, Math.floor(loP * (samp.length - 1)))];
  const hi = samp[Math.max(0, Math.floor(hiP * (samp.length - 1)))];
  const inv = hi > lo ? 1 / (hi - lo) : 1;

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = (buf[i] - lo) * inv;
    out[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return out;
}

function guidedFilterGray(I, P, w, h, r = 4, eps = 1e-3) {
  const box = (src) => boxBlur(src, w, h, r);

  const N = w * h;
  const meanI = box(I);
  const meanP = box(P);

  const IP = new Float32Array(N);
  for (let i = 0; i < N; i++) IP[i] = I[i] * P[i];
  const meanIP = box(IP);

  const covIP = new Float32Array(N);
  for (let i = 0; i < N; i++) covIP[i] = meanIP[i] - meanI[i] * meanP[i];

  const II = new Float32Array(N);
  for (let i = 0; i < N; i++) II[i] = I[i] * I[i];
  const meanII = box(II);
  const varI = new Float32Array(N);
  for (let i = 0; i < N; i++) varI[i] = meanII[i] - meanI[i] * meanI[i];

  const a = new Float32Array(N);
  const b = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const denom = varI[i] + eps;
    a[i] = denom > 0 ? (covIP[i] / denom) : 0;
    b[i] = meanP[i] - a[i] * meanI[i];
  }

  const meanA = box(a);
  const meanB = box(b);

  const q = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const v = meanA[i] * I[i] + meanB[i];
    q[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return q;
}

const getDepthParams = () => ({
  bias: +depthBias.value,
  contrast: +contrast.value,
  edge: +edgeAmt.value,
  smooth: +smooth.value,
  invert: !!invertDepth.checked
});
const setDepthParams = (p) => {
  if ('bias' in p) depthBias.value = p.bias;
  if ('contrast' in p) contrast.value = p.contrast;
  if ('edge' in p) edgeAmt.value = p.edge;
  if ('smooth' in p) smooth.value = p.smooth;
  if ('invert' in p) invertDepth.checked = p.invert;
  renderDepth(); updateAllRangeBubbles();
};

function sigmoid(v, k = 6, mid = 0.5) {
  return 1 / (1 + Math.exp(-k * (v - mid)));
}

/* -------- small helpers (can move to utils.js later) -------- */
function boxBlur(src, w, h, r) {
  if (r <= 0) return src;
  const tmp = new Float32Array(w*h), dst = new Float32Array(w*h);
  const n = 2*r + 1, inv = 1 / n;

  // horizontal
  for (let y = 0; y < h; y++) {
    let acc = 0, base = y*w;
    for (let x = -r; x <= r; x++) acc += src[base + Math.min(w-1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[base + x] = acc * inv;
      const add = Math.min(w-1, x + r + 1), sub = Math.max(0, x - r);
      acc += src[base + add] - src[base + sub];
    }
  }
  // vertical
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h-1, Math.max(0, y))*w + x];
    for (let y = 0; y < h; y++) {
      dst[y*w + x] = acc * inv;
      const add = Math.min(h-1, y + r + 1), sub = Math.max(0, y - r);
      acc += tmp[add*w + x] - tmp[sub*w + x];
    }
  }
  return dst;
}

function sobelMag(g, w, h) {
  const dst = new Float32Array(w*h);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const i = y*w + x;
      const tl=g[(y-1)*w+(x-1)], tc=g[(y-1)*w+x], tr=g[(y-1)*w+(x+1)];
      const ml=g[y*w+(x-1)],     mr=g[y*w+(x+1)];
      const bl=g[(y+1)*w+(x-1)], bc=g[(y+1)*w+x], br=g[(y+1)*w+(x+1)];
      const gx = -tl - 2*ml - bl + tr + 2*mr + br;
      const gy = -tl - 2*tc - tr + bl + 2*bc + br;
      dst[i] = Math.hypot(gx, gy);
    }
  }
  let m = 1e-6; for (let i = 0; i < dst.length; i++) m = Math.max(m, dst[i]);
  const inv = 1 / m; for (let i = 0; i < dst.length; i++) dst[i] = Math.min(1, dst[i] * inv);
  return dst;
}

function mix(a, b, t) {
  const d = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) d[i] = a[i] * (1 - t) + b[i] * t;
  return d;
}
