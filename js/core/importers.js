import { PNG_POSE_TEXT_KEY } from './constants.js';
import { canvas, img } from './dom.js';
import {
  kps, lhand, rhand, resetPose, setFirstLoad
} from './state.js';
import { draw, renderOverlay } from './draw.js';
import { buildJointList, buildHandLists, refreshStatuses } from '../app.js';

/* --- tiny PNG tEXt reader --- */
async function readPngTextChunks(file){
  // only parse PNG
  if (!file || !file.type || file.type !== 'image/png') return {};
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // PNG signature
  const sig = [137,80,78,71,13,10,26,10];
  for (let i=0;i<8;i++) if (bytes[i] !== sig[i]) return {};
  let i = 8;
  const texts = {};
  while (i < bytes.length){
    const dv = new DataView(bytes.buffer, bytes.byteOffset + i);
    const len  = dv.getUint32(0);
    const t0   = bytes[i+4], t1=bytes[i+5], t2=bytes[i+6], t3=bytes[i+7];
    const type = String.fromCharCode(t0,t1,t2,t3);
    const dataStart = i + 8;
    const dataEnd   = dataStart + len;
    if (type === 'tEXt'){
      const data = bytes.subarray(dataStart, dataEnd);
      const nul = data.indexOf(0);
      if (nul > 0){
        const key = new TextDecoder().decode(data.subarray(0, nul));
        const val = new TextDecoder().decode(data.subarray(nul+1));
        texts[key] = val;
      }
    }
    i = dataEnd + 4; // skip CRC
    if (type === 'IEND') break;
  }
  return texts;
}

/* --- load image and optionally seed pose --- */
export async function loadImageWithOptionalPose(file){
  if (!file) return;

  // Try to read embedded SoftSin pose first (non-blocking UX is fine either way)
  let posePayload = null;
  try {
    const texts = await readPngTextChunks(file);
    if (texts && texts[PNG_POSE_TEXT_KEY]) posePayload = texts[PNG_POSE_TEXT_KEY];
  } catch {}

  let pose = null;
  if (posePayload){
    try { pose = JSON.parse(posePayload); } catch {}
  }

  const url = URL.createObjectURL(file);
  img.onload = ()=>{
    // Ensure layout matches new image
    setFirstLoad(true);

    // If we have a SoftSin pose, seed it; otherwise leave rig empty
    if (pose?.people?.[0]){
      const usePixels = (pose.keypoint_format || '').includes('pixels');
      const body = pose.people[0].pose_keypoints_2d || [];
      const L    = pose.people[0].hand_left_keypoints_2d  || [];
      const R    = pose.people[0].hand_right_keypoints_2d || [];

      resetPose();

      // body
      for (let i=0;i<kps.length;i++){
        const x = body[i*3+0] ?? 0;
        const y = body[i*3+1] ?? 0;
        const c = body[i*3+2] ?? 0;
        if (x && y){
          kps[i].x = usePixels? x : x * canvas.width;
          kps[i].y = usePixels? y : y * canvas.height;
          kps[i].c = c || 1;  kps[i].missing = false;
        } else {
          kps[i].x=kps[i].y=null; kps[i].missing=false; kps[i].c=1;
        }
      }

      // hands
      const putHand = (arr, src)=>{
        for (let i=0;i<21;i++){
          const x = src[i*3+0] ?? 0;
          const y = src[i*3+1] ?? 0;
          const c = src[i*3+2] ?? 0;
          if (x && y){
            arr[i].x = usePixels? x : x * canvas.width;
            arr[i].y = usePixels? y : y * canvas.height;
            arr[i].c = c || 1; arr[i].missing = false;
          } else {
            arr[i].x=arr[i].y=null; arr[i].missing=false; arr[i].c=1;
          }
        }
      };
      putHand(lhand, L);
      putHand(rhand, R);
    }

    // Now that img is loaded (and pose possibly seeded), render the UI
    // NOTE: setCanvasSize is called from your app’s imageLoaded hook; if not, call it here.
    document.dispatchEvent(new CustomEvent('pose:imageLoaded'));
    draw(); renderOverlay(); buildJointList(); buildHandLists(); refreshStatuses();

    // (Optional) You can revoke later if you want
    // setTimeout(()=>URL.revokeObjectURL(url), 3000);
  };
  img.src = url;
  img.style.maxWidth = 'none';
}
