// Limb/color helpers isolated from app code
import { BODY25_PAIRS, OP_COLORS, HAND_COLORS } from './constants.js';

// ----- BODY25 -----
export function limbForPair(a, b) {
  const s = new Set([a, b]);
  if ((s.has(1)&&s.has(2))||(s.has(2)&&s.has(3))||(s.has(3)&&s.has(4))) return "rarm";
  if ((s.has(1)&&s.has(5))||(s.has(5)&&s.has(6))||(s.has(6)&&s.has(7))) return "larm";
  if ((s.has(8)&&s.has(9))||(s.has(9)&&s.has(10))||(s.has(10)&&s.has(11))) return "rleg";
  if ((s.has(8)&&s.has(12))||(s.has(12)&&s.has(13))||(s.has(13)&&s.has(14))) return "lleg";
  if ((s.has(0)&&s.has(15))||(s.has(15)&&s.has(17))||(s.has(0)&&s.has(16))||(s.has(16)&&s.has(18))) return "head";
  if ((s.has(1)&&s.has(0))||(s.has(1)&&s.has(8))||(s.has(1)&&s.has(9))||(s.has(1)&&s.has(12))) return "torso";
  return "torso";
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

// ----- HAND COLOR HELPERS -----
export function handColor(side, idx) {
  // side: 'lhand' | 'rhand'
  const p = (side === 'lhand') ? 'l' : 'r';
  let key = null;

  if (idx === 0) key = `${p}Wrist`;
  else if (idx >= 1 && idx <= 4) {
    const n = ['ThumbBase', 'Thumb1', 'Thumb2', 'ThumbEnd'];
    key = p + n[idx - 1];
  } else if (idx >= 5 && idx <= 8) {
    const n = ['IndexBase', 'Index1', 'Index2', 'IndexEnd'];
    key = p + n[idx - 5];
  } else if (idx >= 9 && idx <= 12) {
    const n = ['MiddleBase', 'Middle1', 'Middle2', 'MiddleEnd'];
    key = p + n[idx - 9];
  } else if (idx >= 13 && idx <= 16) {
    const n = ['RingBase', 'Ring1', 'Ring2', 'RingEnd'];
    key = p + n[idx - 13];
  } else if (idx >= 17 && idx <= 20) {
    const n = ['PinkyBase', 'Pinky1', 'Pinky2', 'PinkyEnd'];
    key = p + n[idx - 17];
  }

  return HAND_COLORS[key] || (side === 'lhand' ? '#26A69A' : '#FF9800');
}

export function handColorForPair(side, a, b) {
  // Returns distal joint color (b)
  return handColor(side, b);
}


