// Central place for DOM lookups (ensures consistency)
export const stageWrap   = document.getElementById('stageWrap');
export const stageInner  = document.getElementById('stageInner');
export const img         = document.getElementById('img');
export const canvas      = document.getElementById('canvas');
export const ctx         = canvas.getContext('2d');
export const overlay     = document.getElementById('overlay');
export const floatLabel  = document.getElementById('floatLabel');

export const jointList   = document.getElementById('jointList');
export const lhandList   = document.getElementById('lhandList');
export const rhandList   = document.getElementById('rhandList');

export function setStatus(msg) {
  const s = document.getElementById('status');
  if (s) s.textContent = msg;
}

export function showFloat(text, px, py) {
  if (!floatLabel) return;
  floatLabel.textContent = text;
  floatLabel.style.left = (px + 12) + 'px';
  floatLabel.style.top  = (py + 12) + 'px';
  floatLabel.style.display = 'block';
}

export function hideFloat() {
  if (!floatLabel) return;
  floatLabel.style.display = 'none';
}
