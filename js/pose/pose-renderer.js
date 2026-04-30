// SoftSin Studios — Pose Editor Renderer
// Draws BODY_25 pose state to canvas.
// No DOM wiring. No file import/export. No button logic.

import {
  BODY25_POINTS,
  BODY25_BONES,
  BONE_MODES,
  Z_DEPTH
} from "./pose-state.js";

const JOINT_RADIUS = 7;
const HANDLE_RADIUS = 8;
const HANDLE_STROKE = "#ffffff";
const HANDLE_FILL = "#67e8ff";
const SELECTED_OUTLINE = "#ffffff";
const BACKGROUND_IMAGE_ALPHA = 0.62;

const backgroundImageCache = new Map();

export function resizeCanvasToDisplay(canvas, state) {
  canvas.width = state.canvas.width;
  canvas.height = state.canvas.height;
}

export function preloadBackgroundImage(state, onReady = null) {
  const bg = state?.backgroundImage;

  if (!bg?.enabled || !bg.dataUrl) {
    return null;
  }

  const cached = backgroundImageCache.get(bg.dataUrl);

  if (cached) {
    if (cached.loaded && typeof onReady === "function") {
      onReady(cached.image);
    }

    return cached.image;
  }

  const image = new Image();
  const cacheEntry = {
    image,
    loaded: false,
    failed: false
  };

  backgroundImageCache.set(bg.dataUrl, cacheEntry);

  image.onload = () => {
    cacheEntry.loaded = true;
    cacheEntry.failed = false;

    if (typeof onReady === "function") {
      onReady(image);
    }
  };

  image.onerror = () => {
    cacheEntry.loaded = false;
    cacheEntry.failed = true;
  };

  image.src = bg.dataUrl;
  return image;
}

export function clearBackgroundImageCache() {
  backgroundImageCache.clear();
}

export function getExportGuideRect(state) {
  const canvasWidth = state.canvas.width;
  const canvasHeight = state.canvas.height;
  const exportWidth = Math.max(1, Number(state.exportSize?.width) || canvasWidth);
  const exportHeight = Math.max(1, Number(state.exportSize?.height) || canvasHeight);
  const exportRatio = exportWidth / exportHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  let width = canvasWidth;
  let height = canvasHeight;

  if (exportRatio > canvasRatio) {
    height = canvasWidth / exportRatio;
  } else {
    width = canvasHeight * exportRatio;
  }

  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width,
    height
  };
}

function drawExportGuide(ctx, state) {
  const guide = getExportGuideRect(state);

  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(94, 255, 154, .72)";
  ctx.strokeRect(guide.x, guide.y, guide.width, guide.height);

  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.strokeRect(guide.x + 8, guide.y + 8, Math.max(0, guide.width - 16), Math.max(0, guide.height - 16));

  ctx.fillStyle = "rgba(94,255,154,.10)";
  ctx.fillRect(guide.x, guide.y, guide.width, guide.height);

  ctx.fillStyle = "rgba(94,255,154,.92)";
  ctx.font = "900 18px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${state.exportSize?.width || state.canvas.width} × ${state.exportSize?.height || state.canvas.height}`, guide.x + 16, guide.y + 14);

  ctx.restore();
}

export function renderPose(canvas, state, options = {}) {
  const ctx = canvas.getContext("2d");

  const config = {
    showBackgroundImage: true,
    showJoints: true,
    showHandles: true,
    showSelected: true,
    showExportGuide: true,
    clear: true,
    viewport: null,
    ...options
  };

  if (config.clear) {
    clearCanvas(ctx, canvas);
  }

  ctx.save();
  applyViewportTransform(ctx, config.viewport);

  if (config.showBackgroundImage) {
    drawBackgroundImage(ctx, state);
  }

  drawBonesByDepth(ctx, state, Z_DEPTH.BACKGROUND, config);
  drawBonesByDepth(ctx, state, Z_DEPTH.FOREGROUND, config);

  if (config.showJoints) {
    drawJoints(ctx, state);
  }

  if (config.showHandles) {
    drawCurveHandles(ctx, state);
  }

  if (config.showExportGuide) {
    drawExportGuide(ctx, state);
  }

  ctx.restore();
}

export function renderExport(canvas, state) {
  const ctx = canvas.getContext("2d");
  const exportWidth = Math.max(1, Math.round(Number(state.exportSize?.width) || state.canvas.width));
  const exportHeight = Math.max(1, Math.round(Number(state.exportSize?.height) || state.canvas.height));
  const guide = getExportGuideRect(state);
  const scaleX = exportWidth / guide.width;
  const scaleY = exportHeight / guide.height;

  canvas.width = exportWidth;
  canvas.height = exportHeight;

  clearCanvas(ctx, canvas);
  fillExportBackground(ctx, canvas);

  // Intentionally excludes imported background images and editor guide overlays.
  // Export PNG remains a clean BODY_25 pose/control image at the selected size.

  ctx.save();
  ctx.setTransform(scaleX, 0, 0, scaleY, -guide.x * scaleX, -guide.y * scaleY);

  drawBonesByDepth(ctx, state, Z_DEPTH.BACKGROUND, {
    showSelected: false,
    showHandles: false,
    showExportGuide: false,
    viewport: null
  });

  drawBonesByDepth(ctx, state, Z_DEPTH.FOREGROUND, {
    showSelected: false,
    showHandles: false,
    showExportGuide: false,
    viewport: null
  });

  drawJoints(ctx, state);

  ctx.restore();
}


function fillExportBackground(ctx, canvas) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function applyViewportTransform(ctx, viewport) {
  if (!viewport) {
    return;
  }

  ctx.setTransform(
    viewport.scale,
    0,
    0,
    viewport.scale,
    viewport.offsetX,
    viewport.offsetY
  );
}

function clearCanvas(ctx, canvas) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawBackgroundImage(ctx, state) {
  const bg = state?.backgroundImage;

  if (!bg?.enabled || !bg.dataUrl) {
    return;
  }

  const cached = backgroundImageCache.get(bg.dataUrl);

  if (!cached?.loaded || cached.failed) {
    preloadBackgroundImage(state);
    return;
  }

  const image = cached.image;
  const fit = getContainRect(
    image.naturalWidth || bg.width || image.width,
    image.naturalHeight || bg.height || image.height,
    state.canvas.width,
    state.canvas.height
  );

  ctx.save();
  ctx.globalAlpha = BACKGROUND_IMAGE_ALPHA;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, fit.x, fit.y, fit.width, fit.height);
  ctx.restore();
}

function getContainRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const safeSourceWidth = Math.max(1, Number(sourceWidth) || 1);
  const safeSourceHeight = Math.max(1, Number(sourceHeight) || 1);
  const scale = Math.min(targetWidth / safeSourceWidth, targetHeight / safeSourceHeight);
  const width = safeSourceWidth * scale;
  const height = safeSourceHeight * scale;

  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height
  };
}

function drawBonesByDepth(ctx, state, zDepth, config) {
  for (const [boneId, boneDef] of Object.entries(BODY25_BONES)) {
    const boneState = state.bones[boneId];

    if (!boneState || boneState.z !== zDepth) {
      continue;
    }

    drawBone(ctx, state, boneId, boneDef, boneState, config);
  }
}

function drawBone(ctx, state, boneId, boneDef, boneState, config) {
  if (boneState.mode === BONE_MODES.HIDDEN) {
    return;
  }

  const from = state.keypoints[boneDef.from];
  const to = state.keypoints[boneDef.to];

  if (!from || !to) {
    return;
  }

  const color = getBoneColor(boneDef);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = boneState.weight;

  if (config.showSelected && state.selectedBone === boneId) {
    drawSelectedBoneOutline(ctx, from, to, boneState);
  }

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);

  if (boneState.mode === BONE_MODES.CURVE && boneState.handles.length > 0) {
    const handle = boneState.handles[0];
    ctx.quadraticCurveTo(handle.x, handle.y, to.x, to.y);
  } else {
    ctx.lineTo(to.x, to.y);
  }

  ctx.stroke();
  ctx.restore();
}

function drawSelectedBoneOutline(ctx, from, to, boneState) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = SELECTED_OUTLINE;
  ctx.lineWidth = boneState.weight + 5;
  ctx.globalAlpha = 0.32;

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);

  if (boneState.mode === BONE_MODES.CURVE && boneState.handles.length > 0) {
    const handle = boneState.handles[0];
    ctx.quadraticCurveTo(handle.x, handle.y, to.x, to.y);
  } else {
    ctx.lineTo(to.x, to.y);
  }

  ctx.stroke();
  ctx.restore();
}

function drawJoints(ctx, state) {
  const visiblePointIds = getVisiblePointIds(state);

  for (const [pointId, point] of Object.entries(state.keypoints)) {
    if (!point || !visiblePointIds.has(pointId)) {
      continue;
    }

    const pointDef = BODY25_POINTS[pointId];
    const color = pointDef?.hex || "#ffffff";

    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, JOINT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(5, 7, 11, 0.85)";
    ctx.stroke();
    ctx.restore();
  }
}

function getVisiblePointIds(state) {
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
function drawCurveHandles(ctx, state) {
  const selectedBoneState = state.bones[state.selectedBone];

  if (!selectedBoneState || selectedBoneState.mode !== BONE_MODES.CURVE) {
    return;
  }

  for (const handle of selectedBoneState.handles) {
    ctx.save();

    ctx.beginPath();
    ctx.arc(handle.x, handle.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = HANDLE_FILL;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = HANDLE_STROKE;
    ctx.stroke();

    ctx.restore();
  }
}

function getBoneColor(boneDef) {
  const sourcePoint = BODY25_POINTS[boneDef.from];

  if (!sourcePoint) {
    return "#ffffff";
  }

  return sourcePoint.hex;
}

export function getCanvasDisplayPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

export function getCanvasPoint(event, canvas, viewport = null) {
  const displayPoint = getCanvasDisplayPoint(event, canvas);

  if (!viewport) {
    return displayPoint;
  }

  return {
    x: (displayPoint.x - viewport.offsetX) / viewport.scale,
    y: (displayPoint.y - viewport.offsetY) / viewport.scale
  };
}
