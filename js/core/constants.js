/* =========================
   SoftSin Pose Editor — Core Constants
   ========================= */

// ----- BODY_25 -----
export const JOINTS = [
  "Nose","Neck","RShoulder","RElbow","RWrist","LShoulder","LElbow","LWrist",
  "MidHip","RHip","RKnee","RAnkle","LHip","LKnee","LAnkle",
  "REye","LEye","REar","LEar","RBigToe","RSmallToe","RHeel","LBigToe","LSmallToe","LHeel"
];

// ===== BODY_25 (OpenPose canonical) =====
// Indices are from the subject's perspective (OpenPose convention).
export const BODY25_NAMES = [
  "Nose","Neck","RShoulder","RElbow","RWrist","LShoulder","LElbow","LWrist",
  "MidHip","RHip","RKnee","RAnkle","LHip","LKnee","LAnkle",
  "REye","LEye","REar","LEar","LBigToe","LSmallToe","LHeel","RBigToe","RSmallToe","RHeel"
];

// Plain edge list: keep format-agnostic for max interop
export const BODY25_PAIRS = [
  // head
  [0,1], [0,15], [15,17], [0,16], [16,18],
  // torso / pelvis
  [1,8], [8,9], [8,12],
  // right arm
  [1,2], [2,3], [3,4],
  // left arm
  [1,5], [5,6], [6,7],
  // right leg + foot
  [9,10], [10,11], [11,22], [11,24], [22,23],
  // left leg + foot
  [12,13], [13,14], [14,19], [14,21], [19,20]
];

// ===== HANDS (21-point, standard) =====
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

// ===== COLORS (kept separate from topology) =====
// Common OpenPose-inspired scheme: cool=left, warm=right, cyan torso/head.
export const OP_COLORS = {
  torso: "#00FFFF",
  head:  "#00FFFF",
  rarm:  "#FFA500",
  larm:  "#00FF00",
  rleg:  "#FF00FF",
  lleg:  "#0000FF",
  rfoot: "#CC00CC",
  lfoot: "#0000CC",
  joint: "#FFFFFF"
};

// Group edges by semantic region (indices into BODY25_EDGES)
export const BODY25_GROUPS = {
  head:  [0,1,2,3,4],
  torso: [5,6,7],
  rarm:  [8,9,10],
  larm:  [11,12,13],
  rleg:  [14,15],
  rfoot: [16,17,18],
  lleg:  [19,20],
  lfoot: [21,22,23]
};

// Derive per-edge colors at runtime (renderer can use this directly)
export const BODY25_EDGE_COLORS = BODY25_EDGES.map((_, i) => {
  if (BODY25_GROUPS.head.includes(i))  return OP_COLORS.head;
  if (BODY25_GROUPS.torso.includes(i)) return OP_COLORS.torso;
  if (BODY25_GROUPS.rarm.includes(i))  return OP_COLORS.rarm;
  if (BODY25_GROUPS.larm.includes(i))  return OP_COLORS.larm;
  if (BODY25_GROUPS.rleg.includes(i))  return OP_COLORS.rleg;
  if (BODY25_GROUPS.rfoot.includes(i)) return OP_COLORS.rfoot;
  if (BODY25_GROUPS.lleg.includes(i))  return OP_COLORS.lleg;
  if (BODY25_GROUPS.lfoot.includes(i)) return OP_COLORS.lfoot;
  return OP_COLORS.joint;
});

// ===== HAND COLORS (your existing palette is fine) =====
export const HAND_COLORS = {
  // Right Hand (Warm)
  rWrist: "#E65100",
  rThumbBase: "#FF7043", rThumb1: "#FF7043", rThumb2: "#FF7043", rThumbEnd: "#FF7043",
  rIndexBase: "#FF9800", rIndex1: "#FF9800", rIndex2: "#FF9800", rIndexEnd: "#FF9800",
  rMiddleBase: "#FFB74D", rMiddle1: "#FFB74D", rMiddle2: "#FFB74D", rMiddleEnd: "#FFB74D",
  rRingBase: "#F57C00", rRing1: "#F57C00", rRing2: "#F57C00", rRingEnd: "#F57C00",
  rPinkyBase: "#F4511E", rPinky1: "#F4511E", rPinky2: "#F4511E", rPinkyEnd: "#F4511E",

  // Left Hand (Cool)
  lWrist: "#00695C",
  lThumbBase: "#4DB6AC", lThumb1: "#4DB6AC", lThumb2: "#4DB6AC", lThumbEnd: "#4DB6AC",
  lIndexBase: "#26A69A", lIndex1: "#26A69A", lIndex2: "#26A69A", lIndexEnd: "#26A69A",
  lMiddleBase: "#80CBC4", lMiddle1: "#80CBC4", lMiddle2: "#80CBC4", lMiddleEnd: "#80CBC4",
  lRingBase: "#009688", lRing1: "#009688", lRing2: "#009688", lRingEnd: "#009688",
  lPinkyBase: "#00796B", lPinky1: "#00796B", lPinky2: "#00796B", lPinkyEnd: "#00796B"
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

// ---- Depth & layering defaults ----
export const DEFAULT_DEPTH_MAP = {
  rarm:1, larm:1, rleg:1, lleg:1, torso:1, head:1, lhand:1, rhand:1
};
export const DIM_BACK_LAYERS_DEFAULT = true;
export const DEPTH_ALPHA = { back:0.65, mid:0.9, front:1.0 };

// ---- Zoom behavior ----
export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 6;
export const ZOOM_STEP = 1.1;

// ---- UI defaults ----
export const UI_DEFAULTS = {
  usePoseColors: true,
  boneStrokeWidth: 6,
  jointRadius: 3,
  colorJointsByLimb: false,
  showCursorLabel: true,
  showSkeleton: true
};

// ---- Limbs used for depth controls ----
export const LIMB_KEYS = ['rarm','larm','rleg','lleg','torso','head','lhand','rhand'];

// ---- Status/help text ----
export const HELP_STATUS_TEXT =
  'Load an image or template → Select a joint → Click to place and drag to position. ' +
  'MWheel: Zoom | Middle: Pan | Depth (z-order) sets depth position for bones | ' +
  'Tip: Adjust Bone/Joint thickness for more accuracy';

// Add near other constants
export const PNG_POSE_TEXT_KEY = 'SoftSinPose';
