// SoftSin Studios — .softpose project container
// ZIP storage is intentionally uncompressed so projects remain dependency-free
// and can be inspected or recovered with any standard ZIP utility.

const FORMAT_NAME = "SoftSin Pose Project";
const FORMAT_VERSION = "1.0.0";
const MIME_TYPE = "application/vnd.softsin.pose-project";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function saveSoftPoseProject(state, poseJson, filename = "softsin-pose.softpose") {
  const entries = [];
  const reference = getReferenceEntry(state.backgroundImage);
  const manifest = {
    format: FORMAT_NAME,
    version: FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    pose: "pose.json",
    reference: reference
      ? {
          path: reference.path,
          name: state.backgroundImage.name || reference.path,
          mimeType: reference.mimeType,
          width: state.backgroundImage.width || 0,
          height: state.backgroundImage.height || 0
        }
      : null
  };

  entries.push({ name: "manifest.json", data: encoder.encode(JSON.stringify(manifest, null, 2)) });
  entries.push({ name: "pose.json", data: encoder.encode(poseJson) });
  if (reference) entries.push({ name: reference.path, data: reference.bytes });

  const archive = createZip(entries);
  const blob = new Blob([archive], { type: MIME_TYPE });
  await saveBlob(blob, ensureExtension(filename, ".softpose"));
}

export async function openSoftPoseProject(file) {
  if (!file) throw new Error("No project file selected.");

  const entries = readZip(new Uint8Array(await file.arrayBuffer()));
  const manifestBytes = entries.get("manifest.json");
  const poseBytes = entries.get("pose.json");
  if (!manifestBytes || !poseBytes) throw new Error("This is not a complete SoftSin pose project.");

  const manifest = JSON.parse(decoder.decode(manifestBytes));
  if (manifest.format !== FORMAT_NAME) throw new Error("Unsupported pose project format.");

  let backgroundImage = null;
  if (manifest.reference?.path) {
    const imageBytes = entries.get(manifest.reference.path);
    if (!imageBytes) throw new Error("The project reference image is missing.");
    const mimeType = manifest.reference.mimeType || "application/octet-stream";
    backgroundImage = {
      enabled: true,
      name: manifest.reference.name || manifest.reference.path,
      width: Number(manifest.reference.width) || 0,
      height: Number(manifest.reference.height) || 0,
      dataUrl: bytesToDataUrl(imageBytes, mimeType)
    };
  }

  return {
    poseJson: decoder.decode(poseBytes),
    backgroundImage,
    manifest
  };
}

function getReferenceEntry(backgroundImage) {
  if (!backgroundImage?.enabled || !backgroundImage.dataUrl) return null;
  const parsed = dataUrlToBytes(backgroundImage.dataUrl);
  const extension = extensionForMime(parsed.mimeType, backgroundImage.name);
  return {
    path: `reference${extension}`,
    mimeType: parsed.mimeType,
    bytes: parsed.bytes
  };
}

function dataUrlToBytes(dataUrl) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("The reference image data is invalid.");
  const mimeType = match[1] || "application/octet-stream";
  if (match[2]) {
    const binary = atob(match[3]);
    return { mimeType, bytes: Uint8Array.from(binary, character => character.charCodeAt(0)) };
  }
  return { mimeType, bytes: encoder.encode(decodeURIComponent(match[3])) };
}

function bytesToDataUrl(bytes, mimeType) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function extensionForMime(mimeType, originalName = "") {
  const originalExtension = /\.[a-z0-9]+$/i.exec(originalName)?.[0];
  if (originalExtension) return originalExtension.toLowerCase();
  return ({
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/svg+xml": ".svg"
  })[mimeType] || ".image";
}

async function saveBlob(blob, filename) {
  if (typeof window.showSaveFilePicker === "function") {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: "SoftSin Pose Project", accept: { [MIME_TYPE]: [".softpose"] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    write32(localView, 0, 0x04034b50);
    write16(localView, 4, 20);
    write16(localView, 6, 0x0800);
    write16(localView, 8, 0);
    write32(localView, 14, crc);
    write32(localView, 18, data.length);
    write32(localView, 22, data.length);
    write16(localView, 26, name.length);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50);
    write16(centralView, 4, 20);
    write16(centralView, 6, 20);
    write16(centralView, 8, 0x0800);
    write16(centralView, 10, 0);
    write32(centralView, 16, crc);
    write32(centralView, 20, data.length);
    write32(centralView, 24, data.length);
    write16(centralView, 28, name.length);
    write32(centralView, 42, localOffset);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 8, entries.length);
  write16(endView, 10, entries.length);
  write32(endView, 12, centralSize);
  write32(endView, 16, localOffset);
  return concatBytes([...localParts, ...centralParts, end]);
}

function readZip(bytes) {
  const endOffset = findEndRecord(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entryCount = read16(view, endOffset + 10);
  let offset = read32(view, endOffset + 16);
  const entries = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    if (read32(view, offset) !== 0x02014b50) throw new Error("Invalid project directory.");
    const method = read16(view, offset + 10);
    if (method !== 0) throw new Error("Compressed project entries are not supported.");
    const size = read32(view, offset + 24);
    const nameLength = read16(view, offset + 28);
    const extraLength = read16(view, offset + 30);
    const commentLength = read16(view, offset + 32);
    const localHeaderOffset = read32(view, offset + 42);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (read32(view, localHeaderOffset) !== 0x04034b50) throw new Error("Invalid project entry.");
    const localNameLength = read16(view, localHeaderOffset + 26);
    const localExtraLength = read16(view, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.slice(dataStart, dataStart + size);
    if (crc32(data) !== read32(view, offset + 16)) throw new Error(`Project entry failed validation: ${name}`);
    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndRecord(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (read32(view, offset) === 0x06054b50) return offset;
  }
  throw new Error("Invalid SoftSin project archive.");
}

function ensureExtension(filename, extension) {
  return filename.toLowerCase().endsWith(extension) ? filename : `${filename}${extension}`;
}

function concatBytes(parts) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function write16(view, offset, value) { view.setUint16(offset, value, true); }
function write32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
function read16(view, offset) { return view.getUint16(offset, true); }
function read32(view, offset) { return view.getUint32(offset, true); }
