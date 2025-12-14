import {
  BODY25_PAIRS,
  BODY25_RENDER_PAIRS,
  HAND_PAIRS,
  N,
  opBody25JointColor
} from './constants.js';

import {
  limbForPair,
  colorForPair,
  limbForJoint,
  handColor
} from './utils.js';

import { canvas, ctx, overlay } from './dom.js';

import {
  kps, lhand, rhand,
  boneStrokeWidth, jointRadius, colorJointsByLimb, usePoseColors,
  alphaForDepth, depthForLimb, showSkeleton, imgScale
} from './state.js';

/* =========================================================
   Debug / Verification
   - Toggle in console: window.SOFTSIN_SHOW_PAIR_INDEX = true/false
   - Shows BODY25_RENDER_PAIRS index numbers at segment midpoints
   ========================================================= */
function shouldShowPairIndex() {
  try { return !!window.SOFTSIN_SHOW_PAIR_INDEX; } catch { return false; }
}

function drawPairIndexLabel(ctx, i, ax, ay, bx, by) {
  const mx = (ax + bx) * 0.5;
  const my = (ay + by) * 0.5;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.font = '12px monospace';
  ctx.textBaseline = 'middle';

  // outline for readability on bright segments
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(String(i), mx + 6, my - 6);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(String(i), mx + 6, my - 6);
  ctx.restore();
}

// ===== main draw =====
export function draw() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const segs = [];
  const showIdx = shouldShowPairIndex();

  if (showSkeleton) {
    // === BODY SEGMENTS (OpenPose render order) ===
    // use indexed iteration so we can label the segment index for verification
    for (let i = 0; i < BODY25_RENDER_PAIRS.length; i++) {
      const [a, b] = BODY25_RENDER_PAIRS[i];
      const pa = kps[a], pb = kps[b];
      if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;

      const limb = limbForPair(a,b);

      segs.push({
        ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y,
        color: usePoseColors ? colorForPair(a,b) : '#7fffd4',
        width: boneStrokeWidth,
        depth: depthForLimb(limb),
        _pairIndex: i
      });
    }
  }

  // === Hand Segments (unchanged) ===
  function handSegs(handArr, limbKey) {
    const isLeft = limbKey === 'lhand';
    for (const [a,b] of HAND_PAIRS) {
      const pa=handArr[a], pb=handArr[b];
      if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;
      const segColor = usePoseColors ? handColor(limbKey, b) : '#7fffd4';
      segs.push({
        ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y,
        color: segColor,
        width: boneStrokeWidth,
        depth: depthForLimb(limbKey),
        _pairIndex: null
      });
    }

    // Wrist tether to BODY25 wrist (R=4, L=7)
    const bodyWrist = isLeft ? kps[7] : kps[4];
    const handWrist = handArr[0];
    if (bodyWrist && handWrist && bodyWrist.x!=null && handWrist.x!=null && !bodyWrist.missing && !handWrist.missing) {
      const tetherColor = usePoseColors ? handColor(limbKey, 0) : '#7fffd4';
      segs.push({
        ax:bodyWrist.x, ay:bodyWrist.y, bx:handWrist.x, by:handWrist.y,
        color: tetherColor,
        width: boneStrokeWidth,
        depth: depthForLimb(limbKey),
        _pairIndex: null
      });
    }
  }

  handSegs(lhand,'lhand');
  handSegs(rhand,'rhand');

  const joints = [];

  // === BODY JOINTS (unchanged) ===
  for (let i=0;i<N;i++){
    const p=kps[i]; if (!p || p.x==null) continue;
    const limb = limbForJoint(i);
    const jointColor=(colorJointsByLimb && usePoseColors) ? opBody25JointColor(i) : '#FFFFFF';
    joints.push({
      x:p.x, y:p.y,
      fill: p.missing ? '#666666' : jointColor,
      stroke: p.missing ? '#333333' : '#000000',
      depth: depthForLimb(limb)
    });
  }

  // === HAND JOINTS (unchanged) ===
  function handDots(handArr, limbKey){
    for (let i=0;i<handArr.length;i++){
      const p=handArr[i]; if (!p || p.x==null) continue;
      const fillCol = p.missing
        ? '#666666'
        : ((colorJointsByLimb && usePoseColors) ? handColor(limbKey, i) : '#FFFFFF');
      joints.push({
        x:p.x, y:p.y,
        fill: fillCol,
        stroke: p.missing ? '#333333' : '#000000',
        depth: depthForLimb(limbKey)
      });
    }
  }
  handDots(lhand,'lhand');
  handDots(rhand,'rhand');

  // === Draw sorted by depth ===
  segs.sort((a,b)=>a.depth-b.depth);
  joints.sort((a,b)=>a.depth-b.depth);

  for (const s of segs){
    ctx.globalAlpha = alphaForDepth(s.depth);
    ctx.lineWidth = s.width;
    ctx.strokeStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(s.ax,s.ay);
    ctx.lineTo(s.bx,s.by);
    ctx.stroke();

    // Debug labels: body segments only
    if (showIdx && s._pairIndex != null) {
      drawPairIndexLabel(ctx, s._pairIndex, s.ax, s.ay, s.bx, s.by);
    }
  }

  for (const j of joints){
    ctx.globalAlpha = alphaForDepth(j.depth);
    ctx.beginPath();
    ctx.arc(j.x, j.y, jointRadius, 0, Math.PI*2);
    ctx.fillStyle = j.fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = j.stroke;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

// ===== Overlay (unchanged) =====
export function renderOverlay() {
  overlay.innerHTML='';
  function append(kind, arr, count){
    for (let i=0;i<count;i++){
      const p=arr[i];
      const dot=document.createElement('div');
      dot.className='kp'; dot.dataset.kind=kind; dot.dataset.idx=i;
      if (p.missing) dot.dataset.missing='1';
      if (p.x!=null && p.y!=null){
        dot.style.left = (p.x*imgScale)+'px';
        dot.style.top  = (p.y*imgScale)+'px';
      } else {
        dot.style.left='-9999px'; dot.style.top='-9999px';
      }
      overlay.appendChild(dot);
    }
  }
  append('body', kps, N);
  append('lhand', lhand, 21);
  append('rhand', rhand, 21);
}

export function moveOverlayDot(kind, idx, p){
  const base = (kind==='body') ? idx : (kind==='lhand' ? N+idx : N+21+idx);
  const dot=overlay.children[base];
  if (!dot) return;
  dot.style.left = (p.x*imgScale)+'px';
  dot.style.top  = (p.y*imgScale)+'px';
}
