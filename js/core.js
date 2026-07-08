/* ═══════════ JSP·OS core — db · state · xp · toasts · utils ═══════════ */

// ---------- IndexedDB ----------
let _db;
export function dbOpen() {
  return new Promise((res, rej) => {
    const q = indexedDB.open('jsp-os', 2);
    q.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id' });
    };
    q.onsuccess = () => { _db = q.result; res(_db); };
    q.onerror = () => rej(q.error);
  });
}
export function kvGet(key) {
  return new Promise(res => {
    const q = _db.transaction('kv').objectStore('kv').get(key);
    q.onsuccess = () => res(q.result); q.onerror = () => res(undefined);
  });
}
export function kvSet(key, val) {
  return new Promise(res => {
    const q = _db.transaction('kv', 'readwrite').objectStore('kv').put(val, key);
    q.onsuccess = () => res(); q.onerror = () => res();
  });
}
export function photoPut(rec) {
  return new Promise(res => {
    const q = _db.transaction('photos', 'readwrite').objectStore('photos').put(rec);
    q.onsuccess = () => res(); q.onerror = () => res();
  });
}
export function photoGet(id) {
  return new Promise(res => {
    const q = _db.transaction('photos').objectStore('photos').get(id);
    q.onsuccess = () => res(q.result); q.onerror = () => res(undefined);
  });
}
export function photoDel(id) {
  return new Promise(res => {
    const q = _db.transaction('photos', 'readwrite').objectStore('photos').delete(id);
    q.onsuccess = () => res(); q.onerror = () => res();
  });
}
export function photoAll() {
  return new Promise(res => {
    const q = _db.transaction('photos').objectStore('photos').getAll();
    q.onsuccess = () => res(q.result || []); q.onerror = () => res([]);
  });
}

// ---------- state ----------
export const DEFAULT_STATE = {
  v: 1,
  profile: { name: '', joined: null },
  xp: { total: 0, today: 0, todayKey: '', log: [] },
  achievements: [],           // ids unlocked
  settings: { night: false, greetName: '', lastOpen: '' },
  inbox: [],                  // brain dumps {id,text,tag,ts}
  meds: [],                   // {id,name,dose,times[],color,why,kind,taken:{dateKey:[time]},streak,refillDate}
  routines: [],               // {id,name,emoji,timeOfDay,steps[{id,text}],done:{dateKey:[stepId]},streak}
  tasks: [],                  // {id,text,done,dateKey,energy,time,dur,ts}
  journal: [],                // {id,sig,text,dateKey,done,ts}  sig: task|event|note|star|idea|grateful
  trackers: [],               // {id,name,emoji,type:counter|number|rating|yesno,unit,goal,color,log:{dateKey:value}}
  collections: [],            // {id,name,emoji,items:[{id,text,note,ts,fav}]}
  albums: [],                 // {id,name,emoji,photoIds:[]}
  outfits: {},                // dateKey -> {photoId, note}
  shortcuts: [],              // {id,name,emoji,input}
  links: [],                  // {id,name,emoji,url}
  mixtape: { channel: 0, vol: 0.9 },
  media: { items: [], tab: 'yt', seeded: false },
  stats: { captures: 0, medsTaken: 0, tasksDone: 0, journalEntries: 0, gamesPlayed: 0, breaths: 0, pomos: 0 },
};

export let S = null;
let saveTimer = null;
export async function loadState() {
  let raw = await kvGet('state');
  // localStorage write-through survives instant app kills; prefer whichever is newer
  try {
    const ls = JSON.parse(localStorage.getItem('jsp-state'));
    if (ls && (!raw || (ls._ts || 0) > (raw._ts || 0))) raw = ls;
  } catch {}
  S = Object.assign({}, structuredClone(DEFAULT_STATE), raw || {});
  S.stats = Object.assign({}, DEFAULT_STATE.stats, S.stats || {});
  S.settings = Object.assign({}, DEFAULT_STATE.settings, S.settings || {});
  if (!S.profile.joined) S.profile.joined = Date.now();
  // reset daily xp
  if (S.xp.todayKey !== todayKey()) { S.xp.todayKey = todayKey(); S.xp.today = 0; }
  return S;
}
export function save() {
  clearTimeout(saveTimer);
  S._ts = Date.now();
  try { localStorage.setItem('jsp-state', JSON.stringify(S)); } catch {}
  saveTimer = setTimeout(() => kvSet('state', JSON.parse(JSON.stringify(S))), 350);
}
export function saveNow() {
  clearTimeout(saveTimer);
  S._ts = Date.now();
  try { localStorage.setItem('jsp-state', JSON.stringify(S)); } catch {}
  return kvSet('state', JSON.parse(JSON.stringify(S)));
}

// ---------- event bus ----------
const bus = new EventTarget();
export function on(ev, fn) { bus.addEventListener(ev, fn); }
export function emit(ev, detail) { bus.dispatchEvent(new CustomEvent(ev, { detail })); }

// ---------- utils ----------
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export function todayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function fmtDate(d = new Date()) {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function fmtTime(hm) { // '14:30' -> '2:30 pm'
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + ap;
}
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export function daysAgoKey(n) { const d = new Date(); d.setDate(d.getDate() - n); return todayKey(d); }
export function vibrate(ms = 10) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} }

// ---------- toasts ----------
export function toast(msg, cls = '') {
  const z = document.getElementById('toast-zone');
  const t = el(`<div class="toast ${cls}">${msg}</div>`);
  z.appendChild(t);
  setTimeout(() => { t.classList.add('bye'); setTimeout(() => t.remove(), 350); }, 2300);
}

// ---------- XP & levels ----------
export function levelOf(xp) { return Math.floor(Math.sqrt(xp / 40)) + 1; }
export function xpForLevel(lvl) { return 40 * (lvl - 1) * (lvl - 1); }
export function addXP(n, label = '') {
  if (S.xp.todayKey !== todayKey()) { S.xp.todayKey = todayKey(); S.xp.today = 0; }
  const before = levelOf(S.xp.total);
  S.xp.total += n; S.xp.today += n;
  const after = levelOf(S.xp.total);
  toast(`+${n} xp ${label ? '· ' + label : ''}`, 'xp');
  vibrate(12);
  if (after > before) {
    setTimeout(() => { toast(`⬆ LEVEL ${after}! you're glowing`, 'xp'); confetti(); vibrate(40); }, 500);
  }
  checkAchievements();
  save();
  emit('xp');
}

// ---------- achievements ----------
export const ACHIEVEMENTS = [
  { id: 'first-capture', e: '⚡', n: 'First Dump', test: s => s.stats.captures >= 1 },
  { id: 'capture-25', e: '🌊', n: 'Mind Surfer', test: s => s.stats.captures >= 25 },
  { id: 'first-med', e: '💊', n: 'Dose One', test: s => s.stats.medsTaken >= 1 },
  { id: 'med-50', e: '🧪', n: 'Alchemist', test: s => s.stats.medsTaken >= 50 },
  { id: 'task-10', e: '✅', n: 'Doer ×10', test: s => s.stats.tasksDone >= 10 },
  { id: 'task-100', e: '🏆', n: 'Centurion', test: s => s.stats.tasksDone >= 100 },
  { id: 'journal-7', e: '✒️', n: 'Scribe', test: s => s.stats.journalEntries >= 7 },
  { id: 'journal-50', e: '📖', n: 'Novelist', test: s => s.stats.journalEntries >= 50 },
  { id: 'lvl-5', e: '🌟', n: 'Level 5', test: s => levelOf(s.xp.total) >= 5 },
  { id: 'lvl-10', e: '👑', n: 'Level 10', test: s => levelOf(s.xp.total) >= 10 },
  { id: 'breath-5', e: '🫧', n: 'Deep Diver', test: s => s.stats.breaths >= 5 },
  { id: 'pomo-10', e: '🍅', n: 'Tomato Farmer', test: s => s.stats.pomos >= 10 },
  { id: 'game-5', e: '🕹️', n: 'Arcade Kid', test: s => s.stats.gamesPlayed >= 5 },
  { id: 'collector', e: '🗂️', n: 'Curator', test: s => (s.collections || []).reduce((a, c) => a + c.items.length, 0) >= 20 },
];
export function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!S.achievements.includes(a.id) && a.test(S)) {
      S.achievements.push(a.id);
      setTimeout(() => { toast(`${a.e} achievement: ${a.n}`, 'xp'); confetti(); }, 900);
    }
  }
}

// ---------- confetti ----------
export function confetti() {
  const cv = document.getElementById('confetti');
  const ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ['#ff6b35', '#ffb347', '#4a8fd9', '#4caf7d', '#e88bb5', '#9b7ede'];
  const bits = Array.from({ length: 90 }, () => ({
    x: Math.random() * cv.width, y: -20 - Math.random() * 80,
    vx: (Math.random() - .5) * 3, vy: 2.5 + Math.random() * 3.5,
    s: 4 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.r += b.vr;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
      ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * .6);
      ctx.restore();
    }
    if (++frames < 130) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  })();
}

// ---------- streak helper ----------
export function calcStreak(doneMap, isComplete) {
  // doneMap: {dateKey: ...}; isComplete(dateKey) -> bool. counts back from today (today optional)
  let streak = 0;
  for (let i = 0; i < 999; i++) {
    const k = daysAgoKey(i);
    if (isComplete(k)) streak++;
    else if (i === 0) continue;    // today not done yet doesn't break it
    else break;
  }
  return streak;
}
