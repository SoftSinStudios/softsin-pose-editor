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
  rarm: "#FFA500",
  larm: "#00FF00",
  rleg: "#FF00FF",
  lleg: "#0000FF",
  joint: "#FFFFFF",

// === Right Hand (Warm) ===
// === Hands (Simplified Finger Colors) ===
rWrist:  "#E65100", lWrist:  "#1B5E20",

// Right hand — warm tones
rThumb:  "#FF7043",
rIndex:  "#FF8A65",
rMiddle: "#FFB74D",
rRing:   "#FFCA28",
rPinky:  "#FFD54F",

// Left hand — cool tones
lThumb:  "#26A69A",
lIndex:  "#4DB6AC",
lMiddle: "#81C784",
lRing:   "#AED581",
lPinky:  "#C5E1A5",

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
