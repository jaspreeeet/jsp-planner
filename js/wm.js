/* ═══════════ JSP·OS window manager · app registry · desktop ═══════════ */
import { el, esc, vibrate, S, save } from './core.js';

export const APPS = new Map();          // id -> app def
const openWins = new Map();             // id -> {node, refresh}
let zTop = 10;
const isMobile = () => matchMedia('(max-width: 640px)').matches;

export function registerApp(app) { APPS.set(app.id, app); }

const APP_TINT = {
  today: '#ffb347', planner: '#4a8fd9', meds: '#e88bb5', routines: '#4caf7d', journal: '#ff6b35',
  trackers: '#9b7ede', collections: '#ffb347', photos: '#4a8fd9', unstuck: '#e05252', selfcare: '#e88bb5',
  mixtape: '#ff6b35', media: '#e05252', games: '#9b7ede', shortcuts: '#ffb347', launcher: '#4caf7d',
  stats: '#ffb347', sync: '#4a8fd9', events: '#e05252', goals: '#4a8fd9', money: '#4caf7d',
  people: '#ffb347', weather: '#8fc3f0', doodle: '#e88bb5', calc: '#9b7ede', clock: '#ff6b35',
  calendar: '#e05252', habits: '#ff6b35',
};

function saveGeom(id, win) {
  S.settings.win = S.settings.win || {};
  S.settings.win[id] = { x: win.offsetLeft, y: win.offsetTop, w: win.offsetWidth, h: win.offsetHeight };
  save();
}

export function openApp(id, params) {
  const app = APPS.get(id);
  if (!app) return;
  vibrate(6);
  if (openWins.has(id)) { focusWin(id); if (params) rerender(id, params); return; }
  if (isMobile()) closeAll();           // one full-screen window at a time on phone

  const win = el(`
    <section class="window" data-app="${id}" role="dialog" aria-label="${esc(app.name)}">
      <div class="win-titlebar">
        <button class="win-close" title="close">×</button>
        <span class="win-title"><img src="assets/icons/${id}.svg" alt="" style="width:15px;height:15px;image-rendering:pixelated;vertical-align:-2px"> ${esc(app.name)}</span>
        <span class="wt-spacer"></span>
      </div>
      <div class="win-body${app.nopad ? ' nopad' : ''}"></div>
      <div class="win-resize" title="drag to resize"></div>
    </section>`);
  if (APP_TINT[id]) {
    win.querySelector('.win-titlebar').style.backgroundColor = `color-mix(in srgb, ${APP_TINT[id]} 26%, var(--paper-2))`;
  }

  // size & position: saved geometry, else cascade (desktop only)
  if (!isMobile()) {
    const layer = document.getElementById('window-layer');
    const saved = (S.settings.win || {})[id];
    const w = Math.min(saved?.w || app.w || 560, layer.clientWidth - 30);
    const h = Math.min(saved?.h || app.h || 620, layer.clientHeight - 20);
    const n = openWins.size;
    win.style.width = w + 'px'; win.style.height = h + 'px';
    const x = saved ? Math.min(Math.max(saved.x, -40), layer.clientWidth - 80) : Math.min(60 + n * 34, layer.clientWidth - w - 12);
    const y = saved ? Math.min(Math.max(saved.y, 0), layer.clientHeight - 60) : Math.min(24 + n * 26, layer.clientHeight - h - 12);
    win.style.left = x + 'px'; win.style.top = y + 'px';
  }
  win.style.zIndex = ++zTop;
  win.addEventListener('pointerdown', () => { win.style.zIndex = ++zTop; });
  win.querySelector('.win-close').addEventListener('click', () => closeApp(id));
  enableDrag(win, id);
  enableResize(win, id);

  document.getElementById('window-layer').appendChild(win);
  const body = win.querySelector('.win-body');
  const ctx = { body, win, id, close: () => closeApp(id), refresh: p => rerender(id, p) };
  openWins.set(id, { node: win, app, ctx, params });
  app.render(ctx, params);
  updateBadges();
}

export function closeApp(id) {
  const w = openWins.get(id);
  if (!w) return;
  if (w.app.onClose) try { w.app.onClose(w.ctx); } catch {}
  w.node.classList.add('closing');
  setTimeout(() => w.node.remove(), 140);
  openWins.delete(id);
}
export function closeAll() { [...openWins.keys()].forEach(closeApp); }
export function focusWin(id) { const w = openWins.get(id); if (w) w.node.style.zIndex = ++zTop; }
export function rerender(id, params) {
  const w = openWins.get(id);
  if (!w) return;
  w.params = params ?? w.params;
  w.ctx.body.innerHTML = '';
  w.app.render(w.ctx, w.params);
}
export function isOpen(id) { return openWins.has(id); }

function enableDrag(win, id) {
  const bar = win.querySelector('.win-titlebar');
  let sx, sy, ox, oy, dragging = false;
  bar.addEventListener('pointerdown', e => {
    if (isMobile() || e.target.closest('.win-close')) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    ox = win.offsetLeft; oy = win.offsetTop;
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove', e => {
    if (!dragging) return;
    win.style.left = Math.max(-40, ox + e.clientX - sx) + 'px';
    win.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
  });
  bar.addEventListener('pointerup', () => { if (dragging) { dragging = false; saveGeom(id, win); } });
  // double-click titlebar: maximize / restore
  bar.addEventListener('dblclick', e => {
    if (isMobile() || e.target.closest('.win-close')) return;
    const layer = document.getElementById('window-layer');
    if (win.dataset.max) {
      const [x, y, w, h] = win.dataset.max.split(',').map(Number);
      win.style.left = x + 'px'; win.style.top = y + 'px';
      win.style.width = w + 'px'; win.style.height = h + 'px';
      delete win.dataset.max;
    } else {
      win.dataset.max = [win.offsetLeft, win.offsetTop, win.offsetWidth, win.offsetHeight].join(',');
      win.style.left = '8px'; win.style.top = '8px';
      win.style.width = (layer.clientWidth - 16) + 'px';
      win.style.height = (layer.clientHeight - 16) + 'px';
    }
    saveGeom(id, win);
  });
}

function enableResize(win, id) {
  const grip = win.querySelector('.win-resize');
  if (!grip) return;
  let sx, sy, ow, oh, resizing = false;
  grip.addEventListener('pointerdown', e => {
    if (isMobile()) return;
    e.preventDefault(); e.stopPropagation();
    resizing = true; sx = e.clientX; sy = e.clientY;
    ow = win.offsetWidth; oh = win.offsetHeight;
    grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener('pointermove', e => {
    if (!resizing) return;
    win.style.width = Math.max(300, ow + e.clientX - sx) + 'px';
    win.style.height = Math.max(220, oh + e.clientY - sy) + 'px';
  });
  grip.addEventListener('pointerup', () => { if (resizing) { resizing = false; saveGeom(id, win); } });
}

/* ---------- desktop icons ---------- */
export function renderDesktop() {
  const grid = document.getElementById('icon-grid');
  grid.innerHTML = '';
  for (const app of APPS.values()) {
    if (app.hidden) continue;
    const btn = el(`
      <button class="desk-icon" data-app="${app.id}">
        <img class="di-img" src="assets/icons/${app.id}.svg" alt="" width="56" height="56">
        <span class="di-lbl">${esc(app.name)}</span>
      </button>`);
    btn.addEventListener('click', () => openApp(app.id));
    grid.appendChild(btn);
  }
  updateBadges();
}

export function updateBadges() {
  for (const app of APPS.values()) {
    const icon = document.querySelector(`.desk-icon[data-app="${app.id}"]`);
    if (!icon) continue;
    icon.querySelector('.di-badge')?.remove();
    const n = app.badge ? app.badge() : 0;
    if (n > 0) icon.appendChild(el(`<span class="di-badge">${n > 99 ? '99' : n}</span>`));
  }
}

/* ---------- generic modal ---------- */
export function modal({ title, bodyHTML, onMount, actions }) {
  const sheet = el(`
    <div class="sheet">
      <div class="sheet-card">
        <div class="sheet-title">${title}</div>
        <div class="modal-body">${bodyHTML}</div>
        <div class="sheet-actions"></div>
      </div>
    </div>`);
  const zone = sheet.querySelector('.sheet-actions');
  const close = () => sheet.remove();
  for (const a of (actions || [{ label: 'done', cls: 'primary' }])) {
    const b = el(`<button class="btn ${a.cls || ''}">${a.label}</button>`);
    b.addEventListener('click', () => { if (!a.onClick || a.onClick(sheet) !== false) close(); });
    zone.appendChild(b);
  }
  sheet.addEventListener('pointerdown', e => { if (e.target === sheet) close(); });
  document.body.appendChild(sheet);
  if (onMount) onMount(sheet, close);
  return sheet;
}

export function confirmModal(title, msg, onYes) {
  modal({
    title, bodyHTML: `<p class="muted" style="font-size:14px">${msg}</p>`,
    actions: [
      { label: 'cancel', cls: 'ghost' },
      { label: 'yes, do it', cls: 'primary', onClick: () => { onYes(); } },
    ],
  });
}
