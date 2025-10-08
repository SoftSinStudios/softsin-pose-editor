import { TEMPLATE_MAP } from './constants.js';
import { img } from './dom.js';
import { draw, renderOverlay } from './draw.js';
import { setFirstLoad } from './state.js';
import { buildJointList, buildHandLists, refreshStatuses } from '../app.js'; // circular-safe: only functions

export function buildTemplateMenus(){
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
  document.addEventListener('click', closeAllDropdowns);
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeAllDropdowns(); });
}

export function closeAllDropdowns(){
  document.querySelectorAll('.dd-menu.open').forEach(m=>m.classList.remove('open'));
}

export function loadTemplate(src, label='Blank'){
  if (!src) return;
  img.onload = ()=>{
    setFirstLoad(true); // recenters on load
    // setCanvasSize + draw + overlay + lists handled by app.js resize-aware logic
    // We'll dispatch a custom event so app.js runs its sizing+refresh pipeline.
    document.dispatchEvent(new CustomEvent('pose:imageLoaded'));
  };
  img.src = src;
  img.style.maxWidth = 'none';
}
