// SoftSin Studios — Pose Editor State

export const CANVAS_SIZE = {
  width: 1024,
  height: 1024
};

export const DEFAULT_LINE_WEIGHT = 6;

export const BONE_MODES = {
  STRAIGHT: "straight",
  CURVE: "curve",
  HIDDEN: "hidden"
};

export const Z_DEPTH = {
  FOREGROUND: "foreground",
  BACKGROUND: "background"
};

// BODY_25 simplified mapping (core only for now)
export const BODY25_POINTS = {
  nose:      { rgb: [255, 0, 85], hex: "#ff0055" },
  neck:      { rgb: [255, 0, 0], hex: "#ff0000" },
  rEye:      { rgb: [255, 0, 170], hex: "#ff00aa" },
  lEye:      { rgb: [170, 0, 255], hex: "#aa00ff" },
  rEar:      { rgb: [255, 0, 255], hex: "#ff00ff" },
  lEar:      { rgb: [85, 0, 255], hex: "#5500ff" },
  rShoulder: { rgb: [255, 85, 0], hex: "#ff5500" },
  rElbow:    { rgb: [255, 170, 0], hex: "#ffaa00" },
  rWrist:    { rgb: [255, 255, 0], hex: "#ffff00" },
  lShoulder: { rgb: [170, 255, 0], hex: "#aaff00" },
  lElbow:    { rgb: [85, 255, 0], hex: "#55ff00" },
  lWrist:    { rgb: [0, 255, 0], hex: "#00ff00" },
  midHip:    { rgb: [255, 0, 0], hex: "#ff0000" },
  rHip:      { rgb: [0, 255, 85], hex: "#00ff55" },
  rKnee:     { rgb: [0, 255, 170], hex: "#00ffaa" },
  rAnkle:    { rgb: [0, 255, 255], hex: "#00ffff" },
  rFoot:     { rgb: [0, 255, 255], hex: "#00ffff" },
  lHip:      { rgb: [0, 170, 255], hex: "#00aaff" },
  lKnee:     { rgb: [0, 85, 255], hex: "#0055ff" },
  lAnkle:    { rgb: [0, 0, 255], hex: "#0000ff" },
  lFoot:     { rgb: [0, 0, 255], hex: "#0000ff" }
};

// Default pose layout (centered neutral)
export function createDefaultKeypoints() {
  return {
    nose: { x: 512, y: 300 },
    neck: { x: 512, y: 390 },

    // Front-facing default dummy:
    // BODY_25 names stay anatomical, so the subject's right side appears on the viewer's left.
    rEye: { x: 479, y: 280 },
    lEye: { x: 545, y: 280 },
    rEar: { x: 439, y: 292 },
    lEar: { x: 585, y: 292 },

    rShoulder: { x: 404, y: 320 },
    rElbow: { x: 324, y: 450 },
    rWrist: { x: 284, y: 580 },

    lShoulder: { x: 620, y: 320 },
    lElbow: { x: 700, y: 450 },
    lWrist: { x: 740, y: 580 },

    midHip: { x: 512, y: 560 },

    rHip: { x: 434, y: 580 },
    rKnee: { x: 374, y: 760 },
    rAnkle: { x: 334, y: 930 },
    rFoot: { x: 290, y: 968 },

    lHip: { x: 590, y: 580 },
    lKnee: { x: 650, y: 760 },
    lAnkle: { x: 690, y: 930 },
    lFoot: { x: 734, y: 968 }
  };
}

// Core bones
export const BODY25_BONES = {
  "nose-neck": { from: "nose", to: "neck", curve: true },
  "neck-midhip": { from: "neck", to: "midHip", curve: true },
  "neck-rshoulder": { from: "neck", to: "rShoulder", curve: true },
  "neck-lshoulder": { from: "neck", to: "lShoulder", curve: true },
  "nose-reye": { from: "nose", to: "rEye" },
  "nose-leye": { from: "nose", to: "lEye" },
  "reye-rear": { from: "rEye", to: "rEar" },
  "leye-lear": { from: "lEye", to: "lEar" },

  "midhip-rhip": { from: "midHip", to: "rHip", curve: true },
  "midhip-lhip": { from: "midHip", to: "lHip", curve: true },

  "rshoulder-relbow": { from: "rShoulder", to: "rElbow" },
  "relbow-rwrist": { from: "rElbow", to: "rWrist" },

  "lshoulder-lelbow": { from: "lShoulder", to: "lElbow" },
  "lelbow-lwrist": { from: "lElbow", to: "lWrist" },

  "rhip-rknee": { from: "rHip", to: "rKnee" },
  "rknee-rankle": { from: "rKnee", to: "rAnkle" },
  "rankle-rfoot": { from: "rAnkle", to: "rFoot" },

  "lhip-lknee": { from: "lHip", to: "lKnee" },
  "lknee-lankle": { from: "lKnee", to: "lAnkle" },
  "lankle-lfoot": { from: "lAnkle", to: "lFoot" }
};

// Create full state
export function createState() {
  const bones = {};

  Object.keys(BODY25_BONES).forEach(id => {
    bones[id] = {
      mode: BODY25_BONES[id].curve ? BONE_MODES.CURVE : BONE_MODES.STRAIGHT,
      weight: DEFAULT_LINE_WEIGHT,
      z: Z_DEPTH.FOREGROUND,
      handles: []
    };
  });

  return {
    canvas: {
      width: CANVAS_SIZE.width,
      height: CANVAS_SIZE.height
    },
    exportSize: {
      width: CANVAS_SIZE.width,
      height: CANVAS_SIZE.height
    },
    selectedBone: null,
    backgroundImage: {
      enabled: false,
      name: "",
      width: 0,
      height: 0,
      dataUrl: ""
    },
    keypoints: createDefaultKeypoints(),
    bones
  };
}

// ====== HELPERS ======

export function setExportSize(state, width, height) {
  state.exportSize = {
    width: clamp(Math.round(Number(width) || CANVAS_SIZE.width), 1, 8192),
    height: clamp(Math.round(Number(height) || CANVAS_SIZE.height), 1, 8192)
  };
}

export function selectBone(state, id) {
  state.selectedBone = BODY25_BONES[id] ? id : null;
}

export function clearSelectedBone(state) {
  state.selectedBone = null;
}

export function getSelectedBone(state) {
  if (!state.selectedBone) return null;
  return state.bones[state.selectedBone] || null;
}

export function setBoneMode(state, mode) {
  const bone = getSelectedBone(state);
  if (!bone || !Object.values(BONE_MODES).includes(mode)) return;

  if (
    mode === BONE_MODES.CURVE &&
    !BODY25_BONES[state.selectedBone]?.curve
  ) {
    return;
  }

  bone.mode = mode;
}

export function setLineWeight(state, weight) {
  const bone = getSelectedBone(state);
  if (!bone) return;
  bone.weight = clamp(weight, 1, 24);
}

export function setZDepth(state, z) {
  const bone = getSelectedBone(state);
  if (!bone || !Object.values(Z_DEPTH).includes(z)) return;
  bone.z = z;
}

export function addCurveHandle(state, x, y) {
  const bone = getSelectedBone(state);
  if (!bone || !BODY25_BONES[state.selectedBone]?.curve) return;
  if (bone.mode !== BONE_MODES.CURVE) return;

  bone.handles = [{ x, y }];
}

export function clearCurveHandles(state) {
  const bone = getSelectedBone(state);
  if (!bone) return;
  bone.handles = [];
}

export function restoreHiddenBone(state, boneId = state.selectedBone) {
  if (!boneId || !state.bones[boneId]) return;

  const bone = state.bones[boneId];

  if (bone.mode === BONE_MODES.HIDDEN) {
    bone.mode =
      bone.handles?.length && BODY25_BONES[boneId]?.curve
        ? BONE_MODES.CURVE
        : BONE_MODES.STRAIGHT;
  }

  state.selectedBone = boneId;
}

export function moveHandle(state, x, y) {
  const bone = getSelectedBone(state);
  if (!bone || !bone.handles.length) return;

  bone.handles[0].x = x;
  bone.handles[0].y = y;
}

export function setBackgroundImage(state, imageData = {}) {
  state.backgroundImage = {
    enabled: Boolean(imageData.dataUrl),
    name: imageData.name || "",
    width: Number(imageData.width) || 0,
    height: Number(imageData.height) || 0,
    dataUrl: imageData.dataUrl || ""
  };
}

export function clearBackgroundImage(state) {
  state.backgroundImage = {
    enabled: false,
    name: "",
    width: 0,
    height: 0,
    dataUrl: ""
  };
}

// ====== UTILS ======

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v)));
}
