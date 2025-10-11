// exporters.js
import * as C from './constants.js';
import { canvas, img } from './dom.js';
import {
  kps, lhand, rhand, boneStrokeWidth, jointRadius, colorJointsByLimb, usePoseColors,
  alphaForDepth, depthForLimb
} from './state.js';
import { colorForPair, limbForPair, limbForJoint, colorForJoint, handColor } from './utils.js';

// Resolve BODY edges from either new or legacy constant; tolerate [a,b,color] triplets.
const BODY_EDGES_RAW = C.BODY25_EDGES || C.BODY25_PAIRS || [];
const BODY_EDGES = BODY_EDGES_RAW.map(e => Array.isArray(e) ? [e[0], e[1]] : e);

// Handy pulls
const HAND_PAIRS = C.HAND_PAIRS;
const N = C.N;
const PNG_POSE_TEXT_KEY = C.PNG_POSE_TEXT_KEY;

/* ---------- Blob helpers ---------- */
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

export async function saveBlobAs(blob, suggestedName='pose.png') {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      console.warn('showSaveFilePicker unavailable/canceled. Falling back.', err);
    }
  }
  const name = (typeof prompt === 'function')
    ? (prompt('Save as filename:', suggestedName) || null)
    : suggestedName;
  if (!name) return;
  downloadBlob(blob, name);
}

/* ---------- PNG tEXt injection helpers ---------- */
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function encodeTextChunk(key, value) {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(key);
  const valBytes = enc.encode(value); // JSON ASCII-safe
  const data = new Uint8Array(keyBytes.length + 1 + valBytes.length);
  data.set(keyBytes, 0);
  data[keyBytes.length] = 0; // NUL separator
  data.set(valBytes, keyBytes.length + 1);

  const type = enc.encode('tEXt');
  const crcInput = new Uint8Array(type.length + data.length);
  crcInput.set(type, 0);
  crcInput.set(data, type.length);
  const crc = crc32(crcInput);

  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(type, 4);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc);
  return out;
}

async function injectPngText(pngBlob, key, value) {
  const buf = new Uint8Array(await pngBlob.arrayBuffer());
  // PNG sig
  const sig = [137,80,78,71,13,10,26,10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return pngBlob;

  // find IEND
  let i = 8, iend = -1;
  while (i < buf.length) {
    const dv = new DataView(buf.buffer, buf.byteOffset + i);
    const len = dv.getUint32(0);
    const t0 = buf[i+4], t1 = buf[i+5], t2 = buf[i+6], t3 = buf[i+7];
    const type = String.fromCharCode(t0,t1,t2,t3);
    const next = i + 12 + len;
    if (type === 'IEND') { iend = i; break; }
    i = next;
  }
  if (iend < 0) return pngBlob;

  const textChunk = encodeTextChunk(key, value);
  const before = buf.slice(0, iend);
  const after  = buf.slice(iend); // includes IEND
  const out = new Uint8Array(before.length + textChunk.length + after.length);
  out.set(before, 0);
  out.set(textChunk, before.length);
  out.set(after, before.length + textChunk.length);
  return new Blob([out], { type: 'image/png' });
}

/* ---------- Build SoftSin pose payload (pixel coords) ---------- */
function buildPosePayload() {
  const body = [];
  for (let i = 0; i < N; i++) {
    const p = kps[i];
    if (!p || p.x == null || p.y == null || p.missing) body.push(0,0,0);
    else body.push(p.x, p.y, p.c ?? 1);
  }
  const L = [], R = [];
  for (let i = 0; i < 21; i++) {
    const lp = lhand[i], rp = rhand[i];
    if (!lp || lp.x==null || lp.y==null || lp.missing) L.push(0,0,0);
    else L.push(lp.x, lp.y, lp.c ?? 1);
    if (!rp || rp.x==null || rp.y==null || rp.m
