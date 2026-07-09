/* ═══════════ CLOCK — a beautiful full-screen timepiece ═══════════ */
import { S, esc, el, todayKey, fmtTime } from '../core.js';

const LINES = [
  'this hour only happens once', 'soft focus, steady hands', 'time is on your side today',
  'no rush. just rhythm.', 'the present is a nice place to sit', 'one thing at a time is fast enough',
];

let zenNode = null, zenTick = null;

function paintZen() {
  if (!zenNode) return;
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  zenNode.querySelector('[data-t]').innerHTML = `${hh}<span class="colon">:</span>${mm}`;
  zenNode.querySelector('[data-d]').textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const frac = Math.min(1, Math.max(0, (d.getHours() + d.getMinutes() / 60 - 7) / 16));
  zenNode.querySelector('[data-p]').style.width = Math.round(frac * 100) + '%';
}

export function openZen() {
  if (zenNode) return;
  zenNode = el(`
    <div class="zen">
      <div class="zen-time" data-t></div>
      <div class="zen-date" data-d></div>
      <div class="zen-sub">“${LINES[new Date().getHours() % LINES.length]}”</div>
      <div class="pbar"><i data-p style="width:0%"></i></div>
      <div class="zen-hint">tap anywhere to return</div>
    </div>`);
  zenNode.addEventListener('click', closeZen);
  document.body.appendChild(zenNode);
  paintZen();
  zenTick = setInterval(paintZen, 5000);
  if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
}
function closeZen() {
  clearInterval(zenTick);
  if (zenNode) { zenNode.remove(); zenNode = null; }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

let winTick = null;

export default {
  id: 'clock', name: 'Clock', icon: '⏰', w: 460, h: 560,
  onClose() { clearInterval(winTick); },
  render(ctx) {
    clearInterval(winTick);
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">clock</div>
      <div class="pixel-sub">the prettiest way to watch time pass</div></div>`));

    const face = el(`
      <div class="card center" style="margin-top:14px;padding:26px 14px">
        <div class="zen-time" style="font-size:64px" data-t></div>
        <div class="pixel-sub" style="margin-top:10px" data-d></div>
        <div class="day-progress" style="margin:16px 8px 0"><span>day</span><div class="pbar"><i data-p style="width:0%"></i></div><span data-l></span></div>
      </div>`);
    body.appendChild(face);

    const paint = () => {
      const d = new Date();
      const t = face.querySelector('[data-t]');
      if (!t) { clearInterval(winTick); return; }
      t.innerHTML = `${String(d.getHours()).padStart(2, '0')}<span class="colon">:</span>${String(d.getMinutes()).padStart(2, '0')}`;
      face.querySelector('[data-d]').textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      const frac = Math.min(1, Math.max(0, (d.getHours() + d.getMinutes() / 60 - 7) / 16));
      face.querySelector('[data-p]').style.width = Math.round(frac * 100) + '%';
      face.querySelector('[data-l]').textContent = frac >= 1 ? 'rest' : Math.round((1 - frac) * 16) + 'h left';
    };
    paint();
    winTick = setInterval(paint, 5000);

    const zenBtn = el(`<button class="btn primary wide" style="margin:4px 0 14px">⛶ enter zen mode — full screen</button>`);
    zenBtn.addEventListener('click', openZen);
    body.appendChild(zenBtn);

    // what's next (glanceable)
    const tk = todayKey();
    const upcoming = [];
    const now = String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0');
    for (const m of S.meds) {
      const taken = (m.taken && m.taken[tk]) || [];
      for (const t of m.times) if (t > now && !taken.includes(t)) upcoming.push({ time: t, label: '💊 ' + m.name });
    }
    for (const t of S.tasks.filter(t => t.dateKey === tk && !t.done && t.time && t.time > now)) upcoming.push({ time: t.time, label: t.text });
    upcoming.sort((a, b) => a.time.localeCompare(b.time));
    if (upcoming.length) {
      body.appendChild(el(`<div class="section-h">later today</div>`));
      for (const u of upcoming.slice(0, 4)) {
        body.appendChild(el(`
          <div class="tl-row"><span class="tl-time">${fmtTime(u.time)}</span>
          <span class="tl-dot" style="background:var(--accent-2)"></span>
          <div class="r-main"><div class="r-title" style="font-weight:500;font-size:14px">${esc(u.label)}</div></div></div>`));
      }
    } else {
      body.appendChild(el(`<p class="muted center">nothing scheduled later — the evening is all yours.</p>`));
    }
  },
};
