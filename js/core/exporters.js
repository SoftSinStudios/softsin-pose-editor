import { BODY25_PAIRS, HAND_PAIRS, N, PNG_POSE_TEXT_KEY } from './constants.js';
import { canvas, img } from './dom.js';
import {
  kps, lhand, rhand, boneStrokeWidth, jointRadius, colorJointsByLimb, usePoseColors,
  alphaForDepth, depthForLimb
} from './state.js';
import { colorForPair, limbForPair, limbForJoint, colorForJoint, handColor } from './utils.js';

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
    if (!rp || rp.x==null || rp.y==null || rp.missing) R.push(0,0,0);
    else R.push(rp.x, rp.y, rp.c ?? 1);
  }
  return {
    version: 1.3,
    people: [{
      pose_keypoints_2d: body,
      face_keypoints_2d: [],
      hand_left_keypoints_2d: L,
      hand_right_keypoints_2d: R
    }],
    image_size: [canvas.width, canvas.height],
    keypoint_format: "body25+hands-pixels"
  };
}

/* ---------- JSON Export (unchanged) ---------- */
export function exportJson() {
  const usePixels = document.getElementById('scaleOut')?.checked ?? true;

  const body=[];
  for (let i=0;i<N;i++){
    const p=kps[i];
    if (!p || p.x==null || p.y==null || p.missing) body.push(0,0,0);
    else body.push(usePixels?p.x:p.x/canvas.width, usePixels?p.y:p.y/canvas.height, p.c ?? 1);
  }
  const L=[], R=[];
  for (let i=0;i<21;i++){
    const lp=lhand[i], rp=rhand[i];
    if (!lp || lp.x==null || lp.y==null || lp.missing) L.push(0,0,0);
    else L.push(usePixels?lp.x:lp.x/canvas.width, usePixels?lp.y:lp.y/canvas.height, lp.c ?? 1);
    if (!rp || rp.x==null || rp.y==null || rp.missing) R.push(0,0,0);
    else R.push(usePixels?rp.x:rp.x/canvas.width, usePixels?rp.y:rp.y/canvas.height, rp.c ?? 1);
  }

  const json={
    version:1.3,
    people:[{ pose_keypoints_2d:body, face_keypoints_2d:[], hand_left_keypoints_2d:L, hand_right_keypoints_2d:R }],
    image_size:[canvas.width,canvas.height],
    keypoint_format:(usePixels?"body25+hands-pixels":"body25+hands-normalized")
  };
  downloadBlob(new Blob([JSON.stringify(json,null,2)],{type:'application/json'}),'openpose_body25_hands.json');
}

/* ---------- PNG Export (per-finger colors + embedded pose) ---------- */
export function exportPosePng() {
  const tmp=document.createElement('canvas'); tmp.width=canvas.width; tmp.height=canvas.height;
  const t=tmp.getContext('2d'); t.fillStyle='#000'; t.fillRect(0,0,tmp.width,tmp.height);

  const segs=[];

  // BODY
  for (const [a,b] of BODY25_PAIRS){
    const pa=kps[a], pb=kps[b];
    if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;
    segs.push({
      ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y,
      color: usePoseColors ? colorForPair(a,b) : '#FFF',
      width: boneStrokeWidth,
      depth: depthForLimb(limbForPair(a,b))
    });
  }

  // HANDS
  function handSegs(handArr, limbKey){
    for (const [a,b] of HAND_PAIRS){
      const pa=handArr[a], pb=handArr[b];
      if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;
      const segColor = usePoseColors ? handColor(limbKey, b) : '#FFF';
      segs.push({
        ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y,
        color: segColor,
        width: boneStrokeWidth,
        depth: depthForLimb(limbKey)
      });
    }
    const isLeft = (limbKey==='lhand');
    const bodyWrist = isLeft ? kps[7] : kps[4];
    const handWrist = handArr[0];
    if (bodyWrist && handWrist && bodyWrist.x!=null && handWrist.x!=null && !bodyWrist.missing && !handWrist.missing){
      const wristColor = usePoseColors ? handColor(limbKey, 0) : '#FFF';
      segs.push({
        ax:bodyWrist.x, ay:bodyWrist.y, bx:handWrist.x, by:handWrist.y,
        color: wristColor,
        width: boneStrokeWidth,
        depth: depthForLimb(limbKey)
      });
    }
  }
  handSegs(lhand,'lhand');
  handSegs(rhand,'rhand');

  // JOINTS
  const joints=[];
  for (let i=0;i<N;i++){
    const p=kps[i]; if (!p || p.x==null || p.missing) continue;
    joints.push({
      x:p.x, y:p.y, r:jointRadius,
      fill:(colorJointsByLimb&&usePoseColors)?colorForJoint(i):'#FFF',
      depth:depthForLimb(limbForJoint(i))
    });
  }
  function handDots(arr, limbKey){
    for (let i=0;i<arr.length;i++){
      const p=arr[i]; if (!p || p.x==null || p.missing) continue;
      const fill = (colorJointsByLimb && usePoseColors) ? handColor(limbKey, i) : '#FFF';
      joints.push({ x:p.x, y:p.y, r:jointRadius, fill, depth:depthForLimb(limbKey) });
    }
  }
  handDots(lhand,'lhand');
  handDots(rhand,'rhand');

  // draw
  segs.sort((a,b)=>a.depth-b.depth);
  joints.sort((a,b)=>a.depth-b.depth);

  for (const s of segs){
    t.globalAlpha=alphaForDepth(s.depth);
    t.lineWidth=s.width; t.strokeStyle=s.color;
    t.beginPath(); t.moveTo(s.ax,s.ay); t.lineTo(s.bx,s.by); t.stroke();
  }
  for (const j of joints){
    t.globalAlpha=alphaForDepth(j.depth);
    t.beginPath(); t.arc(j.x,j.y,j.r,0,Math.PI*2);
    t.fillStyle=j.fill; t.fill();
  }
  t.globalAlpha=1;

  tmp.toBlob(async (blob)=>{
    if (!blob) return;

    // Embed SoftSin pose metadata as PNG tEXt
    const payloadJSON = JSON.stringify(buildPosePayload());
    const stamped = await injectPngText(blob, PNG_POSE_TEXT_KEY, payloadJSON);

    let suggested = 'pose.png';
    try {
      const src = img?.src || '';
      const m = src.match(/([^\/\\?#]+)\.(png|jpg|jpeg|webp|gif)/i);
      if (m) suggested = `${m[1]}_pose.png`;
    } catch {}
    await saveBlobAs(stamped, suggested);
  },'image/png');
}
