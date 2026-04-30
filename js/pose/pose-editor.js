// SoftSin Studios — Pose Editor Main

import {
  createState,
  BODY25_BONES,
  BONE_MODES,
  selectBone,
  clearSelectedBone,
  setBoneMode,
  setLineWeight,
  setZDepth,
  setExportSize,
  addCurveHandle,
  clearCurveHandles,
  restoreHiddenBone,
  moveHandle,
  setBackgroundImage
} from "./pose-state.js?v=pngmeta-20260429-2";

import {
  resizeCanvasToDisplay,
  renderPose,
  getCanvasPoint,
  getCanvasDisplayPoint,
  preloadBackgroundImage
} from "./pose-renderer.js?v=pngmeta-20260429-2";

import {
  downloadJson,
  copyJsonToClipboard,
  readJsonFile,
  jsonToState,
  exportPosePng,
  readPoseStateFromPngFile
} from "./pose-io.js?v=pngmeta-20260429-2";

let state = createState();

/* =========================
   VIEWPORT (ZOOM / PAN)
========================= */

const view = {
  scale: 1,
  minScale: 0.35,
  maxScale: 6,
  offsetX: 0,
  offsetY: 0
};

/* =========================
   DOM
========================= */

const dom = {
  canvas: document.getElementById("poseCanvas"),
  exportCanvas: document.getElementById("poseExportCanvas"),
  fileInput: document.getElementById("poseFileInput"),
  imageInput: document.getElementById("poseImageInput"),

  boneChips: Array.from(document.querySelectorAll(".bone-chip")),

  selectedBoneName: document.getElementById("selectedBoneName"),
  selectedBoneRgb: document.getElementById("selectedBoneRgb"),
  boneModeSelect: document.getElementById("boneModeSelect"),
  lineWeightInput: document.getElementById("lineWeightInput"),
  zDepthSelect: document.getElementById("zDepthSelect"),

  addCurveHandleBtn: document.getElementById("addCurveHandleBtn"),
  clearCurveHandlesBtn: document.getElementById("clearCurveHandlesBtn"),
  hideBoneBtn: document.getElementById("hideBoneBtn"),
  unhideBoneBtn: document.getElementById("unhideBoneBtn"),
  deletedBonesPanel: document.getElementById("deletedBonesPanel"),
  deletedBonesList: document.getElementById("deletedBonesList"),

  loadImageBtn: document.getElementById("loadImageBtn"),
  loadPoseBtn: document.getElementById("loadPoseBtn"),
  saveJsonBtn: document.getElementById("saveJsonBtn"),
  exportPngBtn: document.getElementById("exportPngBtn"),
  exportWidthInput: document.getElementById("exportWidthInput"),
  exportHeightInput: document.getElementById("exportHeightInput"),
  resetPoseBtn: document.getElementById("resetPoseBtn"),

  copyPoseJsonBtn: document.getElementById("copyPoseJsonBtn"),
  downloadPoseJsonBtn: document.getElementById("downloadPoseJsonBtn")
};

const drag = {
  active: false,
  type: null,
  pointId: null,
  pointerId: null,
  lastDisplayX: 0,
  lastDisplayY: 0
};

init();

/* =========================
   INIT
========================= */

function init() {
  bindBoneChips();
  bindPropertyControls();
  bindButtons();
  bindCanvasInput();

  resizeCanvasToDisplay(dom.canvas, state);
  resizeCanvasToDisplay(dom.exportCanvas, state);

  syncUI();
  redraw();
}

/* =========================
   INPUT
========================= */

function bindCanvasInput() {
  if (!dom.canvas) return;

  dom.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  dom.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  dom.canvas.addEventListener("pointerdown", handlePointerDown);
  dom.canvas.addEventListener("pointermove", handlePointerMove);
  dom.canvas.addEventListener("pointerup", endDrag);
  dom.canvas.addEventListener("pointercancel", endDrag);
  dom.canvas.addEventListener("lostpointercapture", endDrag);
}

function handleCanvasWheel(event) {
  event.preventDefault();

  const anchor = getCanvasCenterPoint(dom.canvas);
  const worldAnchorBeforeZoom = displayToWorld(anchor, view);

  const zoomStep = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  const nextScale = clamp(view.scale * zoomStep, view.minScale, view.maxScale);

  if (nextScale === view.scale) {
    return;
  }

  view.scale = nextScale;
  view.offsetX = anchor.x - worldAnchorBeforeZoom.x * view.scale;
  view.offsetY = anchor.y - worldAnchorBeforeZoom.y * view.scale;

  redraw();
}

function handlePointerDown(event) {
  // MMW button drag = free move / pan.
  // Wheel scroll still controls zoom.
  if (event.button === 1) {
    event.preventDefault();
    beginPan(event);
    return;
  }

  if (event.button !== 0) {
    return;
  }
  const p = getCanvasPoint(event, dom.canvas, view);
  const handle = hitHandle(p);

  if (handle) {
    beginDrag(event, "handle");
    return;
  }

  const joint = hitJoint(p);

  if (joint) {
    beginDrag(event, "joint");
    drag.pointId = joint;
    return;
  }

  const boneId = hitBone(p);

  if (boneId) {
    selectBone(state, boneId);
    syncUI();
    redraw();
    return;
  }

  clearSelectedBone(state);
  syncUI();
  redraw();
}

function handlePointerMove(event) {
  if (!drag.active || drag.pointerId !== event.pointerId) {
    return;
  }

  if (drag.type === "pan") {
    const displayPoint = getCanvasDisplayPoint(event, dom.canvas);

    view.offsetX += displayPoint.x - drag.lastDisplayX;
    view.offsetY += displayPoint.y - drag.lastDisplayY;

    drag.lastDisplayX = displayPoint.x;
    drag.lastDisplayY = displayPoint.y;

    redraw();
    return;
  }

  const p = getCanvasPoint(event, dom.canvas, view);

  if (drag.type === "joint" && drag.pointId) {
    state.keypoints[drag.pointId].x = p.x;
    state.keypoints[drag.pointId].y = p.y;
  }

  if (drag.type === "handle") {
    moveHandle(state, p.x, p.y);
  }

  redraw();
}

function beginPan(event) {
  const displayPoint = getCanvasDisplayPoint(event, dom.canvas);

  beginDrag(event, "pan");
  drag.lastDisplayX = displayPoint.x;
  drag.lastDisplayY = displayPoint.y;
}

function beginDrag(event, type) {
  drag.active = true;
  drag.type = type;
  drag.pointerId = event.pointerId;

  dom.canvas.setPointerCapture(event.pointerId);

  if (type === "pan") {
    dom.canvas.style.cursor = "grabbing";
  }
}

function endDrag(event) {
  if (event?.pointerId && drag.pointerId !== event.pointerId) {
    return;
  }

  if (drag.pointerId !== null && dom.canvas.hasPointerCapture?.(drag.pointerId)) {
    dom.canvas.releasePointerCapture(drag.pointerId);
  }

  drag.active = false;
  drag.type = null;
  drag.pointId = null;
  drag.pointerId = null;
  drag.lastDisplayX = 0;
  drag.lastDisplayY = 0;

  dom.canvas.style.cursor = "";
}

/* =========================
   UI BINDINGS
========================= */

function bindBoneChips() {
  dom.boneChips.forEach(chip => {
    chip.classList.remove("active");

    chip.addEventListener("click", () => {
      const boneId = chip.dataset.bone;

      if (state.selectedBone === boneId) {
        clearSelectedBone(state);
      } else {
        selectBone(state, boneId);
      }

      syncUI();
      redraw();
    });
  });
}

function bindPropertyControls() {
  safeAddEvent(dom.boneModeSelect, "change", () => {
    setBoneMode(state, dom.boneModeSelect.value);
    syncUI();
    redraw();
  });

  safeAddEvent(dom.lineWeightInput, "input", () => {
    setLineWeight(state, dom.lineWeightInput.value);
    syncUI();
    redraw();
  });

  safeAddEvent(dom.zDepthSelect, "change", () => {
    setZDepth(state, dom.zDepthSelect.value);
    syncUI();
    redraw();
  });

  safeAddEvent(dom.exportWidthInput, "input", handleExportSizeInput);
  safeAddEvent(dom.exportHeightInput, "input", handleExportSizeInput);
}

function handleExportSizeInput() {
  setExportSize(
    state,
    dom.exportWidthInput?.value,
    dom.exportHeightInput?.value
  );

  syncUI();
  redraw();
}

function bindButtons() {
  safeAddEvent(dom.addCurveHandleBtn, "click", () => {
    if (!state.selectedBone || !selectedBoneAllowsCurve()) return;

    const selectedBoneState = getSelectedBoneState();
    if (selectedBoneState?.handles.length) return;

    setBoneMode(state, BONE_MODES.CURVE);

    const mid = getSelectedMid();
    if (!mid) return;

    addCurveHandle(state, mid.x, mid.y);
    syncUI();
    redraw();
  });

  safeAddEvent(dom.clearCurveHandlesBtn, "click", () => {
    if (!state.selectedBone || !selectedBoneAllowsCurve()) return;

    clearCurveHandles(state);
    syncUI();
    redraw();
  });

  safeAddEvent(dom.hideBoneBtn, "click", () => {
    if (!state.selectedBone) return;

    setBoneMode(state, BONE_MODES.HIDDEN);
    clearSelectedBone(state);
    syncUI();
    redraw();
  });

  safeAddEvent(dom.unhideBoneBtn, "click", () => {
    if (!state.selectedBone) return;

    restoreHiddenBone(state, state.selectedBone);
    syncUI();
    redraw();
  });

  safeAddEvent(dom.saveJsonBtn, "click", () => downloadJson(state));
  safeAddEvent(dom.downloadPoseJsonBtn, "click", () => downloadJson(state));
  safeAddEvent(dom.copyPoseJsonBtn, "click", () => copyJsonToClipboard(state));

  safeAddEvent(dom.exportPngBtn, "click", () => {
    exportPosePng(dom.exportCanvas, state);
  });

  safeAddEvent(dom.resetPoseBtn, "click", () => {
    state = createState();
    resetViewport();
    syncUI();
    redraw();
  });

  safeAddEvent(dom.loadPoseBtn, "click", () => dom.fileInput?.click());
  safeAddEvent(dom.loadImageBtn, "click", () => dom.imageInput?.click());

  safeAddEvent(dom.fileInput, "change", handleJsonFileChange);
  safeAddEvent(dom.imageInput, "change", handleImageFileChange);
}

async function handleJsonFileChange() {
  if (!dom.fileInput.files.length) {
    return;
  }

  try {
    const text = await readJsonFile(dom.fileInput.files[0]);
    state = jsonToState(text);

    resizeCanvasToDisplay(dom.canvas, state);
    resizeCanvasToDisplay(dom.exportCanvas, state);
    resetViewport();
    syncUI();
    redraw();
  } catch (error) {
    console.error("Failed to load pose JSON:", error);
  } finally {
    dom.fileInput.value = "";
  }
}

async function handleImageFileChange() {
  if (!dom.imageInput.files.length) {
    return;
  }

  const file = dom.imageInput.files[0];

  try {
    const importedPoseState = await readPoseStateFromPngFile(file);

    if (importedPoseState) {
      console.info("Loaded editable SoftSin pose data from PNG metadata.");
      state = importedPoseState;

      resizeCanvasToDisplay(dom.canvas, state);
      resizeCanvasToDisplay(dom.exportCanvas, state);
      resetViewport();
      syncUI();
      redraw();
      return;
    }

    console.info("No SoftSin pose metadata found. Loading image as reference background.");
    const imageData = await readImageFile(file);
    setBackgroundImage(state, imageData);

    preloadBackgroundImage(state, () => {
      redraw();
    });

    redraw();
  } catch (error) {
    console.error("Failed to load image:", error);
  } finally {
    dom.imageInput.value = "";
  }
}

function selectedBoneAllowsCurve() {
  return Boolean(state.selectedBone && BODY25_BONES[state.selectedBone]?.curve);
}

function renderDeletedBones() {
  if (!dom.deletedBonesPanel || !dom.deletedBonesList) {
    return;
  }

  const deletedBoneIds = Object.entries(state.bones)
    .filter(([, bone]) => bone?.mode === BONE_MODES.HIDDEN)
    .map(([boneId]) => boneId);

  dom.deletedBonesPanel.hidden = deletedBoneIds.length === 0;
  dom.deletedBonesList.innerHTML = "";

  for (const boneId of deletedBoneIds) {
    const sourceChip = dom.boneChips.find(chip => chip.dataset.bone === boneId);
    const button = document.createElement("button");

    button.type = "button";
    button.className = "bone-chip deleted-bone-chip";
    button.dataset.bone = boneId;
    button.textContent = getBoneChipLabel(boneId, sourceChip);
    button.style.setProperty("--bone-color", getBoneChipColor(sourceChip));
    button.setAttribute("aria-pressed", state.selectedBone === boneId ? "true" : "false");
    button.title = "Hidden bone: select this chip, then use Unhide Bone to restore it.";

    button.addEventListener("click", () => {
      if (state.selectedBone === boneId) {
        clearSelectedBone(state);
      } else {
        selectBone(state, boneId);
      }

      syncUI();
      redraw();
    });

    dom.deletedBonesList.appendChild(button);
  }
}

function getBoneChipLabel(boneId, sourceChip) {
  return sourceChip?.textContent?.trim() || boneId.toUpperCase();
}

function getBoneChipColor(sourceChip) {
  return sourceChip?.dataset?.hex || sourceChip?.style?.getPropertyValue("--bone-color") || "#67e8ff";
}

/* =========================
   FILE HELPERS
========================= */

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No image selected."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const image = new Image();

      image.onload = () => {
        resolve({
          name: file.name || "reference-image",
          width: image.naturalWidth || image.width || 0,
          height: image.naturalHeight || image.height || 0,
          dataUrl
        });
      };

      image.onerror = () => {
        reject(new Error("The selected image could not be decoded."));
      };

      image.src = dataUrl;
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Failed to read image file."));
    };

    reader.readAsDataURL(file);
  });
}

/* =========================
   HELPERS
========================= */

function redraw() {
  renderPose(dom.canvas, state, {
    viewport: view,
    showBackgroundImage: true
  });
}

function resetViewport() {
  view.scale = 1;
  view.offsetX = 0;
  view.offsetY = 0;
}

function getCanvasCenterPoint(canvas) {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2
  };
}

function displayToWorld(point, viewport) {
  return {
    x: (point.x - viewport.offsetX) / viewport.scale,
    y: (point.y - viewport.offsetY) / viewport.scale
  };
}

function hitJoint(p) {
  const hitRadius = 14 / view.scale;
  const visiblePointIds = getVisiblePointIds();

  for (const [id, j] of Object.entries(state.keypoints)) {
    if (!visiblePointIds.has(id)) {
      continue;
    }

    if (distance(p, j) <= hitRadius) {
      return id;
    }
  }

  return null;
}
function hitHandle(p) {
  const selectedBoneState = getSelectedBoneState();

  if (!selectedBoneState || selectedBoneState.mode !== BONE_MODES.CURVE) {
    return null;
  }

  const hitRadius = 14 / view.scale;

  return selectedBoneState.handles.find(handle => distance(p, handle) <= hitRadius) || null;
}

function hitBone(p) {
  const hitRadius = 12 / view.scale;
  const hits = [];

  for (const [boneId, boneDef] of Object.entries(BODY25_BONES)) {
    const boneState = state.bones[boneId];

    if (!boneState || boneState.mode === BONE_MODES.HIDDEN) {
      continue;
    }

    const from = state.keypoints[boneDef.from];
    const to = state.keypoints[boneDef.to];

    if (!from || !to) {
      continue;
    }

    const d = distanceToBonePath(p, from, to, boneState);

    if (d <= hitRadius) {
      hits.push({ boneId, d });
    }
  }

  hits.sort((a, b) => a.d - b.d);
  return hits[0]?.boneId || null;
}

function distanceToBonePath(p, from, to, boneState) {
  if (boneState.mode === BONE_MODES.CURVE && boneState.handles.length > 0) {
    return distanceToQuadraticCurve(p, from, boneState.handles[0], to);
  }

  return distanceToSegment(p, from, to);
}

function distanceToQuadraticCurve(p, from, handle, to) {
  let best = Infinity;
  let prev = from;

  for (let i = 1; i <= 28; i += 1) {
    const t = i / 28;
    const point = quadraticPoint(from, handle, to, t);
    best = Math.min(best, distanceToSegment(p, prev, point));
    prev = point;
  }

  return best;
}

function quadraticPoint(a, b, c, t) {
  const inv = 1 - t;

  return {
    x: inv * inv * a.x + 2 * inv * t * b.x + t * t * c.x,
    y: inv * inv * a.y + 2 * inv * t * b.y + t * t * c.y
  };
}

function distanceToSegment(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq <= 0.0001) {
    return distance(p, a);
  }

  const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
  const closest = {
    x: a.x + abx * t,
    y: a.y + aby * t
  };

  return distance(p, closest);
}

function getSelectedMid() {
  const bone = BODY25_BONES[state.selectedBone];

  if (!bone) {
    return null;
  }

  const a = state.keypoints[bone.from];
  const b = state.keypoints[bone.to];

  if (!a || !b) {
    return null;
  }

  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function getSelectedBoneState() {
  if (!state.selectedBone) return null;
  return state.bones[state.selectedBone] || null;
}

function getVisiblePointIds() {
  const visible = new Set();

  for (const [boneId, boneDef] of Object.entries(BODY25_BONES)) {
    const boneState = state.bones[boneId];

    if (!boneState || boneState.mode === BONE_MODES.HIDDEN) {
      continue;
    }

    if (state.keypoints[boneDef.from]) {
      visible.add(boneDef.from);
    }

    if (state.keypoints[boneDef.to]) {
      visible.add(boneDef.to);
    }
  }

  return visible;
}

function syncUI() {
  const selectedChip = dom.boneChips.find(chip => chip.dataset.bone === state.selectedBone);
  const selectedBoneState = getSelectedBoneState();
  const hasSelection = Boolean(selectedChip && selectedBoneState);

  dom.boneChips.forEach(chip => {
    const boneState = state.bones[chip.dataset.bone];
    const isDeleted = boneState?.mode === BONE_MODES.HIDDEN;

    chip.classList.toggle("active", chip.dataset.bone === state.selectedBone && hasSelection);
    chip.classList.toggle("deleted", isDeleted);
    chip.setAttribute("aria-disabled", isDeleted ? "true" : "false");
  });

  if (dom.selectedBoneName) {
    dom.selectedBoneName.value = hasSelection
      ? selectedChip.dataset.label || state.selectedBone
      : "";
  }

  if (dom.selectedBoneRgb) {
    dom.selectedBoneRgb.value = hasSelection
      ? `${formatRgb(selectedChip.dataset.rgb)}  /  ${selectedChip.dataset.hex}`
      : "";
  }

  if (dom.boneModeSelect) {
    dom.boneModeSelect.disabled = !hasSelection;
    dom.boneModeSelect.value = selectedBoneState?.mode || BONE_MODES.STRAIGHT;
  }

  if (dom.lineWeightInput) {
    dom.lineWeightInput.disabled = !hasSelection;
    dom.lineWeightInput.value = selectedBoneState?.weight || 6;
  }

  if (dom.zDepthSelect) {
    dom.zDepthSelect.disabled = !hasSelection;
    dom.zDepthSelect.value = selectedBoneState?.z || "foreground";
  }

  if (dom.exportWidthInput) {
    dom.exportWidthInput.value = state.exportSize?.width || state.canvas.width;
  }

  if (dom.exportHeightInput) {
    dom.exportHeightInput.value = state.exportSize?.height || state.canvas.height;
  }

  const selectedIsHidden = selectedBoneState?.mode === BONE_MODES.HIDDEN;
  const selectedHasCurveHandle = Boolean(selectedBoneState?.handles.length);
  const canUseCurveControls = hasSelection && !selectedIsHidden && selectedBoneAllowsCurve();
  const canAddCurveControl = canUseCurveControls && !selectedHasCurveHandle;
  const canClearCurveControls = canUseCurveControls && selectedHasCurveHandle;

  if (dom.addCurveHandleBtn) {
    dom.addCurveHandleBtn.disabled = !canAddCurveControl;
    dom.addCurveHandleBtn.classList.toggle("can-use", canAddCurveControl);
  }

  if (dom.clearCurveHandlesBtn) {
    dom.clearCurveHandlesBtn.disabled = !canClearCurveControls;
    dom.clearCurveHandlesBtn.classList.toggle("can-use", canClearCurveControls);
  }

  const canHideSelectedBone = hasSelection && !selectedIsHidden;
  const canUnhideSelectedBone = hasSelection && selectedIsHidden;

  if (dom.hideBoneBtn) {
    dom.hideBoneBtn.disabled = !canHideSelectedBone;
    dom.hideBoneBtn.classList.toggle("can-use", canHideSelectedBone);
  }

  if (dom.unhideBoneBtn) {
    dom.unhideBoneBtn.disabled = !canUnhideSelectedBone;
    dom.unhideBoneBtn.classList.toggle("can-use", canUnhideSelectedBone);
  }
  renderDeletedBones();
}


function safeAddEvent(element, eventName, handler) {
  if (!element) return;
  element.addEventListener(eventName, handler);
}

function formatRgb(rgbString) {
  return String(rgbString || "")
    .split(",")
    .map(value => value.trim())
    .join(", ");
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
