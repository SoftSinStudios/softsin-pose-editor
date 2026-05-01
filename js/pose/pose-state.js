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

// Default pose layout (centered neutral A-pose)
export function createDefaultKeypoints() {
  return {
    // Front-facing BODY_25 layout:
    // BODY_25 names stay anatomical, so the subject's right side appears on the viewer's left.
    // This starter pose is intentionally neutral, proportional, and easy to edit.
    nose: { x: 512, y: 220 },
    neck: { x: 512, y: 305 },

    rEye: { x: 492, y: 205 },
    lEye: { x: 532, y: 205 },
    rEar: { x: 470, y: 220 },
    lEar: { x: 554, y: 220 },

    rShoulder: { x: 430, y: 330 },
    rElbow: { x: 365, y: 470 },
    rWrist: { x: 330, y: 620 },

    lShoulder: { x: 594, y: 330 },
    lElbow: { x: 659, y: 470 },
    lWrist: { x: 694, y: 620 },

    midHip: { x: 512, y: 580 },

    rHip: { x: 460, y: 585 },
    rKnee: { x: 438, y: 745 },
    rAnkle: { x: 420, y: 900 },
    rFoot: { x: 376, y: 930 },

    lHip: { x: 564, y: 585 },
    lKnee: { x: 586, y: 745 },
    lAnkle: { x: 604, y: 900 },
    lFoot: { x: 648, y: 930 }
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
