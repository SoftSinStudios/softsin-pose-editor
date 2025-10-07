/* =========================
   BODY_25 + HANDS + ZOOM + PAN + AUTO-DESELECT + TEMPLATE MENUS
   ========================= */

/* ===== BODY_25 ===== */
const JOINTS = [
  "Nose","Neck","RShoulder","RElbow","RWrist","LShoulder","LElbow","LWrist",
  "MidHip","RHip","RKnee","RAnkle","LHip","LKnee","LAnkle",
  "REye","LEye","REar","LEar","RBigToe","RSmallToe","RHeel","LBigToe","LSmallToe","LHeel"
];
const N = JOINTS.length;

const BODY25_PAIRS = [
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

/* ===== HANDS (21 points) ===== */
const HAND_NAMES = [
  "Wrist",
  "Thumb Base","Thumb 1","Thumb 2","Thumb End",
  "Index Base","Index 1","Index 2","Index End",
  "Middle Base","Middle 1","Middle 2","Middle End",
  "Ring Base","Ring 1","Ring 2","Ring End",
  "Pinky Base","Pinky 1","Pinky 2","Pinky End"
];
const HAND_PAIRS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20]
];

/* ===== Colors ===== */
const OP_COLORS = {
  torso:"#00FFFF", head:"#00FFFF",
  rarm:"#FFA500", larm:"#00FF00",
  rleg:"#FF00FF", lleg:"#0000FF",
  joint:"#FFFFFF"
};

function limbForPair(a,b){
  const s=new Set([a,b]);
  if ((s.has(1)&&s.has(2))||(s.has(2)&&s.has(3))||(s.has(3)&&s.has(4))) return "rarm";
  if ((s.has(1)&&s.has(5))||(s.has(5)&&s.has(6))||(s.has(6)&&s.has(7))) return "larm";
  if ((s.has(8)&&s.has(9))||(s.has(9)&&s.has(10))||(s.has(10)&&s.has(11))) return "rleg";
  if ((s.has(8)&&s.has(12))||(s.has(12)&&s.has(13))||(s.has(13)&&s.has(14))) return "lleg";
  if ((s.has(0)&&s.has(15))||(s.has(15)&&s.has(17))||(s.has(0)&&s.has(16))||(s.has(16)&&s.has(18))) return "head";
  if ((s.has(1)&&s.has(0))||(s.has(1)&&s.has(8))||(s.has(1)&&s.has(9))||(s.has(1)&&s.has(12))) return "torso";
  return "torso";
}
function colorForPair(a,b){ return OP_COLORS[limbForPair(a,b)] }
function colorForJoint(i){
  for (const [a,b] of BODY25_PAIRS){ if (a===i || b===i) return colorForPair(a,b); }
  return OP_COLORS.joint;
}

/* ===== Depth (z-order) ===== */
let depthMap = { rarm:1, larm:1, rleg:1, lleg:1, torso:1, head:1, lhand:1, rhand:1 };
let dimBackLayers = true;
function limbForJoint(i){ for (const [a,b] of BODY25_PAIRS){ if (a===i || b===i) return limbForPair(a,b); } return 'torso'; }
function depthForLimb(limb){ return depthMap[limb] ?? 1; }
function alphaForDepth(d){ return dimBackLayers ? (d===0 ? 0.65 : (d===1 ? 0.9 : 1)) : 1; }

/* ===== DOM ===== */
const stageWrap = document.getElementById('stageWrap');
const stageInner = document.getElementById('stageInner');
const img = document.getElementById('img');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const floatLabel = document.getElementById('floatLabel');
let showSkeleton = true;

/* ===== State ===== */
let selectedKind='none';      // 'none' | 'body' | 'lhand' | 'rhand'
let selectedJointIdx=0;       // for body
let selectedHandIdx=0;        // for hands
let kps  = Array.from({length:N},   ()=>({x:null,y:null,missing:false,c:1}));
let lhand= Array.from({length:21},  ()=>({x:null,y:null,missing:false,c:1}));
let rhand= Array.from({length:21},  ()=>({x:null,y:null,missing:false,c:1}));
let dragging=null;            // {kind, idx} when dragging a point
let imgScale=1, imgOffset={x:0,y:0};

/* UI options */
const usePoseColors=true;
let boneStrokeWidth=6;
let jointRadius=3;
let colorJointsByLimb=false;
let showCursorLabel=true;

/* ===== UI lists ===== */
const jointList=document.getElementById('jointList');
const lhandList=document.getElementById('lhandList');
const rhandList=document.getElementById('rhandList');

function buildJointList(){
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
function buildHandLists(){ if (lhandList) buildHandList(lhandList,'L'); if (rhandList) buildHandList(rhandList,'R'); }

function statusGlyph(kind, i){
  const p = (kind==='body') ? kps[i] : (kind==='lhand' ? lhand[i] : rhand[i]);
  if (!p) return '◌';
  if (p.missing) return '✖';
  if (p.x==null || p.y==null) return '◌';
  return '●';
}
function refreshStatuses(){
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
function selectJoint(i){ selectedKind='body'; selectedJointIdx=i; refreshStatuses();}
function selectHand(kind,i){
  selectedKind=kind; selectedHandIdx=i;
  refreshStatuses();
}

/* ===== Zoom / Centering / Pan ===== */
let zoom = 1;
const Z_MIN = 0.2, Z_MAX = 6;
const Z_STEP = 1.1;
let firstLoad = true;

function setCanvasSize(){
  const nw = img.naturalWidth || 1;
  const nh = img.naturalHeight || 1;

  // backing pixels
  canvas.width = nw;
  canvas.height = nh;

  // display size
  const dispW = nw * zoom;
  const dispH = nh * zoom;

  // size the inner surface (CENTERED via CSS grid on stageWrap)
  stageInner.style.width  = dispW + 'px';
  stageInner.style.height = dispH + 'px';

  // pin children to stageInner origin
  img.style.width = dispW + 'px';  img.style.height = dispH + 'px';
  canvas.style.width = dispW + 'px'; canvas.style.height = dispH + 'px';
  overlay.style.width = dispW + 'px'; overlay.style.height = dispH + 'px';

  updateImgMetrics();

  if (firstLoad){
    centerImageInStage();
    firstLoad = false;
  }
}
function updateImgMetrics(){
  const r = stageInner.getBoundingClientRect();
  imgScale = zoom;
  imgOffset = { x: r.left + window.scrollX, y: r.top + window.scrollY };
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
  zoom = Math.max(Z_MIN, Math.min(Z_MAX, newZoom));
  if (zoom === oldZoom) return;

  // keep cursor-centered zoom if we have a pivot
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
    // zoom without pivot: keep centered
    centerImageInStage();
  }
}

/* mouse wheel zoom */
stageWrap.addEventListener('wheel',(e)=>{
  if (!img.src) return;
  e.preventDefault();
  const factor = (e.deltaY>0) ? (1/1.1) : 1.1;
  applyZoom(zoom * factor, e.pageX, e.pageY);
},{passive:false});

/* keyboard zoom (+/-) */
document.addEventListener('keydown',(e)=>{
  if (!img.src) return;
  if (e.key==='+' || e.key==='='){ e.preventDefault(); applyZoom(zoom*Z_STEP); }
  else if (e.key==='-'){ e.preventDefault(); applyZoom(zoom/Z_STEP); }
});

/* middle-mouse panning */
let panActive = false, panStart = null;
stageWrap.addEventListener('pointerdown', (e)=>{
  // middle button = pan only
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

/* ===== Drawing (depth-aware) ===== */
function draw(){
  if (!img.src){ ctx.clearRect(0,0,canvas.width,canvas.height); return; }
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const segs = [];
  if (showSkeleton){
    for (const [a,b] of BODY25_PAIRS){
      const pa=kps[a], pb=kps[b];
      if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;
      const limb = limbForPair(a,b);
      segs.push({ ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y, color:usePoseColors?colorForPair(a,b):'#7fffd4', width:boneStrokeWidth, depth:depthForLimb(limb) });
    }
  }
  function collectHandSegs(handArr, limbKey, color){
    for (const [a,b] of HAND_PAIRS){
      const pa=handArr[a], pb=handArr[b];
      if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;
      segs.push({ ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y, color, width:boneStrokeWidth, depth:depthForLimb(limbKey) });
    }
    const isLeft = (limbKey==='lhand');
    const bodyWrist = isLeft ? kps[7] : kps[4];
    const handWrist = handArr[0];
    if (bodyWrist && handWrist && bodyWrist.x!=null && handWrist.x!=null && !bodyWrist.missing && !handWrist.missing){
      segs.push({ ax:bodyWrist.x, ay:bodyWrist.y, bx:handWrist.x, by:handWrist.y, color, width:boneStrokeWidth, depth:depthForLimb(limbKey) });
    }
  }
  collectHandSegs(lhand,'lhand',usePoseColors?OP_COLORS.larm:'#7fffd4');
  collectHandSegs(rhand,'rhand',usePoseColors?OP_COLORS.rarm:'#7fffd4');

  const joints=[];
  for (let i=0;i<N;i++){
    const p=kps[i]; if (!p || p.x==null) continue;
    const limb = limbForJoint(i);
    const jointColor=(colorJointsByLimb && usePoseColors) ? colorForJoint(i) : '#FFFFFF';
    joints.push({ x:p.x, y:p.y, fill:p.missing?'#666666':jointColor, stroke:p.missing?'#333333':'#000000', depth:depthForLimb(limb) });
  }
  function collectHandJoints(handArr, limbKey, baseColor){
    for (let i=0;i<handArr.length;i++){
      const p=handArr[i]; if (!p || p.x==null) continue;
      joints.push({ x:p.x, y:p.y, fill:p.missing?'#666666': (colorJointsByLimb && usePoseColors ? baseColor : '#FFFFFF'), stroke:p.missing?'#333333':'#000000', depth:depthForLimb(limbKey) });
    }
  }
  collectHandJoints(lhand,'lhand',OP_COLORS.larm);
  collectHandJoints(rhand,'rhand',OP_COLORS.rarm);

  segs.sort((a,b)=>a.depth-b.depth);
  joints.sort((a,b)=>a.depth-b.depth);

  for (const s of segs){
    ctx.globalAlpha = alphaForDepth(s.depth);
    ctx.lineWidth = s.width; ctx.strokeStyle = s.color;
    ctx.beginPath(); ctx.moveTo(s.ax,s.ay); ctx.lineTo(s.bx,s.by); ctx.stroke();
  }
  for (const j of joints){
    ctx.globalAlpha = alphaForDepth(j.depth);
    ctx.beginPath(); ctx.arc(j.x, j.y, jointRadius, 0, Math.PI*2);
    ctx.fillStyle = j.fill; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = j.stroke; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ===== Overlay (draggable dots) ===== */
function renderOverlay(){
  overlay.innerHTML='';
  function append(kind, arr, count){
    for (let i=0;i<count;i++){
      const p=arr[i];
      const dot=document.createElement('div');
      dot.className='kp'; dot.dataset.kind=kind; dot.dataset.idx=i;
      if (p.missing) dot.dataset.missing='1';
      if (p.x!=null && p.y!=null){
        dot.style.left = (p.x*imgScale)+'px';
        dot.style.top  = (p.y*imgScale)+'px';
      } else {
        dot.style.left='-9999px'; dot.style.top='-9999px';
      }
      dot.addEventListener('pointerdown', onDotDown);
      overlay.appendChild(dot);
    }
  }
  append('body',kps,N);
  append('lhand',lhand,21);
  append('rhand',rhand,21);
}
function moveOverlayDot(kind, idx, p){
  const base = (kind==='body') ? idx : (kind==='lhand' ? N+idx : N+21+idx);
  const dot=overlay.children[base];
  if (!dot) return;
  dot.style.left = (p.x*imgScale)+'px';
  dot.style.top  = (p.y*imgScale)+'px';
}

/* ===== Interaction ===== */
/* Left-click places when a joint is selected; middle pans; right does nothing */
stageWrap.addEventListener('pointerdown',(e)=>{
  if (!img.src) return;

  // middle button is handled in pan handler
  if (e.button!==0) return;

  // if nothing selected, do nothing
  if (selectedKind==='none') return;

  const pt=pageToImg({x:e.pageX,y:e.pageY});
  if (selectedKind==='body'){
    const i=selectedJointIdx;
    kps[i].x=pt.x; kps[i].y=pt.y; kps[i].missing=false;
    dragging={kind:'body', idx:i};
    if (showCursorLabel) showFloat(`${JOINTS[i]}`, e.pageX, e.pageY);
  } else {
    const i=selectedHandIdx, arr=(selectedKind==='lhand')?lhand:rhand;
    arr[i].x=pt.x; arr[i].y=pt.y; arr[i].missing=false;
    dragging={kind:selectedKind, idx:i};
    if (showCursorLabel) showFloat(`${selectedKind==='lhand'?'L':'R'} ${HAND_NAMES[i]}`, e.pageX, e.pageY);
  }
  draw(); renderOverlay(); refreshStatuses();

  // drag to fine-tune with left button
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
    dragging=null; hideFloat();

    // >>> AUTO-DESELECT after placing <<<
    selectedKind='none';
    refreshStatuses();
   
    window.removeEventListener('pointermove', moveH);
    window.removeEventListener('pointerup', upH, { once:true });
  };
  window.addEventListener('pointermove', moveH);
  window.addEventListener('pointerup', upH, { once:true });
});

/* drag existing dot (left button only) */
function onDotDown(e){
  if (e.button!==0) return; // only left-drag
  e.preventDefault();
  const kind=e.currentTarget.dataset.kind;
  const idx=+e.currentTarget.dataset.idx;
  dragging={kind, idx};

  // selecting a dot does NOT arm placement again
  selectedKind='none';
  refreshStatuses();

  e.currentTarget.setPointerCapture(e.pointerId);

  const move = (ev)=>{
    const pt=pageToImg({x:ev.pageX,y:ev.pageY});
    const p = (kind==='body') ? kps[idx] : (kind==='lhand' ? lhand[idx] : rhand[idx]);
    p.x=Math.max(0,Math.min(canvas.width,pt.x));
    p.y=Math.max(0,Math.min(canvas.height,pt.y));
    moveOverlayDot(kind, idx, p);
    draw();
  };
  const up = ()=>{
    dragging=null; hideFloat();
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up, {once:true});
}

/* ===== Depth controls ===== */
['rarm','larm','rleg','lleg','torso','head','lhand','rhand'].forEach(id=>{
  const el=document.getElementById('depth-'+id);
  if (el) el.addEventListener('change', e=>{ depthMap[id]=+e.target.value; draw(); });
});
document.getElementById('dimBack')?.addEventListener('change', e=>{ dimBackLayers=e.target.checked; draw(); });

/* ===== Top bar / side controls ===== */
document.getElementById('poseColors')?.addEventListener('change', e=>{ usePoseColors=e.target.checked; draw(); buildJointList(); buildHandLists(); refreshStatuses(); });
document.getElementById('boneWidth')?.addEventListener('change', e=>{ boneStrokeWidth=Math.max(1,+e.target.value||6); draw(); });
document.getElementById('colorJoints')?.addEventListener('change', e=>{ colorJointsByLimb=e.target.checked; draw(); });
document.getElementById('showCursorLabel')?.addEventListener('change', e=>{ showCursorLabel=e.target.checked; });

const jointSizeEl=document.getElementById('jointSize');
if (jointSizeEl) jointSizeEl.addEventListener('change', e=>{ jointRadius=Math.max(1,+e.target.value||3); draw(); });

document.getElementById('toggleSkeleton')?.addEventListener('click', ()=>{ showSkeleton=!showSkeleton; draw(); });
document.getElementById('reset')?.addEventListener('click', ()=>{
  kps  = Array.from({length:N}, ()=>({x:null,y:null,missing:false,c:1}));
  lhand= Array.from({length:21},()=>({x:null,y:null,missing:false,c:1}));
  rhand= Array.from({length:21},()=>({x:null,y:null,missing:false,c:1}));
  selectedKind='none';
  draw(); renderOverlay(); refreshStatuses();
});

document.getElementById('clearstage')?.addEventListener('click', ()=>{location.reload();});
document.getElementById('exportJson')?.addEventListener('click', exportJson);
document.getElementById('exportPng')?.addEventListener('click', exportPosePng);

/* ===== Export ===== */
function exportJson(){
  const usePixels=document.getElementById('scaleOut')?.checked ?? true;
  const body=[];
  for (let i=0;i<N;i++){
    const p=kps[i];
    if (!p || p.x==null || p.y==null || p.missing) body.push(0,0,0);
    else body.push(usePixels?p.x:p.x/canvas.width, usePixels?p.y:p.y/canvas.height, p.c ?? 1);
  }
  const L=[],R=[];
  for (let i=0;i<21;i++){
    const lp=lhand[i], rp=rhand[i];
    if (!lp || lp.x==null || lp.y==null || lp.missing) L.push(0,0,0);
    else L.push(usePixels?lp.x:lp.x/canvas.width, usePixels?lp.y:lp.y/canvas.height, lp.c ?? 1);
    if (!rp || rp.x==null || rp.y==null || rp.missing) R.push(0,0,0);
    else R.push(usePixels?rp.x:rp.x/canvas.width, usePixels?rp.y:rp.y/canvas.height, rp.c ?? 1);
  }
  const json={
    version:1.3,
    people:[{ pose_keypoints_2d:body, face_keypoints_2d:[], hand_left_keypoints_2d:L, hand_right_keypoints_2d:R }],
    image_size:[canvas.width,canvas.height],
    keypoint_format: (usePixels?"body25+hands-pixels":"body25+hands-normalized")
  };
  downloadBlob(new Blob([JSON.stringify(json,null,2)],{type:'application/json'}),'openpose_body25_hands.json');
}

// ---- Save-As helper (File System Access API if available; fallback with cancel support) ----
async function saveBlobAs(blob, suggestedName = 'pose.png') {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // user canceled or unsupported; fall through to download
      console.warn('showSaveFilePicker unavailable/canceled. Falling back.', err);
    }
  }

  // Fallback: prompt + standard download (honors cancel)
  const name = (typeof prompt === 'function')
    ? (prompt('Save as filename:', suggestedName) || null)
    : suggestedName;

  if (!name) return; // user canceled

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function exportPosePng(){
  const tmp=document.createElement('canvas'); tmp.width=canvas.width; tmp.height=canvas.height;
  const t=tmp.getContext('2d'); t.fillStyle='#000'; t.fillRect(0,0,tmp.width,tmp.height);

  const segs=[];
  for (const [a,b] of BODY25_PAIRS){
    const pa=kps[a], pb=kps[b];
    if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;
    segs.push({ ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y, color:usePoseColors?colorForPair(a,b):'#FFF', width:boneStrokeWidth, depth:depthForLimb(limbForPair(a,b)) });
  }
  function hSegs(handArr, limbKey, color){
    for (const [a,b] of HAND_PAIRS){
      const pa=handArr[a], pb=handArr[b];
      if (!pa || !pb || pa.x==null || pb.x==null || pa.missing || pb.missing) continue;
      segs.push({ ax:pa.x, ay:pa.y, bx:pb.x, by:pb.y, color, width:boneStrokeWidth, depth:depthForLimb(limbKey) });
    }
    const wBody = (limbKey==='lhand') ? kps[7] : kps[4];
    const wHand = handArr[0];
    if (wBody && wHand && wBody.x!=null && wHand.x!=null && !wBody.missing && !wHand.missing){
      segs.push({ ax:wBody.x, ay:wBody.y, bx:wHand.x, by:wHand.y, color, width:boneStrokeWidth, depth:depthForLimb(limbKey) });
    }
  }
  hSegs(lhand,'lhand',usePoseColors?OP_COLORS.larm:'#FFF');
  hSegs(rhand,'rhand',usePoseColors?OP_COLORS.rarm:'#FFF');

  const joints=[];
  for (let i=0;i<N;i++){
    const p=kps[i]; if (!p || p.x==null || p.missing) continue;
    joints.push({ x:p.x, y:p.y, r:jointRadius, fill:(colorJointsByLimb&&usePoseColors)?colorForJoint(i):OP_COLORS.joint, depth:depthForLimb(limbForJoint(i)) });
  }
  function hDots(arr, limbKey, col){
    for (let i=0;i<arr.length;i++){
      const p=arr[i]; if (!p || p.x==null || p.missing) continue;
      joints.push({ x:p.x, y:p.y, r:jointRadius, fill:(colorJointsByLimb&&usePoseColors)?col:OP_COLORS.joint, depth:depthForLimb(limbKey) });
    }
  }
  hDots(lhand,'lhand',OP_COLORS.larm);
  hDots(rhand,'rhand',OP_COLORS.rarm);

  segs.sort((a,b)=>a.depth-b.depth);
  joints.sort((a,b)=>a.depth-b.depth);

  for (const s of segs){ t.globalAlpha=alphaForDepth(s.depth); t.lineWidth=s.width; t.strokeStyle=s.color; t.beginPath(); t.moveTo(s.ax,s.ay); t.lineTo(s.bx,s.by); t.stroke(); }
  for (const j of joints){ t.globalAlpha=alphaForDepth(j.depth); t.beginPath(); t.arc(j.x,j.y,j.r,0,Math.PI*2); t.fillStyle=j.fill; t.fill(); }
  t.globalAlpha=1;

  tmp.toBlob(async (blob)=>{
    if (!blob) return;

    // Suggest a nice default filename (based on source image if possible)
    let suggested = 'pose.png';
    try {
      const src = img?.src || '';
      const m = src.match(/([^\/\\?#]+)\.(png|jpg|jpeg|webp|gif)/i);
      if (m) suggested = `${m[1]}_pose.png`;
    } catch {}

    await saveBlobAs(blob, suggested);
  },'image/png');
}

function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

/* ===== Blank Templates (topbar dropdowns) ===== */
const TEMPLATE_MAP = {
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

function buildTemplateMenus(){
  document.querySelectorAll('.dropdown').forEach(dd=>{
    const key = dd.dataset.menu;
    const menu = dd.querySelector('.dd-menu');
    const items = TEMPLATE_MAP[key] || [];
    menu.innerHTML = '';
    items.forEach(({label, path, note})=>{
      const el = document.createElement('div');
      el.className = 'dd-item';
      el.innerHTML = `<span class="dd-size">${label}</span>${note ? `<span class="dd-note">${note}</span>` : ''}`;
      el.addEventListener('click', ()=>{
        loadTemplate(path, `Blank ${key} ${label}`);
        closeAllDropdowns();
      });
      menu.appendChild(el);
    });
    // toggle open/close
    const btn = dd.querySelector('.dd-btn');
    if (btn){
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        const isOpen = menu.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) menu.classList.add('open');
      });
    }
  });

  // close when clicking elsewhere or pressing Esc
  document.addEventListener('click', closeAllDropdowns);
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeAllDropdowns(); });
}

function closeAllDropdowns(){
  document.querySelectorAll('.dd-menu.open').forEach(m=>m.classList.remove('open'));
}

function loadTemplate(src, label='Blank'){
  if (!src) return;
  img.onload = ()=>{
    firstLoad = true;         // recenters on load
    setCanvasSize();
    draw();
    renderOverlay();
    buildJointList();
    buildHandLists();
    refreshStatuses();
   };
  img.src = src;
  img.style.maxWidth = 'none';
}

/* ===== Image load ===== */
document.getElementById('file')?.addEventListener('change',(e)=>{
  const f=e.target.files?.[0]; if (!f) return;
  const url=URL.createObjectURL(f);
  img.onload=()=>{
    firstLoad=true;
    setCanvasSize(); draw(); renderOverlay(); buildJointList(); buildHandLists(); refreshStatuses();
   };
  img.src=url; img.style.maxWidth='none';
});

/* ===== Helpers ===== */
function setStatus(msg){ const s=document.getElementById('status'); if (s) s.textContent=msg; }
function showFloat(text,px,py){ floatLabel.textContent=text; floatLabel.style.left=px+12+'px'; floatLabel.style.top=py+12+'px'; floatLabel.style.display='block'; }
function hideFloat(){ floatLabel.style.display='none'; }

/* ===== Init ===== */
buildJointList(); buildHandLists(); refreshStatuses();
buildTemplateMenus(); // <- templates
setStatus('Load an image or template → Select a joint → Click to place and drag to position. MWheel: Zoom | Middle: Pan | Depth (z-order) sets depth position for bones | Tip: Adjust Bone/Joint thickness for more accuracy');
window.addEventListener('resize', ()=>{ if (img.src){ setCanvasSize(); renderOverlay(); draw(); }});
