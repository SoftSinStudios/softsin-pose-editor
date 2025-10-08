import { BODY25_PAIRS, HAND_PAIRS, OP_COLORS, N } from './constants.js';
import { canvas, img } from './dom.js';
import {
  kps, lhand, rhand, boneStrokeWidth, jointRadius, colorJointsByLimb, usePoseColors,
  alphaForDepth, depthForLimb
} from './state.js';
import { colorForPair, limbForPair, limbForJoint, colorForJoint } from './utils.js';

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

export async function saveBlobAs(blob, suggestedName='pose.png') {
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
      console.warn('showSaveFilePicker unavailable/canceled. Falling back.', err);
    }
  }
  const name = (typeof prompt === 'function')
    ? (prompt('Save as filename:', suggestedName) || null)
    : suggestedName;
  if (!name) return;
  downloadBlob(blob, name);
}

export function exportJson() {
  const usePixels = document.getElementById('scaleOut')?.checked ?? true;

  const body=[];
  for (let i=0;i<N;i++){
    const p=kps[i];
    if (!p || p.x==null || p.y==null || p.missing) body.push(0,0,0);
    else body.push(usePixels?p.x:p.x/canvas.width, usePixels?p.y:p.y/canvas.height, p.c ?? 1);
  }
  const L=[], R=[];
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

export function exportPosePng() {
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
    let suggested = 'pose.png';
    try {
      const src = img?.src || '';
      const m = src.match(/([^\/\\?#]+)\.(png|jpg|jpeg|webp|gif)/i);
      if (m) suggested = `${m[1]}_pose.png`;
    } catch {}
    await saveBlobAs(blob, suggested);
  },'image/png');
}
