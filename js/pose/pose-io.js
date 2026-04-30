// SoftSin Studios — Pose Editor IO
// Handles JSON save/load and PNG export.
// Background reference images are editor-only and are intentionally not saved
// into project JSON or exported PNG files.

import {
  createState,
  BODY25_BONES,
  BONE_MODES,
  Z_DEPTH,
  DEFAULT_LINE_WEIGHT
} from "./pose-state.js";

import {
  renderExport
} from "./pose-renderer.js";

const PROJECT_FORMAT = "SoftSin Pose Editor";
const PROJECT_VERSION = "1.1.0";
const PNG_POSE_METADATA_KEY = "softsin_pose_json";
const PNG_POSE_METADATA_KEY_LEGACY = "SoftSinPoseData";

export function buildPoseProject(state) {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    canvas: {
      width: state.canvas.width,
      height: state.canvas.height
    },
    exportSize: {
      width: state.exportSize?.width || state.canvas.width,
      height: state.exportSize?.height || state.canvas.height
    },
    selectedBone: state.selectedBone || null,
    keypoints: structuredClone(state.keypoints),
    bones: structuredClone(state.bones),
    exportedAt: new Date().toISOString()
  };
}

export function loadPoseProject(rawProject) {
  const freshState = createState();

  if (!rawProject || typeof rawProject !== "object") {
    return freshState;
  }

  if (rawProject.canvas) {
    freshState.canvas.width = sanitizeNumber(
      rawProject.canvas.width,
      freshState.canvas.width
    );

    freshState.canvas.height = sanitizeNumber(
      rawProject.canvas.height,
      freshState.canvas.height
    );
  }

  if (rawProject.exportSize && typeof rawProject.exportSize === "object") {
    freshState.exportSize = {
      width: clamp(
        sanitizeNumber(rawProject.exportSize.width, freshState.exportSize.width),
        256,
        4096
      ),
      height: clamp(
        sanitizeNumber(rawProject.exportSize.height, freshState.exportSize.height),
        256,
        4096
      )
    };
  }

  if (rawProject.keypoints && typeof rawProject.keypoints === "object") {
    for (const [pointId, point] of Object.entries(rawProject.keypoints)) {
      if (!freshState.keypoints[pointId]) {
        continue;
      }

      freshState.keypoints[pointId].x = sanitizeNumber(
        point.x,
        freshState.keypoints[pointId].x
      );

      freshState.keypoints[pointId].y = sanitizeNumber(
        point.y,
        freshState.keypoints[pointId].y
      );
    }
  }

  if (rawProject.bones && typeof rawProject.bones === "object") {
    for (const [boneId, savedBone] of Object.entries(rawProject.bones)) {
      if (!BODY25_BONES[boneId] || !freshState.bones[boneId]) {
        continue;
      }

      freshState.bones[boneId].mode = sanitizeBoneMode(
        savedBone.mode,
        BODY25_BONES[boneId]
      );

      freshState.bones[boneId].weight = clamp(
        sanitizeNumber(savedBone.weight, DEFAULT_LINE_WEIGHT),
        1,
        24
      );

      freshState.bones[boneId].z = sanitizeZDepth(savedBone.z);
      freshState.bones[boneId].handles = sanitizeHandles(savedBone.handles);
    }
  }

  // Preserve old project behavior only when the JSON explicitly contains a valid selection.
  // Fresh page loads still start with nothing selected.
  if (
    typeof rawProject.selectedBone === "string" &&
    BODY25_BONES[rawProject.selectedBone]
  ) {
    freshState.selectedBone = rawProject.selectedBone;
  } else {
    freshState.selectedBone = null;
  }

  return freshState;
}

export function stateToJson(state) {
  return JSON.stringify(buildPoseProject(state), null, 2);
}

export function jsonToState(jsonText) {
  try {
    const parsed = JSON.parse(jsonText);
    return loadPoseProject(parsed);
  } catch (error) {
    console.error("Invalid pose JSON:", error);
    return createState();
  }
}

export function downloadJson(state, filename = "softsin-pose.json") {
  const json = stateToJson(state);
  downloadTextFile(json, filename, "application/json");
}

export async function copyJsonToClipboard(state) {
  const json = stateToJson(state);

  if (!navigator.clipboard) {
    throw new Error("Clipboard API is not available in this browser.");
  }

  await navigator.clipboard.writeText(json);
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Failed to read pose JSON file."));
    };

    reader.readAsText(file);
  });
}

export function exportPosePng(exportCanvas, state, filename = "softsin-pose.png") {
  renderExport(exportCanvas, state);

  const projectJson = stateToJson(state);
  const dataUrl = exportCanvas.toDataURL("image/png");
  const pngBytes = dataUrlToBytes(dataUrl);

  // Embed editable pose data directly into the exported PNG.
  // The visible PNG remains a clean BODY_25 control image; the hidden tEXt chunks
  // carry the active pose state for future re-import.
  let taggedPngBytes = injectPngTextChunk(
    pngBytes,
    PNG_POSE_METADATA_KEY,
    projectJson
  );

  // Legacy key keeps the file easier to recover if older SoftSin tooling checks
  // for the previous metadata name.
  taggedPngBytes = injectPngTextChunk(
    taggedPngBytes,
    PNG_POSE_METADATA_KEY_LEGACY,
    projectJson
  );

  downloadBinaryFile(taggedPngBytes, filename, "image/png");
}

export async function debugReadPoseJsonFromPngFile(file) {
  if (!file || !isPngFile(file)) {
    return null;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return (
    readPngTextChunk(bytes, PNG_POSE_METADATA_KEY) ||
    readPngTextChunk(bytes, PNG_POSE_METADATA_KEY_LEGACY)
  );
}

export async function readPoseStateFromPngFile(file) {
  if (!file || !isPngFile(file)) {
    return null;
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const projectJson =
      readPngTextChunk(bytes, PNG_POSE_METADATA_KEY) ||
      readPngTextChunk(bytes, PNG_POSE_METADATA_KEY_LEGACY);

    if (!projectJson) {
      return null;
    }

    return jsonToState(projectJson);
  } catch (error) {
    console.warn("PNG did not contain readable SoftSin pose data:", error);
    return null;
  }
}

function downloadTextFile(text, filename, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);

  downloadUrl(url, filename);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function downloadBinaryFile(bytes, filename, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);

  downloadUrl(url, filename);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function downloadUrl(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}


function isPngFile(file) {
  const name = String(file.name || "").toLowerCase();
  const type = String(file.type || "").toLowerCase();

  return type === "image/png" || name.endsWith(".png");
}

function dataUrlToBytes(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error("Invalid PNG data URL.");
  }

  const base64 = dataUrl.slice(commaIndex + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function injectPngTextChunk(pngBytes, keyword, text) {
  if (!isPngBytes(pngBytes)) {
    throw new Error("Only PNG exports can receive embedded pose data.");
  }

  const chunk = createPngTextChunk(keyword, text);
  const insertAt = findAfterFirstChunk(pngBytes, "IHDR");

  const output = new Uint8Array(pngBytes.length + chunk.length);
  output.set(pngBytes.slice(0, insertAt), 0);
  output.set(chunk, insertAt);
  output.set(pngBytes.slice(insertAt), insertAt + chunk.length);

  return output;
}

function readPngTextChunk(pngBytes, keyword) {
  if (!isPngBytes(pngBytes)) {
    return null;
  }

  let offset = 8;

  while (offset + 12 <= pngBytes.length) {
    const length = readUint32(pngBytes, offset);
    const type = bytesToAscii(pngBytes.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const nextOffset = dataEnd + 4;

    if (dataEnd > pngBytes.length || nextOffset > pngBytes.length) {
      return null;
    }

    if (type === "tEXt") {
      const data = pngBytes.slice(dataStart, dataEnd);
      const separatorIndex = data.indexOf(0);

      if (separatorIndex > 0) {
        const foundKeyword = bytesToUtf8(data.slice(0, separatorIndex));

        if (foundKeyword === keyword) {
          return bytesToUtf8(data.slice(separatorIndex + 1));
        }
      }
    }

    offset = nextOffset;
  }

  return null;
}

function createPngTextChunk(keyword, text) {
  const encoder = new TextEncoder();
  const typeBytes = asciiToBytes("tEXt");
  const keywordBytes = encoder.encode(keyword);
  const textBytes = encoder.encode(text);
  const data = new Uint8Array(keywordBytes.length + 1 + textBytes.length);

  data.set(keywordBytes, 0);
  data[keywordBytes.length] = 0;
  data.set(textBytes, keywordBytes.length + 1);

  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);
  writeUint32(chunk, 8 + data.length, crc32(crcInput));

  return chunk;
}

function findAfterFirstChunk(pngBytes, chunkType) {
  let offset = 8;

  while (offset + 12 <= pngBytes.length) {
    const length = readUint32(pngBytes, offset);
    const type = bytesToAscii(pngBytes.slice(offset + 4, offset + 8));
    const nextOffset = offset + 12 + length;

    if (type === chunkType) {
      return nextOffset;
    }

    offset = nextOffset;
  }

  throw new Error(`PNG ${chunkType} chunk not found.`);
}

function isPngBytes(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];

  if (!bytes || bytes.length < signature.length) {
    return false;
  }

  return signature.every((value, index) => bytes[index] === value);
}

function readUint32(bytes, offset) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 255;
  bytes[offset + 1] = (value >>> 16) & 255;
  bytes[offset + 2] = (value >>> 8) & 255;
  bytes[offset + 3] = value & 255;
}

function asciiToBytes(text) {
  return Uint8Array.from(text, character => character.charCodeAt(0));
}

function bytesToAscii(bytes) {
  return Array.from(bytes, byte => String.fromCharCode(byte)).join("");
}

function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function sanitizeBoneMode(mode, boneDefinition) {
  const allowed = Object.values(BONE_MODES);

  if (!allowed.includes(mode)) {
    return boneDefinition.curve ? BONE_MODES.CURVE : BONE_MODES.STRAIGHT;
  }

  // Curve mode is valid for every BODY_25 bone.
  // Some default bones start straight, but the editor intentionally allows users
  // to add curve handles to any selected bone.
  return mode;
}

function sanitizeZDepth(zDepth) {
  const allowed = Object.values(Z_DEPTH);

  if (!allowed.includes(zDepth)) {
    return Z_DEPTH.FOREGROUND;
  }

  return zDepth;
}

function sanitizeHandles(handles) {
  if (!Array.isArray(handles)) {
    return [];
  }

  return handles
    .filter(handle => {
      return (
        handle &&
        Number.isFinite(Number(handle.x)) &&
        Number.isFinite(Number(handle.y))
      );
    })
    .slice(0, 2)
    .map(handle => ({
      x: Number(handle.x),
      y: Number(handle.y)
    }));
}

function sanitizeNumber(value, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
