// SoftSin Studios — Pose Editor State

export const CANVAS_SIZE = {
  width: 1024,
  height: 1024
};

export const DEFAULT_LINE_WEIGHT = 6;
export const DEFAULT_JOINT_RADIUS = 7;

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
  tail:      { rgb: [255, 48, 88], hex: "#ff3058" },
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
    // Head and torso stay centered so the starter pose reads as human first,
    // then users can push it into stylized or quadruped shapes as needed.
    nose: { x: 512, y: 250 },
    neck: { x: 512, y: 335 },

    // Front-facing default dummy:
    // BODY_25 names stay anatomical, so the subject's right side appears on the viewer's left.
    rEye: { x: 487, y: 235 },
    lEye: { x: 537, y: 235 },
    rEar: { x: 460, y: 252 },
    lEar: { x: 564, y: 252 },

    // Balanced shoulders with a mild A-pose arm angle.
    rShoulder: { x: 420, y: 365 },
    rElbow: { x: 360, y: 505 },
    rWrist: { x: 330, y: 645 },

    lShoulder: { x: 604, y: 365 },
    lElbow: { x: 664, y: 505 },
    lWrist: { x: 694, y: 645 },

    // Centered pelvis with hips narrower than shoulders.
    midHip: { x: 512, y: 575 },
    tail: { x: 512, y: 700 },

    // Upright legs with a slight natural stance.
    rHip: { x: 456, y: 590 },
    rKnee: { x: 444, y: 760 },
    rAnkle: { x: 436, y: 920 },
    rFoot: { x: 400, y: 955 },

    lHip: { x: 568, y: 590 },
    lKnee: { x: 580, y: 760 },
    lAnkle: { x: 588, y: 920 },
    lFoot: { x: 624, y: 955 }
  };
}

// Core bones
export const BODY25_BONES = {
  "nose-neck": { from: "nose", to: "neck", curve: true },
  "neck-midhip": { from: "neck", to: "midHip", curve: true },
  "midhip-tail": { from: "midHip", to: "tail", curve: true, hiddenByDefault: true },
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

function getDefaultBoneMode(boneId) {
  const boneDef = BODY25_BONES[boneId];

  if (boneDef?.hiddenByDefault) {
    return BONE_MODES.HIDDEN;
  }

  return boneDef?.curve ? BONE_MODES.CURVE : BONE_MODES.STRAIGHT;
}

// Create full state
export function createState() {
  const bones = {};

  Object.keys(BODY25_BONES).forEach(id => {
    bones[id] = {
      mode: getDefaultBoneMode(id),
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
    appearance: {
      boneThickness: DEFAULT_LINE_WEIGHT,
      jointThickness: DEFAULT_JOINT_RADIUS
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

export function setPoseThickness(state, boneThickness, jointThickness) {
  state.appearance = {
    ...(state.appearance || {}),
    boneThickness: clamp(Math.round(Number(boneThickness) || DEFAULT_LINE_WEIGHT), 1, 48),
    jointThickness: clamp(Math.round(Number(jointThickness) || DEFAULT_JOINT_RADIUS), 1, 48)
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
      BODY25_BONES[boneId]?.curve
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
