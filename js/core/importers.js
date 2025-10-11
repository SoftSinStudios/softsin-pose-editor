// js/core/importers.js
import { PNG_POSE_TEXT_KEY } from './constants.js';
import { canvas, img } from './dom.js';
import { kps, lhand, rhand, resetPose, setFirstLoad, setShowSkeleton } from './state.js';

/* --- tiny PNG text/iTXt reader (uncompressed) --- */
async function readPngTextChunks(file) {
  if (!file || file.type !== 'image/png') return {};
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // PNG signature
  const sig = [137,80,78,71,13,10,26,10];
  for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) return {};

  let i = 8;
  const texts = {};
  const td = new TextDecoder();

  while (i + 8 <= bytes.length) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset + i);
    const len  = dv.getUint32(0);
    const t0   = bytes[i+4], t1 = bytes[i+5], t2 = bytes[i+6], t3 = bytes[i+7];
    const type = String.fromCharCode(t0,t1,t2,t3);

    const dataStart = i + 8;
    const dataEnd   = dataStart + len;
    if (dataEnd + 4 > bytes.length) break; // corrupt

    if (type === 'tEXt') {
      const data = bytes.subarray(dataStart, dataEnd);
      const nul = data.indexOf(0);
      if (nul > 0) {
        const key = td.decode(data.subarray(0, nul));
        const val = td.decode(data.subarray(nul + 1));
        texts[key] = val;
      }
    } else if (type === 'iTXt') {
      // iTXt structure:
      // key (NUL) | compressionFlag (1) | compressionMethod (1) | langTag (NUL)
      // | translatedKeyword (NUL) | text (UTF-8; compressed iff flag==1)
      const data = bytes.subarray(dataStart, dataEnd);
      // key
      let p = 0;
      const nextNul = () => {
        const idx = data.indexOf(0, p);
        const out = data.subarray(p, idx >= 0 ? idx : data.length);
        p = (idx >= 0 ? idx + 1 : data.length);
        return out;
      };
      const key = td.decode(nextNul());
      if (!key) { /* skip malformed */ }
      else {
        const compressionFlag = data[p++] ?? 0;
        const compressionMethod = data[p++] ?? 0; // spec says 0=zlib when compressed
        // language tag + translated keyword (both NUL-terminated)
        nextNul(); // lang
        nextNul(); // translated
        const textBytes = data.subarray(p);
        if (compressionFlag === 0) {
          texts[key] = td.decode(textBytes);
        } else {
          // Compressed iTXt present — we intentionally skip to avoid bundling a decompressor.
          // (We still remain compatible with our own uncompressed payloads.)
        }
      }
    }

    i = dataEnd + 4; // skip CRC
    if (type === 'IEND') break;
  }
  return texts;
}

/* --- util: decide present/missing & scale --- */
function writeKeypoint(target, x, y, c, usePixels, scaleW, scaleH) {
  const isMissing = (x == null || y == null || c === 0 || (x === 0 && y === 0));
  if (isMissing) {
    target.x = target.y = null;
    target.c = 1;
    target.missing = false; // consistent with previous behavior (not "hidden", just unset)
    return;
  }
  target.x = usePixels ? x : x * scaleW;
  target.y = usePixels ? y : y * scaleH;
  target.c = c || 1;
  target.missing = false;
}

/* --- main loader: always attempts to read SoftSin pose --- */
export async function loadImageWithOptionalPose(file, { autoHideSkeleton = true } = {}) {
  if (!file) return;

  // 1) Try reading embedded SoftSin pose JSON
  let pose = null;
  try {
    const texts = await readPngTextChunks(file);
    if (texts && texts[PNG_POSE_TEXT_KEY]) {
      try { pose = JSON.parse(texts[PNG_POSE_TEXT_KEY]); } catch {}
    }
  } catch (e) {
    console.warn('SoftSin PNG metadata parse failed (ok to ignore):', e);
  }

  // guard flags for two-stage image load (original -> blackened)
  let seededOnce = false;

  // 2) Load image
  const url = URL.createObjectURL(file);
  img.onload = () => {
    // ensure stage sizing recenters for the new image
    setFirstLoad(true);

    // If we have a SoftSin pose and haven't seeded yet, hydrate state
    if (pose?.people?.[0] && !seededOnce) {
      // Always show bones when rehydrating (fixes joints-only surprise)
      setShowSkeleton(true);

      const usePixels = (pose.keypoint_format || '').includes('pixels');
      const body = pose.people[0].pose_keypoints_2d || [];
      const L    = pose.people[0].hand_left_keypoints_2d  || [];
      const R    = pose.people[0].hand_right_keypoints_2d || [];

      // Prefer payload image_size as the normalization basis, fallback to canvas or image
      const basisW = (pose.image_size?.[0]) || canvas.width  || img.naturalWidth  || 1;
      const basisH = (pose.image_size?.[1]) || canvas.height || img.naturalHeight || 1;

      resetPose();

      // BODY_25
      for (let i = 0; i < kps.length; i++) {
        const x = body[i*3+0];
        const y = body[i*3+1];
        const c = body[i*3+2];
        writeKeypoint(kps[i], x, y, c, usePixels, basisW, basisH);
      }

      // HANDS
      const putHand = (arr, src) => {
        for (let i = 0; i < 21; i++) {
          const x = src[i*3+0];
          const y = src[i*3+1];
          const c = src[i*3+2];
          writeKeypoint(arr[i], x, y, c, usePixels, basisW, basisH);
        }
      };
      putHand(lhand, L);
      putHand(rhand, R);

      // Mark we’ve seeded, then (if not yet blackened) swap image pixels to solid black
      seededOnce = true;

      if (!img.dataset.ssBlackened) {
        const w = img.naturalWidth  || canvas.width  || 1;
        const h = img.naturalHeight || canvas.height || 1;

        const black = document.createElement('canvas');
        black.width = w; black.height = h;
        const bt = black.getContext('2d');
        bt.fillStyle = '#000';
        bt.fillRect(0, 0, w, h);

        img.dataset.ssBlackened = '1';
        img.src = black.toDataURL('image/png'); // triggers a second onload
        return; // wait for that onload to finish before announcing imageLoaded
      }

      // Optional: notify pose load (kept from your original)
      document.dispatchEvent(new CustomEvent('pose:poseLoaded', { detail: pose }));
    }

    // 3) Tell app.js to size canvas & redraw UI (runs after blackened onload as well)
    document.dispatchEvent(new CustomEvent('pose:imageLoaded'));

    // optional: clean up object URL later
    // setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  img.src = url;
  img.style.maxWidth = 'none';
}
