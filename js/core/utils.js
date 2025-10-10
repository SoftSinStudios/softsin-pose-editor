// Limb/color helpers isolated from app code
import { BODY25_PAIRS, OP_COLORS, HAND_COLORS } from './constants.js';

/* ================= BODY_25 ================= */
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

export function colorForPair(a, b) {
  return OP_COLORS[limbForPair(a, b)];
}

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
   Uses HAND_COLORS from constants.js (keys like:
   lWrist, lThumbBase, lThumb1, ..., rPinkyEnd).
   side may be 'lhand'|'rhand' or 'l'|'r'.
================================================= */

function normSide(side) {
  if (side === 'lhand' || side === 'L' || side === 'l') return 'l';
  if (side === 'rhand' || side === 'R' || side === 'r') return 'r';
  return side; // assume already 'l' or 'r'
}

function handKeyForIndex(prefix /* 'l'|'r' */, idx) {
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
      const pos = idx - g.start;           // 0..3
      const seg = ['Base','1','2','End'][pos];
      return `${prefix}${g.name}${seg}`;   // e.g. lIndexBase
    }
  }
  return null;
}

export function colorForHand(side, idx) {
  const p = normSide(side);                // 'l' or 'r'
  const key = handKeyForIndex(p, idx);
  const fallback = (p === 'l' ? OP_COLORS.larm : OP_COLORS.rarm);
  return (key && HAND_COLORS[key]) ? HAND_COLORS[key] : fallback;
}

export function colorForHandPair(side, a, b) {
  // color segment by the distal joint (b)
  return colorForHand(side, b);
}

/* ---- Back-compat aliases (if other files imported old names) ---- */
export const handColor = colorForHand;
export const handColorForPair = colorForHandPair;
