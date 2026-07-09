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
import oracle from './apps/oracle.js';
import events from './apps/events.js';
import { pullIfNewer, startEngine, cloudReady } from './cloud.js';
import { wireSfx, pop, boot as bootChime } from './sfx.js';
import { mixtapeInfo } from './apps/mixtape.js';
import goals from './apps/goals.js';
import money from './apps/money.js';
import people from './apps/people.js';
import weather from './apps/weather.js';
import doodle from './apps/doodle.js';
import calc from './apps/calc.js';
import clock from './apps/clock.js';
import calendar from './apps/calendar.js';
import habits from './apps/habits.js';

const ALL = [today, planner, calendar, habits, meds, routines, journal, events, goals, trackers, unstuck, oracle, selfcare, collections, photos, people, mixtape, media, games, doodle, weather, clock, money, calc, shortcuts, launcher, stats, sync];

import { handleAuthCallback } from './cloud.js';
import { S } from './core.js';

const urlParams = new URLSearchParams(window.location.search);
const authCode = urlParams.get('code');

if (authCode) {
  // 1. Clean the URL so the weird code disappears
  window.history.replaceState({}, document.title, window.location.pathname);

  // 2. Wait until the 'S' object is fully loaded from the database
  const waitForApp = setInterval(() => {
    if (S !== null && S !== undefined) {
      clearInterval(waitForApp); // Stop waiting

      // 3. Now it is safe to log in!
      handleAuthCallback(authCode)
        .then(user => console.log(`Logged in as ${user}`))
        .catch(err => alert(`Sync failed: ${err.message}`));
    }
  }, 100); // Checks every 100 milliseconds
}

/* seed friendly examples — only into EMPTY sections, all clearly marked, all deletable */
function seedExamples() {
  // v4 additions run their own pass so existing users get them too
  if (!S.settings.exampled4) {
    S.settings.exampled4 = true;
    if (!(S.habits || []).length) {
      const done = {};
      for (let i = 1; i <= 4; i++) { const d = new Date(); d.setDate(d.getDate() - i); done[todayKey(d)] = 1; }
      S.habits.push({ id: uid(), name: 'Shower (example)', emoji: '🚿', done });
    }
    save();
  }
  if (S.settings.exampled) return;
  S.settings.exampled = true;
  const dk = todayKey();
  const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return todayKey(d); };
  const inDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return todayKey(d); };

  if (!S.meds.length) S.meds.push({
    id: uid(), name: 'Vitamin D3 (example)', dose: '1 capsule · 1000 IU', kind: 'med',
    why: 'sunshine in pill form — mood, energy and bones all thank me', times: ['09:00'], color: '#ffb347', taken: {},
  });
  if (!S.trackers.length) {
    const wlog = {}, mlog = {};
    for (let i = 1; i <= 7; i++) { wlog[ago(i)] = 3 + (i % 5); mlog[ago(i)] = 2 + (i % 4); }
    S.trackers.push(
      { id: uid(), name: 'Water (example)', emoji: '💧', type: 'counter', unit: 'glasses', goal: 8, log: wlog },
      { id: uid(), name: 'Mood (example)', emoji: '🌈', type: 'rating', unit: '', goal: null, log: mlog },
    );
  }
  if (!S.collections.length) S.collections.push({
    id: uid(), name: 'Jokes', emoji: '😂', items: [
      { id: uid(), text: 'I told my suitcase there\'d be no vacation this year. now I\'m dealing with emotional baggage. (example — add your own!)', ts: Date.now(), fav: true },
      { id: uid(), text: 'Parallel lines have so much in common. shame they\'ll never meet. (example)', ts: Date.now(), fav: false },
    ],
  });
  if (!S.journal.length) S.journal.push(
    { id: uid(), sig: 'note', text: 'this is a bullet journal note (example) — the ✎ pencil symbols on the left change the entry type', dateKey: dk, done: false, ts: Date.now() },
    { id: uid(), sig: 'grateful', text: 'grateful for a second brain that remembers so I don\'t have to (example)', dateKey: dk, done: false, ts: Date.now() },
  );
  if (!S.events.length) S.events.push({ id: uid(), name: 'something to look forward to (example)', emoji: '🎡', date: inDays(12) });
  if (!S.goals.length) S.goals.push({
    id: uid(), name: 'learn JSP·OS (example)', emoji: '🗺', why: 'a tool only helps if it\'s in my hands',
    milestones: [
      { id: uid(), text: 'brain-dump one thought with the big + button', done: false },
      { id: uid(), text: 'add my real meds with their WHY', done: false },
      { id: uid(), text: 'play one mixtape channel', done: false },
      { id: uid(), text: 'pick my favourite colour theme in Sync', done: false },
    ],
  });
  if (!S.people.length) S.people.push({
    id: uid(), name: 'Sample Friend (example)', emoji: '🦊', likes: 'coffee, indie films, being remembered',
    birthday: '', notes: 'this is where inside jokes and “ask them about…” notes live', lastTalked: ago(25),
  });
  if (!S.money.entries.length) S.money.entries.push(
    { id: uid(), amount: 120, cat: 'food', emoji: '🍕', note: 'pizza night (example)', dateKey: ago(1) },
    { id: uid(), amount: 60, cat: 'coffee', emoji: '☕', note: 'oat latte (example)', dateKey: dk },
  );
  save();
}

const BOOT_LINES = [
  'warming up the tape deck…', 'ironing the pixels…', 'untangling the chains…',
  'feeding the oracle…', 'bribing the sun to rise…', 'counting your streaks…',
];
function bootUI(pct, line) {
  const f = document.getElementById('boot-fill');
  if (f) f.style.width = pct + '%';
  if (line) document.getElementById('boot-line').textContent = line;
}

async function boot() {
  const bootStart = Date.now();
  bootUI(12, BOOT_LINES[Math.floor(Math.random() * BOOT_LINES.length)]);
  await dbOpen();
  bootUI(30);
  await loadState();
  bootUI(45);
  // cloud: adopt a newer version from another device (bounded so boot never hangs)
  let pulled = false;
  if (cloudReady()) {
    bootUI(55, 'checking the cloud…');
    pulled = await Promise.race([pullIfNewer(), new Promise(r => setTimeout(() => r(false), 5000))]);
  }
  bootUI(70);
  seedExamples();
  ALL.forEach(registerApp);

  document.body.dataset.theme = S.settings.theme || (S.settings.night ? 'night' : 'cream');
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
  else if (location.hash.startsWith('#app=')) {
    const target = location.hash.slice(5);
    history.replaceState(null, '', location.pathname);
    openApp(APPS.has(target) ? target : 'today');
  }
  else openApp('today');

  // shortcuts can deep-link while the app is already open (no reload happens)
  addEventListener('hashchange', () => {
    if (location.hash === '#paste') { history.replaceState(null, '', location.pathname); openApp('sync', { paste: true }); }
    else if (location.hash.startsWith('#app=')) {
      const target = location.hash.slice(5);
      history.replaceState(null, '', location.pathname);
      if (APPS.has(target)) openApp(target);
    }
  });

  // service worker
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  S.settings.lastOpen = todayKey();
  save();

  // never lose a thought: flush pending saves when the app is backgrounded/closed
  addEventListener('pagehide', () => saveNow());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  // vibes: sounds, ticker, crt, cloud engine
  wireSfx();
  on('xp', pop);
  document.body.classList.toggle('crt', !!S.settings.crt);
  startTicker();
  startEngine();
  if (pulled) toast('☁ pulled the newest version from your other device ✓');

  // dismiss splash (min 900ms so it doesn't blink)
  const wait = Math.max(0, 900 - (Date.now() - bootStart));
  setTimeout(() => {
    bootUI(100, 'welcome back.');
    const b = document.getElementById('boot');
    setTimeout(() => { b.classList.add('bye'); setTimeout(() => b.remove(), 500); }, 250);
  }, wait);
  document.addEventListener('pointerdown', () => bootChime(), { once: true });
}

/* ---------- menubar ticker ---------- */
const TICKER_LINES = [
  'romanticise the boring parts', 'main-character maintenance in progress',
  'tiny steps count double on hard days', 'the chain misses you',
  'hydrate or diedrate', 'you are the CEO of your own cozy empire',
];
function startTicker() {
  const node = document.getElementById('mb-ticker-text');
  if (!node) return;
  const build = () => {
    const tk = todayKey();
    const bits = [];
    const mi = mixtapeInfo();
    if (mi.playing) bits.push('📼 now playing: ' + mi.name);
    const left = S.tasks.filter(t => t.dateKey === tk && !t.done).length;
    if (left) bits.push(`▤ ${left} task${left > 1 ? 's' : ''} on today's plate`);
    const chain = Math.max(0, ...(S.habits || []).map(h => Object.keys(h.done || {}).length));
    if (chain) bits.push(`⛓ ${chain} links forged all-time`);
    const nextEv = S.events.filter(e2 => e2.date >= tk).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (nextEv) bits.push(`⏳ ${nextEv.name} approaching`);
    bits.push('✦ ' + TICKER_LINES[Math.floor(Math.random() * TICKER_LINES.length)]);
    return bits.join('  ·  ');
  };
  node.textContent = build();
  setInterval(() => { node.textContent = build(); }, 30000);
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
