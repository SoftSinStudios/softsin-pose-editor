import { 
  JOINTS, BODY25_PAIRS, HAND_NAMES, HAND_PAIRS, OP_COLORS, N, TEMPLATE_MAP 
} from './core/constants.js';

import { stageWrap, stageInner, img, canvas, ctx, overlay, jointList, lhandList, rhandList, setStatus, showFloat, hideFloat } from './core/dom.js';
import { limbForPair, colorForPair, colorForJoint, limbForJoint } from './core/utils.js';
import { draw, renderOverlay, moveOverlayDot } from './core/draw.js';
import { exportJson, exportPosePng } from './core/exporters.js';
import { buildTemplateMenus, loadTemplate, closeAllDropdowns } from './core/templates.js';

import {
  showSkeleton, setShowSkeleton,
  selectedKind, selectedJointIdx, selectedHandIdx, setSelected,
  kps, lhand, rhand,
  dragging, setDragging,
  imgScale, imgOffset, setImgMetrics,
  usePoseColors, setUsePoseColors,
  boneStrokeWidth, setBoneStrokeWidth,
  jointRadius, setJointRadius,
  colorJointsByLimb, setColorJointsByLimb,
  showCursorLabel, setShowCursorLabel,
  zoom, setZoom, firstLoad, setFirstLoad,
  depthMap, setDepthMapKey, dimBackLayers, setDimBackLayers,
  resetPose, alphaForDepth, depthForLimb
} from './core/state.js';

// ========= Status glyphs & lists =========
function statusGlyph(kind, i){
  const p = (kind==='body') ? kps[i] : (kind==='lhand' ? lhand[i] : rhand[i]);
  if (!p) return '◌';
  if (p.missing) return '✖';
  if (p.x==null || p.y==null) return '◌';
  return '●';
}

export function buildJointList(){
  if (!jointList) return;
  jointList.innerHTML='';
  for (let i=0;i<N;i++){
    const item=document.createElement('div');
    item.className='jointItem';
    item.dataset.kind='body'; item.dataset.idx=i;

    const bar=document.createElement('div'); bar.className='colorBar';
    bar.style.background=usePoseColors?colorForJoint(i):'#9aa';

    const name=document.createElement('div'); name.className='jointName';
    name.textContent = `${JOINTS[i]}`;

    const st=document.createElement('div'); st.className='status';
    st.textContent=statusGlyph('body', i);

    item.appendChild(bar); item.appendChild(name); item.appendChild(st);
    item.addEventListener('click',()=>{ selectJoint(i); });
    jointList.appendChild(item);
  }
}

function buildHandList(listEl, side){
  listEl.innerHTML='';
  for (let i=0;i<21;i++){
    const item=document.createElement('div');
    item.className='jointItem';
    item.dataset.kind= side==='L' ? 'lhand' : 'rhand';
    item.dataset.idx=i;

    const bar=document.createElement('div'); bar.className='colorBar';
    bar.style.background=usePoseColors ? (side==='L'?OP_COLORS.larm:OP_COLORS.rarm) : '#9aa';

    const name=document.createElement('div'); name.className='jointName';
    name.textContent = `${side} ${HAND_NAMES[i]}`;

    const st=document.createElement('div'); st.className='status';
    st.textContent=statusGlyph(side==='L'?'lhand':'rhand', i);

    item.appendChild(bar); item.appendChild(name); item.appendChild(st);
    item.addEventListener('click',()=>{ selectHand(side==='L'?'lhand':'rhand', i); });
    listEl.appendChild(item);
  }
}

export function buildHandLists(){
  if (lhandList) buildHandList(lhandList,'L');
  if (rhandList) buildHandList(rhandList,'R');
}

export function refreshStatuses(){
  const mark = (el, active)=>{ if (!el) return; el.classList.toggle('active', !!active); };
  if (jointList){
    [...jointList.children].forEach((el,idx)=>{
      el.querySelector('.status').textContent=statusGlyph('body', idx);
      el.querySelector('.colorBar').style.background=usePoseColors?colorForJoint(idx):'#9aa';
      mark(el, selectedKind==='body' && selectedJointIdx===idx);
    });
  }
  if (lhandList){
    [...lhandList.children].forEach((el,idx)=>{
      el.querySelector('.status').textContent=statusGlyph('lhand', idx);
      mark(el, selectedKind==='lhand' && selectedHandIdx===idx);
    });
  }
  if (rhandList){
    [...rhandList.children].forEach((el,idx)=>{
      el.querySelector('.status').textContent=statusGlyph('rhand', idx);
      mark(el, selectedKind==='rhand' && selectedHandIdx===idx);
    });
  }
}

function selectJoint(i){ setSelected('body', i); refreshStatuses(); }
function selectHand(kind,i){ setSelected(kind, i); refreshStatuses(); }

// ========= Zoom / Centering / Pan =========
const Z_MIN = 0.2, Z_MAX = 6, Z_STEP = 1.1;

function setCanvasSize(){
  const nw = img.naturalWidth || 1;
  const nh = img.naturalHeight || 1;

  canvas.width = nw;
  canvas.height = nh;

  const dispW = nw * zoom;
  const dispH = nh * zoom;

  stageInner.style.width  = dispW + 'px';
  stageInner.style.height = dispH + 'px';

  img.style.width = dispW + 'px';  img.style.height = dispH + 'px';
  canvas.style.width = dispW + 'px'; canvas.style.height = dispH + 'px';
  overlay.style.width = dispW + 'px'; overlay.style.height = dispH + 'px';

  updateImgMetrics();

  if (firstLoad){
    centerImageInStage();
    setFirstLoad(false);
  }
}

function updateImgMetrics(){
  const r = stageInner.getBoundingClientRect();
  setImgMetrics(zoom, { x: r.left + window.scrollX, y: r.top + window.scrollY });
}
function pageToImg(p){ updateImgMetrics(); return { x:(p.x-imgOffset.x)/imgScale, y:(p.y-imgOffset.y)/imgScale }; }
function centerImageInStage(){
  const dispW = (img.naturalWidth||1)*zoom;
  const dispH = (img.naturalHeight||1)*zoom;
  const viewW = stageWrap.clientWidth;
  const viewH = stageWrap.clientHeight;
  stageWrap.scrollLeft = Math.max(0,(dispW - viewW)/2);
  stageWrap.scrollTop  = Math.max(0,(dispH - viewH)/2);
}
function applyZoom(newZoom, pivotCssX=null, pivotCssY=null){
  const oldZoom = zoom;
  const clamped = Math.max(Z_MIN, Math.min(Z_MAX, newZoom));
  if (clamped === oldZoom) return;
  setZoom(clamped);

  let pivotImg = null;
  if (pivotCssX!=null && pivotCssY!=null){
    updateImgMetrics();
    pivotImg = { x:(pivotCssX - imgOffset.x)/imgScale, y:(pivotCssY - imgOffset.y)/imgScale };
  }
  setCanvasSize();
  draw();
  renderOverlay();

  if (pivotImg){
    updateImgMetrics();
    const cssX = pivotImg.x*imgScale + imgOffset.x;
    const cssY = pivotImg.y*imgScale + imgOffset.y;
    stageWrap.scrollLeft += (cssX - pivotCssX);
    stageWrap.scrollTop  += (cssY - pivotCssY);
  } else {
    centerImageInStage();
  }
}

// mouse wheel zoom
stageWrap.addEventListener('wheel',(e)=>{
  if (!img.src) return;
  e.preventDefault();
  const factor = (e.deltaY>0) ? (1/1.1) : 1.1;
  applyZoom(zoom * factor, e.pageX, e.pageY);
},{passive:false});

// keyboard zoom
document.addEventListener('keydown',(e)=>{
  if (!img.src) return;
  if (e.key==='+' || e.key==='='){ e.preventDefault(); applyZoom(zoom*Z_STEP); }
  else if (e.key==='-'){ e.preventDefault(); applyZoom(zoom/Z_STEP); }
});

// middle-mouse panning
let panActive = false, panStart = null;
stageWrap.addEventListener('pointerdown', (e)=>{
  if (e.button===1){
    e.preventDefault();
    panActive = true;
    panStart = { x:e.clientX, y:e.clientY, left:stageWrap.scrollLeft, top:stageWrap.scrollTop };
    stageWrap.setPointerCapture(e.pointerId);
  }
});
stageWrap.addEventListener('pointermove',(e)=>{
  if (!panActive) return;
  const dx = e.clientX - panStart.x;
  const dy = e.clientY - panStart.y;
  stageWrap.scrollLeft = panStart.left - dx;
  stageWrap.scrollTop  = panStart.top  - dy;
});
stageWrap.addEventListener('pointerup',(e)=>{
  if (e.button===1 && panActive){
    panActive=false; panStart=null;
  }
});

// ========= Interaction (placing & dragging) =========
stageWrap.addEventListener('pointerdown',(e)=>{
  if (!img.src) return;
  if (e.button!==0) return;             // only left
  if (selectedKind==='none') return;    // nothing armed

  const pt=pageToImg({x:e.pageX,y:e.pageY});
  if (selectedKind==='body'){
    const i=selectedJointIdx;
    kps[i].x=pt.x; kps[i].y=pt.y; kps[i].missing=false;
    setDragging({kind:'body', idx:i});
    if (showCursorLabel) showFloat(`${JOINTS[i]}`, e.pageX, e.pageY);
  } else {
    const i=selectedHandIdx, arr=(selectedKind==='lhand')?lhand:rhand;
    arr[i].x=pt.x; arr[i].y=pt.y; arr[i].missing=false;
    setDragging({kind:selectedKind, idx:i});
    if (showCursorLabel) showFloat(`${selectedKind==='lhand'?'L':'R'} ${HAND_NAMES[i]}`, e.pageX, e.pageY);
  }
  draw(); renderOverlay(); refreshStatuses();

  const moveH = (ev)=>{
    if (!dragging) return;
    const pt=pageToImg({x:ev.pageX,y:ev.pageY});
    const arr = (dragging.kind==='body') ? kps : (dragging.kind==='lhand' ? lhand : rhand);
    const p = arr[dragging.idx];
    p.x=Math.max(0,Math.min(canvas.width,pt.x));
    p.y=Math.max(0,Math.min(canvas.height,pt.y));
    moveOverlayDot(dragging.kind, dragging.idx, p);
    if (!moveH._raf){ moveH._raf = requestAnimationFrame(()=>{ moveH._raf=null; draw(); }); }
  };
  const upH = ()=>{
    setDragging(null); hideFloat();
    // Auto-deselect
    setSelected('none', 0);
    refreshStatuses();
    window.removeEventListener('pointermove', moveH);
    window.removeEventListener('pointerup', upH, { once:true });
  };
  window.addEventListener('pointermove', moveH);
  window.addEventListener('pointerup', upH, { once:true });
});

// Drag an existing dot
overlay.addEventListener('pointerdown', (e)=>{
  const target = e.target.closest('.kp');
  if (!target || e.button!==0) return;
  e.preventDefault();
  const kind = target.dataset.kind;
  const idx  = +target.dataset.idx;
  setDragging({kind, idx});
  setSelected('none', 0);
  refreshStatuses();
  target.setPointerCapture(e.pointerId);

  const move = (ev)=>{
    const pt=pageToImg({x:ev.pageX,y:ev.pageY});
    const p = (kind==='body') ? kps[idx] : (kind==='lhand' ? lhand[idx] : rhand[idx]);
    p.x=Math.max(0,Math.min(canvas.width,pt.x));
    p.y=Math.max(0,Math.min(canvas.height,pt.y));
    moveOverlayDot(kind, idx, p);
    draw();
  };
  const up = ()=>{
    setDragging(null); hideFloat();
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up, {once:true});
});

// ========= Depth controls =========
;['rarm','larm','rleg','lleg','torso','head','lhand','rhand'].forEach(id=>{
  const el=document.getElementById('depth-'+id);
  if (el) el.addEventListener('change', e=>{ setDepthMapKey(id, +e.target.value); draw(); });
});
document.getElementById('dimBack')?.addEventListener('change', e=>{ setDimBackLayers(e.target.checked); draw(); });

// ========= Top bar / side controls =========
document.getElementById('poseColors')?.addEventListener('change', e=>{ setUsePoseColors(e.target.checked); draw(); buildJointList(); buildHandLists(); refreshStatuses(); });
document.getElementById('boneWidth')?.addEventListener('change', e=>{ setBoneStrokeWidth(Math.max(1,+e.target.value||6)); draw(); });
document.getElementById('colorJoints')?.addEventListener('change', e=>{ setColorJointsByLimb(e.target.checked); draw(); });
document.getElementById('showCursorLabel')?.addEventListener('change', e=>{ setShowCursorLabel(e.target.checked); });

const jointSizeEl=document.getElementById('jointSize');
if (jointSizeEl) jointSizeEl.addEventListener('change', e=>{ setJointRadius(Math.max(1,+e.target.value||3)); draw(); });

document.getElementById('toggleSkeleton')?.addEventListener('click', ()=>{ setShowSkeleton(!showSkeleton); draw(); });
document.getElementById('reset')?.addEventListener('click', ()=>{
  resetPose();
  draw(); renderOverlay(); refreshStatuses();
});

document.getElementById('clearstage')?.addEventListener('click', ()=>{
  const fileInput = document.getElementById('file');
  
  // Clear the file name so it resets to "No file chosen"
  if (fileInput) fileInput.value = '';

  // Optional: clear the preview image before reload (nice UX touch)
  if (typeof img !== 'undefined') {
    try { URL.revokeObjectURL(img.src); } catch {}
    img.removeAttribute('src');
  }

  // Now reload the canvas
  location.reload();
});

document.getElementById('exportJson')?.addEventListener('click', exportJson);
document.getElementById('exportPng')?.addEventListener('click', exportPosePng);

// ========= Templates & image load =========
buildTemplateMenus();

document.addEventListener('pose:imageLoaded', ()=>{
  setCanvasSize(); draw(); renderOverlay(); buildJointList(); buildHandLists(); refreshStatuses();
});

document.getElementById('file')?.addEventListener('change',(e)=>{
  const f=e.target.files?.[0]; if (!f) return;
  const url=URL.createObjectURL(f);
  img.onload=()=>{
    setFirstLoad(true);
    setCanvasSize(); draw(); renderOverlay(); buildJointList(); buildHandLists(); refreshStatuses();
  };
  img.src=url; img.style.maxWidth='none';
});

document.getElementById('clearSelected')?.addEventListener('click', () => {
  if (selectedJoint !== null && joints[selectedJoint]) {
    joints[selectedJoint] = null; // remove position data
    selectedJoint = null;         // clear selection
    draw();                       // re-render canvas
    renderOverlay();              // update visuals
    refreshStatuses();            // update UI indicators
  }
});


// ========= Init =========
buildJointList(); buildHandLists(); refreshStatuses();
setStatus('Load an image or template → Select a joint → Click to place and drag to position. MWheel: Zoom | Middle: Pan | Depth (z-order) sets depth position for bones | Tip: Adjust Bone/Joint thickness for more accuracy');

window.addEventListener('resize', ()=>{ if (img.src){ setCanvasSize(); renderOverlay(); draw(); }});
