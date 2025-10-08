// All mutable state (so other modules import from here)
import { N } from './constants.js';

export let showSkeleton = true;

export let selectedKind = 'none';   // 'none' | 'body' | 'lhand' | 'rhand'
export let selectedJointIdx = 0;
export let selectedHandIdx = 0;

export let kps   = Array.from({length: N},   () => ({x:null,y:null,missing:false,c:1}));
export let lhand = Array.from({length: 21},  () => ({x:null,y:null,missing:false,c:1}));
export let rhand = Array.from({length: 21},  () => ({x:null,y:null,missing:false,c:1}));

export let dragging = null;         // {kind, idx}
export let imgScale = 1;
export let imgOffset = { x:0, y:0 };

export let usePoseColors = true;
export let boneStrokeWidth = 6;
export let jointRadius = 3;
export let colorJointsByLimb = false;
export let showCursorLabel = true;

export let zoom = 1;
export let firstLoad = true;

export let depthMap = { rarm:1, larm:1, rleg:1, lleg:1, torso:1, head:1, lhand:1, rhand:1 };
export let dimBackLayers = true;

// -------- setters (so change is reflected across modules) ----------
export function setSelected(kind, idx) {
  selectedKind = kind;
  if (kind === 'body') selectedJointIdx = idx;
  else if (kind === 'lhand' || kind === 'rhand') selectedHandIdx = idx;
}
export function setDragging(val){ dragging = val; }
export function setImgMetrics(scale, offset){ imgScale = scale; imgOffset = offset; }

export function setZoom(z){ zoom = z; }
export function setFirstLoad(v){ firstLoad = v; }

export function setUsePoseColors(v){ usePoseColors = v; }
export function setBoneStrokeWidth(v){ boneStrokeWidth = v; }
export function setJointRadius(v){ jointRadius = v; }
export function setColorJointsByLimb(v){ colorJointsByLimb = v; }
export function setShowCursorLabel(v){ showCursorLabel = v; }
export function setShowSkeleton(v){ showSkeleton = v; }

export function setDepthMapKey(key, val){ depthMap[key] = val; }
export function setDimBackLayers(v){ dimBackLayers = v; }

// -------- helpers ----------
export function resetPose() {
  kps   = Array.from({length:N}, ()=>({x:null,y:null,missing:false,c:1}));
  lhand = Array.from({length:21},()=>({x:null,y:null,missing:false,c:1}));
  rhand = Array.from({length:21},()=>({x:null,y:null,missing:false,c:1}));
  selectedKind = 'none';
}

export function alphaForDepth(d) {
  // same as original
  if (!dimBackLayers) return 1;
  return (d===0 ? 0.65 : (d===1 ? 0.9 : 1));
}

export function depthForLimb(limb) {
  return depthMap[limb] ?? 1;
}

