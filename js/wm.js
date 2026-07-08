/* ═══════════ JSP·OS window manager · app registry · desktop ═══════════ */
import { el, esc, vibrate, S, save } from './core.js';

export const APPS = new Map();          // id -> app def
const openWins = new Map();             // id -> {node, refresh}
let zTop = 10;
const isMobile = () => matchMedia('(max-width: 640px)').matches;

export function registerApp(app) { APPS.set(app.id, app); }

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
        <span class="win-title">${app.icon} ${esc(app.name)}</span>
        <span class="wt-spacer"></span>
      </div>
      <div class="win-body${app.nopad ? ' nopad' : ''}"></div>
    </section>`);

  // size & cascade position (desktop only)
  if (!isMobile()) {
    const layer = document.getElementById('window-layer');
    const w = Math.min(app.w || 560, layer.clientWidth - 30);
    const h = Math.min(app.h || 620, layer.clientHeight - 30);
    const n = openWins.size;
    win.style.width = w + 'px'; win.style.height = h + 'px';
    win.style.left = Math.min(60 + n * 34, layer.clientWidth - w - 12) + 'px';
    win.style.top = Math.min(24 + n * 26, layer.clientHeight - h - 12) + 'px';
  }
  win.style.zIndex = ++zTop;
  win.addEventListener('pointerdown', () => { win.style.zIndex = ++zTop; });
  win.querySelector('.win-close').addEventListener('click', () => closeApp(id));
  enableDrag(win);

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

function enableDrag(win) {
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
  bar.addEventListener('pointerup', () => dragging = false);
}

/* ---------- desktop icons ---------- */
export function renderDesktop() {
  const grid = document.getElementById('icon-grid');
  grid.innerHTML = '';
  for (const app of APPS.values()) {
    if (app.hidden) continue;
    const btn = el(`
      <button class="desk-icon" data-app="${app.id}">
        <img class="di-img" src="assets/icons/${app.id}.svg" alt="" width="52" height="52">
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
