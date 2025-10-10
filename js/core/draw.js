import { BODY25_PAIRS, HAND_PAIRS, HAND_NAMES, OP_COLORS, N } from './constants.js';
import { limbForPair, colorForPair, colorForJoint, limbForJoint } from './utils.js';
import { canvas, ctx, overlay } from './dom.js';
import {
  kps, lhand, rhand,
  boneStrokeWidth, jointRadius, colorJointsByLimb, usePoseColors,
  alphaForDepth, depthForLimb, showSkeleton, imgScale
} from './state.js';

/* ===== hand color helper =====
   Looks for keys like:
   - lWrist / rWrist
   - lThumbBase / rThumbBase
   - lThumb1 / rThumb1
   ...
   Falls back to larm/rarm if not present.
*/
function handColor(limbKey, idx){
  const prefix = (limbKey === 'lhand') ? 'l' : 'r';
  const name = HAND_NAMES[idx] || '';
  const key = (prefix + name.replace(/\s+/g, '')); // e.g. "lThumbBase"
  // fallback to limb color if not explicitly defined
  const fallback = (limbKey === 'lhand') ? OP_COLORS.larm : OP_COLORS.rarm;
  return OP_COLORS[key] || fallback;
}

// ===== main draw =====
export function draw() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const segs = [];
  if (showSkeleton) {
    for (const [a,b] of BODY25_PAIRS) {
      const pa=kps[a], pb=kps[b];
      if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;
      const limb = limbForPair(a,b);
      segs.push({
        ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y,
        color: usePoseColors ? colorForPair(a,b) : '#7fffd4',
        width: boneStrokeWidth,
        depth: depthForLimb(limb)
      });
    }
  }

  // per-segment hand lines with per-joint colors
  function handSegs(handArr, limbKey) {
    for (const [a,b] of HAND_PAIRS) {
      const pa=handArr[a], pb=handArr[b];
      if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;
      const segColor = usePoseColors ? handColor(limbKey, b) : '#7fffd4';
      segs.push({
        ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y,
        color: segColor,
        width: boneStrokeWidth,
        depth: depthForLimb(limbKey)
      });
    }
    // wrist tether to body wrist (BODY_25: R wrist=4, L wrist=7)
    const isLeft = (limbKey === 'lhand');
    const bodyWrist = isLeft ? kps[7] : kps[4];
    const handWrist = handArr[0];
    if (bodyWrist && handWrist && bodyWrist.x!=null && handWrist.x!=null && !bodyWrist.missing && !handWrist.missing){
      const tetherColor = usePoseColors ? handColor(limbKey, 0) : '#7fffd4';
      segs.push({
        ax:bodyWrist.x, ay:bodyWrist.y, bx:handWrist.x, by:handWrist.y,
        color: tetherColor,
        width: boneStrokeWidth,
        depth: depthForLimb(limbKey)
      });
    }
  }
  handSegs(lhand,'lhand');
  handSegs(rhand,'rhand');

  const joints=[];
  for (let i=0;i<N;i++){
    const p=kps[i]; if (!p || p.x==null) continue;
    const limb = limbForJoint(i);
    const jointColor=(colorJointsByLimb && usePoseColors) ? colorForJoint(i) : '#FFFFFF';
    joints.push({
      x:p.x, y:p.y,
      fill: p.missing ? '#666666' : jointColor,
      stroke: p.missing ? '#333333' : '#000000',
      depth: depthForLimb(limb)
    });
  }

  // per-joint hand dots with per-joint colors
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

  segs.sort((a,b)=>a.depth-b.depth);
  joints.sort((a,b)=>a.depth-b.depth);

  for (const s of segs){
    ctx.globalAlpha = alphaForDepth(s.depth);
    ctx.lineWidth = s.width; ctx.strokeStyle = s.color;
    ctx.beginPath(); ctx.moveTo(s.ax,s.ay); ctx.lineTo(s.bx,s.by); ctx.stroke();
  }
  for (const j of joints){
    ctx.globalAlpha = alphaForDepth(j.depth);
    ctx.beginPath(); ctx.arc(j.x, j.y, jointRadius, 0, Math.PI*2);
    ctx.fillStyle = j.fill; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = j.stroke; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ===== Overlay =====
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
