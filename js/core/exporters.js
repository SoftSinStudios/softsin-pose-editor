import { BODY25_PAIRS, HAND_PAIRS, OP_COLORS, N, HAND_COLORS } from './constants.js';
import { canvas, img } from './dom.js';
import {
  kps, lhand, rhand, boneStrokeWidth, jointRadius, colorJointsByLimb, usePoseColors,
  alphaForDepth, depthForLimb
} from './state.js';
import { colorForPair, limbForPair, limbForJoint, colorForJoint } from './utils.js';

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

/* ---------- JSON export (unchanged) ---------- */
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
    keypoint_format: (usePixels?"body25+hands-pixels":"body25+hands-normalized")
  };
  downloadBlob(new Blob([JSON.stringify(json,null,2)],{type:'application/json'}),'openpose_body25_hands.json');
}

/* ---------- Helpers for per-finger color mapping ---------- */
// OpenPose hand indices:
// 0: wrist
// 1-4:   thumb (Base, 1, 2, End)
// 5-8:   index
// 9-12:  middle
// 13-16: ring
// 17-20: pinky
function handKeyForIndex(side /* 'l'|'r' */, idx) {
  const prefix = side === 'l' ? 'l' : 'r';
  if (idx === 0) return `${prefix}Wrist`;

  const map = [
    { start:1, end:4, name:'Thumb'  },
    { start:5, end:8, name:'Index'  },
    { start:9, end:12,name:'Middle' },
    { start:13,end:16,name:'Ring'   },
    { start:17,end:20,name:'Pinky'  },
  ];

  for (const g of map) {
    if (idx >= g.start && idx <= g.end) {
      const pos = idx - g.start; // 0..3
      const segName = ['Base','1','2','End'][pos];
      return `${prefix}${g.name}${segName}`;
    }
  }
  return null;
}

function handColorForIndex(side /* 'l'|'r' */, idx) {
  const key = handKeyForIndex(side, idx);
  return (key && HAND_COLORS[key]) ? HAND_COLORS[key] : null;
}

/* ---------- PNG export (uses per-finger colors) ---------- */
export function exportPosePng() {
  const tmp=document.createElement('canvas'); tmp.width=canvas.width; tmp.height=canvas.height;
  const t=tmp.getContext('2d'); t.fillStyle='#000'; t.fillRect(0,0,tmp.width,tmp.height);

  const segs=[];

  // Body segments (unchanged)
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

  // Hand segments with per-joint color.
  function handSegs(handArr, side /* 'l'|'r' */, limbKey /* 'lhand'|'rhand' */){
    for (const [a,b] of HAND_PAIRS){
      const pa=handArr[a], pb=handArr[b];
      if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;

      // choose the color by distal/end joint (b) so each finger stays consistent
      const segColor = usePoseColors
        ? (handColorForIndex(side, b) || (side==='l' ? OP_COLORS.larm : OP_COLORS.rarm))
        : '#FFF';

      segs.push({
        ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y,
        color: segColor,
        width: boneStrokeWidth,
        depth: depthForLimb(limbKey)
      });
    }

    // Connect body wrist -> hand wrist using wrist color
    const isLeft = (side === 'l');
    const bodyWrist = isLeft ? kps[7] : kps[4];
    const handWrist = handArr[0];
    if (bodyWrist && handWrist && bodyWrist.x!=null && handWrist.x!=null && !bodyWrist.missing && !handWrist.missing){
      const wristColor = usePoseColors
        ? (handColorForIndex(side, 0) || (isLeft ? OP_COLORS.larm : OP_COLORS.rarm))
        : '#FFF';
      segs.push({
        ax:bodyWrist.x, ay:bodyWrist.y, bx:handWrist.x, by:handWrist.y,
        color: wristColor,
        width: boneStrokeWidth,
        depth: depthForLimb(limbKey)
      });
    }
  }
  handSegs(lhand,'l','lhand');
  handSegs(rhand,'r','rhand');

  // Joints
  const joints=[];
  // Body joints (unchanged)
  for (let i=0;i<N;i++){
    const p=kps[i]; if (!p || p.x==null || p.missing) continue;
    joints.push({
      x:p.x, y:p.y, r:jointRadius,
      fill:(colorJointsByLimb&&usePoseColors)?colorForJoint(i):OP_COLORS.joint,
      depth:depthForLimb(limbForJoint(i))
    });
  }
  // Hand joints with per-joint color
  function handDots(arr, side, limbKey){
    for (let i=0;i<arr.length;i++){
      const p=arr[i]; if (!p || p.x==null || p.missing) continue;
      const col = usePoseColors
        ? (handColorForIndex(side, i) || (side==='l' ? OP_COLORS.larm : OP_COLORS.rarm))
        : OP_COLORS.joint;
      const fill = (colorJointsByLimb && usePoseColors) ? col : OP_COLORS.joint;
      joints.push({ x:p.x, y:p.y, r:jointRadius, fill, depth:depthForLimb(limbKey) });
    }
  }
  handDots(lhand,'l','lhand');
  handDots(rhand,'r','rhand');

  // depth order & draw
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
    let suggested = 'pose.png';
    try {
      const src = img?.src || '';
      const m = src.match(/([^\/\\?#]+)\.(png|jpg|jpeg|webp|gif)/i);
      if (m) suggested = `${m[1]}_pose.png`;
    } catch {}
    await saveBlobAs(blob, suggested);
  },'image/png');
}
