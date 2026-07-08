/* ═══════════ JSP·OS boot ═══════════ */
import { dbOpen, loadState, S, save, saveNow, todayKey, fmtDate, toast, addXP, levelOf, xpForLevel, uid, on, esc, el } from './core.js';
import { registerApp, renderDesktop, openApp, closeAll, updateBadges, APPS } from './wm.js';

import today from './apps/today.js';
import meds from './apps/meds.js';
import routines from './apps/routines.js';
import planner from './apps/planner.js';
import journal from './apps/journal.js';
import trackers from './apps/trackers.js';
import collections from './apps/collections.js';
import photos from './apps/photos.js';
import unstuck from './apps/unstuck.js';
import selfcare from './apps/selfcare.js';
import games from './apps/games.js';
import shortcuts from './apps/shortcuts.js';
import launcher from './apps/launcher.js';
import mixtape from './apps/mixtape.js';
import media from './apps/media.js';
import stats from './apps/stats.js';
import sync from './apps/sync.js';

const ALL = [today, planner, meds, routines, journal, trackers, unstuck, selfcare, collections, photos, mixtape, media, games, shortcuts, launcher, stats, sync];

async function boot() {
  await dbOpen();
  await loadState();
  ALL.forEach(registerApp);

  document.body.classList.toggle('night', !!S.settings.night);
  renderDesktop();
  renderMenubar();
  renderGreeting();
  wireDock();
  wireCapture();
  tickClock();
  setInterval(tickClock, 1000 * 20);
  on('xp', renderXPChip);
  on('data', () => { updateBadges(); renderGreeting(); });

  // restore flow: shortcut copies backup to clipboard then opens app with #paste
  if (location.hash === '#paste') { history.replaceState(null, '', location.pathname); openApp('sync', { paste: true }); }
  else openApp('today');

  // service worker
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  S.settings.lastOpen = todayKey();
  save();

  // never lose a thought: flush pending saves when the app is backgrounded/closed
  addEventListener('pagehide', () => saveNow());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
}

/* ---------- menubar ---------- */
function renderMenubar() {
  const nav = document.getElementById('mb-menus');
  nav.innerHTML = '';
  const items = [
    ['unstuck?', 'unstuck'],
    ['mixtape', 'mixtape'],
    ['sync', 'sync'],
  ];
  for (const [lbl, app] of items) {
    const b = el(`<button>${lbl}</button>`);
    b.addEventListener('click', () => openApp(app));
    nav.appendChild(b);
  }
  document.getElementById('mb-home').addEventListener('click', closeAll);
  document.getElementById('mb-xp').addEventListener('click', () => openApp('stats'));
  renderXPChip();
}
function renderXPChip() {
  const lvl = levelOf(S.xp.total);
  const cur = S.xp.total - xpForLevel(lvl);
  const need = xpForLevel(lvl + 1) - xpForLevel(lvl);
  document.getElementById('mb-xp').textContent = `LV${lvl} · ${cur}/${need}`;
}
function tickClock() {
  const d = new Date();
  document.getElementById('mb-clock').textContent =
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ---------- greeting ---------- */
const LINES = {
  morning: ['good morning, sunshine', 'a fresh page awaits', 'slow sips, soft start', 'the day is yours to romanticise'],
  afternoon: ['good afternoon', 'main-character hours', 'a little progress counts', 'golden hour is coming'],
  evening: ['good evening', 'wind-down o\'clock', 'you did enough today', 'dim the lights, queue the tape'],
  night: ['hello, night owl', 'the world is quiet now', 'rest is productive too', 'tomorrow-you says thanks for sleeping'],
};
function renderGreeting() {
  const h = new Date().getHours();
  const slot = h < 12 ? (h < 5 ? 'night' : 'morning') : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night';
  const arr = LINES[slot];
  const line = arr[new Date().getDate() % arr.length];
  const name = S.settings.greetName ? line.replace(/(good \w+|hello, night owl)/, `$1, ${S.settings.greetName}`) : line;
  document.getElementById('dg-line').textContent = name;
  document.getElementById('dg-date').textContent = fmtDate();
}

/* ---------- dock ---------- */
function wireDock() {
  document.querySelectorAll('.dock-btn[data-app]').forEach(b =>
    b.addEventListener('click', () => openApp(b.dataset.app)));
  document.getElementById('dock-apps').addEventListener('click', closeAll);
}

/* ---------- quick capture ---------- */
const CAPTURE_TAGS = ['💭 thought', '✅ todo', '😂 joke', '💬 one-liner', '🎬 watch', '💡 idea'];
function wireCapture() {
  const sheet = document.getElementById('capture-sheet');
  const input = document.getElementById('capture-input');
  const tagsZone = document.getElementById('capture-tags');
  let tag = CAPTURE_TAGS[0];
  tagsZone.innerHTML = '';
  CAPTURE_TAGS.forEach((t, i) => {
    const c = el(`<button class="chip ${i === 0 ? 'on' : ''}">${t}</button>`);
    c.addEventListener('click', () => {
      tagsZone.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on'); tag = t;
    });
    tagsZone.appendChild(c);
  });
  const open = () => { sheet.classList.remove('hidden'); setTimeout(() => input.focus(), 80); };
  const close = () => { sheet.classList.add('hidden'); input.value = ''; };
  document.getElementById('dock-capture').addEventListener('click', open);
  document.getElementById('capture-cancel').addEventListener('click', close);
  sheet.addEventListener('pointerdown', e => { if (e.target === sheet) close(); });
  document.getElementById('capture-save').addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) { close(); return; }
    S.inbox.unshift({ id: uid(), text, tag, ts: Date.now() });
    S.stats.captures++;
    addXP(5, 'brain dump');
    close();
    toast('out of your head. safe with me ✓');
  });
  // keyboard shortcut on mac
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); }
  });
}

boot();
