/* =========================
   SoftSin Pose Editor — Core Constants
   ========================= */

// ----- BODY_25 -----
export const JOINTS = [
  "Nose","Neck","RShoulder","RElbow","RWrist","LShoulder","LElbow","LWrist",
  "MidHip","RHip","RKnee","RAnkle","LHip","LKnee","LAnkle",
  "REye","LEye","REar","LEar","RBigToe","RSmallToe","RHeel","LBigToe","LSmallToe","LHeel"
];

export const BODY25_PAIRS = [
  [1,0],[1,2],[2,3],[3,4],
  [1,5],[5,6],[6,7],
  [1,8],
  [8,9],[9,10],[10,11],
  [8,12],[12,13],[13,14],
  [0,15],[15,17],
  [0,16],[16,18],
  [1,9],[1,12],
  [11,20],[20,21],[11,19],
  [14,23],[23,24],[14,22]
];

// ----- HANDS -----
export const HAND_NAMES = [
  "Wrist",
  "Thumb Base","Thumb 1","Thumb 2","Thumb End",
  "Index Base","Index 1","Index 2","Index End",
  "Middle Base","Middle 1","Middle 2","Middle End",
  "Ring Base","Ring 1","Ring 2","Ring End",
  "Pinky Base","Pinky 1","Pinky 2","Pinky End"
];

export const HAND_PAIRS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20]
];

// ----- COLORS -----
export const OP_COLORS = {
  torso: "#00FFFF",
  head: "#00FFFF",
  rarm: "#FF8C00",
  larm: "#00D16D",
  rleg: "#FF33FF",
  lleg: "#2D6BFF",
  joint: "#FFFFFF"
};

// ----- HAND COLORS -----
export const HAND_COLORS = {
  // Right Hand (Warm)
  rWrist:"#E65100",
  rThumbBase:"#FF7A45", rThumb1:"#FF7A45", rThumb2:"#FF7A45", rThumbEnd:"#FF7A45",
  rIndexBase:"#FFA040", rIndex1:"#FFA040", rIndex2:"#FFA040", rIndexEnd:"#FFA040",
  rMiddleBase:"#FFB766", rMiddle1:"#FFB766", rMiddle2:"#FFB766", rMiddleEnd:"#FFB766",
  rRingBase:"#F57C00",  rRing1:"#F57C00",  rRing2:"#F57C00",  rRingEnd:"#F57C00",
  rPinkyBase:"#F4511E", rPinky1:"#F4511E", rPinky2:"#F4511E", rPinkyEnd:"#F4511E",

  // === Left Hand (Cool) ===
  lWrist:"#00695C",
  lThumbBase:"#4DB6AC", lThumb1:"#4DB6AC", lThumb2:"#4DB6AC", lThumbEnd:"#4DB6AC",
  lIndexBase:"#26A69A", lIndex1:"#26A69A", lIndex2:"#26A69A", lIndexEnd:"#26A69A",
  lMiddleBase:"#80CBC4", lMiddle1:"#80CBC4", lMiddle2:"#80CBC4", lMiddleEnd:"#80CBC4",
  lRingBase:"#009688",  lRing1:"#009688",  lRing2:"#009688",  lRingEnd:"#009688",
  lPinkyBase:"#00796B", lPinky1:"#00796B", lPinky2:"#00796B", lPinkyEnd:"#00796B"
};

// ----- CONSTANTS -----
export const N = JOINTS.length;

export const TEMPLATE_MAP = {
  landscape: [
    { label: "768×512", path: "assets/blanks/landscape/768x512.png" },
    { label: "1024×768", path: "assets/blanks/landscape/1024x768.png" },
    { label: "1536×1024", path: "assets/blanks/landscape/1536x1024.png" }
  ],
  portrait: [
    { label: "512×768", path: "assets/blanks/portrait/512x768.png" },
    { label: "768×1024", path: "assets/blanks/portrait/768x1024.png" },
    { label: "1024×1536", path: "assets/blanks/portrait/1024x1536.png" }
  ],
  square: [
    { label: "512×512", path: "assets/blanks/square/512x512.png" },
    { label: "768×768", path: "assets/blanks/square/768x768.png" },
    { label: "1024×1024", path: "assets/blanks/square/1024x1024.png" }
  ]
};

// =========================
// Editor Defaults / Config
// =========================
export const DEFAULT_DEPTH_MAP = {
  rarm:1, larm:1, rleg:1, lleg:1, torso:1, head:1, lhand:1, rhand:1
};
export const DIM_BACK_LAYERS_DEFAULT = true;
export const DEPTH_ALPHA = { back:0.65, mid:0.9, front:1.0 };

export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 6;
export const ZOOM_STEP = 1.1;

export const UI_DEFAULTS = {
  usePoseColors: true,
  boneStrokeWidth: 6,
  jointRadius: 3,
  colorJointsByLimb: false,
  showCursorLabel: true,
  showSkeleton: true
};

export const LIMB_KEYS = ['rarm','larm','rleg','lleg','torso','head','lhand','rhand'];

export const HELP_STATUS_TEXT =
  'Load an image or template → Select a joint → Click to place and drag to position. ' +
  'MWheel: Zoom | Middle: Pan | Depth (z-order) sets depth position for bones | ' +
  'Tip: Adjust Bone/Joint thickness for more accuracy';

export const PNG_POSE_TEXT_KEY = 'SoftSinPose';

/* =========================
   Render Helpers (existing)
   ========================= */

export const BODY25_INDEX = Object.freeze({
  Nose: 0, Neck: 1,
  RShoulder: 2, RElbow: 3, RWrist: 4,
  LShoulder: 5, LElbow: 6, LWrist: 7,
  MidHip: 8,
  RHip: 9, RKnee: 10, RAnkle: 11,
  LHip: 12, LKnee: 13, LAnkle: 14,
  REye: 15, LEye: 16, REar: 17, LEar: 18,
  RBigToe: 19, RSmallToe: 20, RHeel: 21,
  LBigToe: 22, LSmallToe: 23, LHeel: 24
});

export const BODY25_GROUP_BY_INDEX = (() => {
  const g = new Array(JOINTS.length).fill("torso");
  const I = BODY25_INDEX;

  for (const idx of [I.Nose, I.REye, I.LEye, I.REar, I.LEar]) g[idx] = "head";
  for (const idx of [I.Neck, I.MidHip]) g[idx] = "torso";
  for (const idx of [I.RShoulder, I.RElbow, I.RWrist]) g[idx] = "rarm";
  for (const idx of [I.LShoulder, I.LElbow, I.LWrist]) g[idx] = "larm";
  for (const idx of [I.RHip, I.RKnee, I.RAnkle, I.RBigToe, I.RSmallToe, I.RHeel]) g[idx] = "rleg";
  for (const idx of [I.LHip, I.LKnee, I.LAnkle, I.LBigToe, I.LSmallToe, I.LHeel]) g[idx] = "lleg";

  return Object.freeze(g);
})();

export function getBodyJointColorByIndex(bodyIdx) {
  const group = BODY25_GROUP_BY_INDEX[bodyIdx] || "torso";
  return OP_COLORS[group] || OP_COLORS.torso;
}

export function getBodySegmentColor(a, b) {
  const ga = BODY25_GROUP_BY_INDEX[a] || "torso";
  const gb = BODY25_GROUP_BY_INDEX[b] || "torso";
  if (ga === gb) return OP_COLORS[ga] || OP_COLORS.torso;
  const prio = { rleg:3, lleg:3, rarm:3, larm:3, head:2, torso:1 };
  const g = (prio[ga] >= prio[gb]) ? ga : gb;
  return OP_COLORS[g] || OP_COLORS.torso;
}

export function getHandJointColor(side, handIdx) {
  const name = HAND_NAMES[handIdx];
  if (!name) return OP_COLORS.joint;
  const keyName = name.replace(/\s+/g, "");
  const key = `${side}${keyName}`;
  return HAND_COLORS[key] || OP_COLORS.joint;
}

export function getHandSegmentColor(side, a, b) {
  return getHandJointColor(side, b);
}

/* =========================================================
   ComfyUI / OpenPose BODY_25 Joint Color Palette (existing)
   ========================================================= */

export const OP_BODY25_JOINT_COLORS = Object.freeze([
  "#FF4D6D","#00FFFF","#FFAA00","#FFD000","#FFF066",
  "#00D16D","#00F0A8","#66FFD6","#00FFFF",
  "#A6FF00","#66FF00","#00FF66",
  "#2D6BFF","#2DA2FF","#00C8FF",
  "#FF33AA","#AA33FF","#FF66CC","#6633FF",
  "#00FF99","#33FFCC","#66FFFF",
  "#00CCFF","#3399FF","#0066FF"
]);

export function opBody25JointColor(idx) {
  return OP_BODY25_JOINT_COLORS[idx] || OP_COLORS.joint;
}

/* =========================================================
   ADDITIVE: OpenPose BODY_25 Render Pairs + Bone Palette
   (NO existing exports modified)
   ========================================================= */

export const BODY25_RENDER_PAIRS = Object.freeze([
  [1,8],
  [1,2],[2,3],[3,4],
  [1,5],[5,6],[6,7],
  [8,9],[9,10],[10,11],
  [8,12],[12,13],[13,14],
  [1,0],
  [0,15],[15,17],
  [0,16],[16,18],
  [11,20],[20,21],[11,19],
  [14,23],[23,24],[14,22]
]);

export const OP_BODY25_BONE_COLORS = Object.freeze([
  "#FF0000",
  "#FF5500","#FFAA00","#FFFF00",
  "#AAFF00","#55FF00","#00FF00",
  "#00FFAA","#00FFFF","#00AAFF",
  "#0055FF","#0000FF","#5500FF",
  "#AA00FF",
  "#FF00FF","#FF00AA",
  "#FF0055","#FF007F",
  "#00FF99","#33FFCC","#66FFFF"
]);
