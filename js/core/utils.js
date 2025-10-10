// Limb/color helpers isolated from app code
import { BODY25_PAIRS, OP_COLORS } from './constants.js';

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

export function colorForHand(side, index) {
  const names = [
    "Wrist",
    "Thumb Base","Thumb 1","Thumb 2","Thumb End",
    "Index Base","Index 1","Index 2","Index End",
    "Middle Base","Middle 1","Middle 2","Middle End",
    "Ring Base","Ring 1","Ring 2","Ring End",
    "Pinky Base","Pinky 1","Pinky 2","Pinky End"
  ];
  const prefix = (side === 'L') ? 'l' : 'r';
  const key = prefix + names[index].replace(/\s/g, '');
  return OP_COLORS[key] || "#FFFFFF";
}

