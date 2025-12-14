// Limb/color helpers isolated from app code
import {
  BODY25_PAIRS,
  BODY25_RENDER_PAIRS,
  OP_BODY25_BONE_COLORS,
  OP_COLORS,
  HAND_COLORS
} from './constants.js';

/* ================= BODY_25 ================= */

// Legacy limb resolver (USED for depth, UI, back-compat)
export function limbForPair(a, b) {
  const s = new Set([a, b]);
  if ((s.has(1)&&s.has(2))||(s.has(2)&&s.has(3))||(s.has(3)&&s.has(4))) return 'rarm';
  if ((s.has(1)&&s.has(5))||(s.has(5)&&s.has(6))||(s.has(6)&&s.has(7))) return 'larm';
  if ((s.has(8)&&s.has(9))||(s.has(9)&&s.has(10))||(s.has(10)&&s.has(11))) return 'rleg';
  if ((s.has(8)&&s.has(12))||(s.has(12)&&s.has(13))||(s.has(13)&&s.has(14))) return 'lleg';
  if ((s.has(0)&&s.has(15))||(s.has(15)&&s.has(17))||(s.has(0)&&s.has(16))||(s.has(16)&&s.has(18))) return 'head';
  if ((s.has(1)&&s.has(0))||(s.has(1)&&s.has(8))||(s.has(1)&&s.has(9))||(s.has(1)&&s.has(12))) return 'torso';
  return 'torso';
}

/* -------------------------------------------------
   ADDITIVE: OpenPose render-pair indexed bone color
   ------------------------------------------------- */
function renderPairIndex(a, b) {
  return BODY25_RENDER_PAIRS.findIndex(p => p[0] === a && p[1] === b);
}

/* -------------------------------------------------
   Bone color resolver
   - Uses OpenPose palette when available
   - Falls back to legacy limb colors safely
   ------------------------------------------------- */
export function colorForPair(a, b) {
  const idx = renderPairIndex(a, b);
  if (idx !== -1 && OP_BODY25_BONE_COLORS[idx]) {
    return OP_BODY25_BONE_COLORS[idx];
  }
  return OP_COLORS[limbForPair(a, b)] || OP_COLORS.torso;
}

/* -------------------------------------------------
   Joint color (legacy behavior preserved)
   ------------------------------------------------- */
export function colorForJoint(i) {
  for (const [a, b] of BODY25_PAIRS) {
    if (a === i || b === i) return colorForPair(a, b);
  }
  return OP_COLORS.joint;
}

export function limbForJoint(i) {
  for (const [a, b] of BODY25_PAIRS) {
    if (a === i || b === i) return limbForPair(a, b);
  }
  return 'torso';
}

/* ================= HAND COLORS =================
   Uses HAND_COLORS from constants.js
================================================= */

function normSide(side) {
  if (side === 'lhand' || side === 'L' || side === 'l') return 'l';
  if (side === 'rhand' || side === 'R' || side === 'r') return 'r';
  return side;
}

function handKeyForIndex(prefix, idx) {
  if (idx === 0) return `${prefix}Wrist`;

  const groups = [
    { start:1, end:4,  name:'Thumb'  },
    { start:5, end:8,  name:'Index'  },
    { start:9, end:12, name:'Middle' },
    { start:13,end:16, name:'Ring'   },
    { start:17,end:20, name:'Pinky'  },
  ];
  for (const g of groups) {
    if (idx >= g.start && idx <= g.end) {
      const pos = idx - g.start;
      const seg = ['Base','1','2','End'][pos];
      return `${prefix}${g.name}${seg}`;
    }
  }
  return null;
}

export function colorForHand(side, idx) {
  const p = normSide(side);
  const key = handKeyForIndex(p, idx);
  const fallback = (p === 'l' ? OP_COLORS.larm : OP_COLORS.rarm);
  return (key && HAND_COLORS[key]) ? HAND_COLORS[key] : fallback;
}

export function colorForHandPair(side, a, b) {
  return colorForHand(side, b);
}

/* ---- Back-compat aliases ---- */
export const handColor = colorForHand;
export const handColorForPair = colorForHandPair;

/* ================= NUMERIC HELPERS ================= */

export const clamp = (v, lo = 0, hi = 1) =>
  (v < lo ? lo : v > hi ? hi : v);

export const clamp01 = (v) =>
  (v < 0 ? 0 : v > 1 ? 1 : v);

export const lerp = (a, b, t) =>
  a + (b - a) * t;

export const remap = (x, in0, in1, out0 = 0, out1 = 1) =>
  out0 + (out1 - out0) * ((x - in0) / (in1 - in0));
