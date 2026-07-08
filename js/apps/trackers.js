/* ═══════════ TRACKERS — track anything, get pretty stats ═══════════ */
import { S, save, todayKey, esc, el, addXP, uid, daysAgoKey, toast } from '../core.js';
import { modal, confirmModal } from '../wm.js';

const TYPES = {
  counter: { label: '🔢 counter (taps per day)', hint: 'water, pages, reps…' },
  yesno: { label: '✅ yes / no', hint: 'showered, studied, touched grass…' },
  rating: { label: '⭐ rating 1–5', hint: 'mood, energy, sleep quality…' },
  number: { label: '📏 number', hint: 'weight, hours slept, screen time…' },
};
const PRESETS = [
  { name: 'Water', emoji: '💧', type: 'counter', unit: 'glasses', goal: 8 },
  { name: 'Mood', emoji: '🌈', type: 'rating' },
  { name: 'Sleep', emoji: '😴', type: 'number', unit: 'hrs', goal: 8 },
  { name: 'Study', emoji: '📚', type: 'counter', unit: 'sessions', goal: 3 },
  { name: 'Shower', emoji: '🚿', type: 'yesno' },
  { name: 'Outside', emoji: '🌿', type: 'yesno' },
];

function trackerForm(existing, onSave) {
  const t = existing || { name: '', emoji: '📊', type: 'counter', unit: '', goal: null };
  modal({
    title: existing ? '📊 edit tracker' : '📊 new tracker',
    bodyHTML: `
      <div class="two-col">
        <div><label class="fld">emoji</label><input type="text" id="kf-emoji" value="${esc(t.emoji)}" maxlength="4"></div>
        <div><label class="fld">name</label><input type="text" id="kf-name" value="${esc(t.name)}" placeholder="anything at all"></div>
      </div>
      <label class="fld">type</label>
      <select id="kf-type">${Object.entries(TYPES).map(([k, v]) =>
        `<option value="${k}" ${t.type === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
      <div class="two-col">
        <div><label class="fld">unit (optional)</label><input type="text" id="kf-unit" value="${esc(t.unit || '')}" placeholder="glasses, hrs…"></div>
        <div><label class="fld">daily goal (optional)</label><input type="number" id="kf-goal" value="${t.goal ?? ''}" inputmode="decimal"></div>
      </div>`,
    actions: [
      { label: 'cancel', cls: 'ghost' },
      {
        label: 'save', cls: 'primary',
        onClick(sheet) {
          const name = sheet.querySelector('#kf-name').value.trim();
          if (!name) { toast('name it!'); return false; }
          t.name = name;
          t.emoji = sheet.querySelector('#kf-emoji').value.trim() || '📊';
          t.type = sheet.querySelector('#kf-type').value;
          t.unit = sheet.querySelector('#kf-unit').value.trim();
          const g = parseFloat(sheet.querySelector('#kf-goal').value);
          t.goal = isNaN(g) ? null : g;
          onSave(t);
        },
      },
    ],
  });
}

function drawSpark(cv, vals, goal) {
  const ctx = cv.getContext('2d');
  const W = cv.width = cv.clientWidth * 2, H = cv.height = 72;
  ctx.clearRect(0, 0, W, H);
  const max = Math.max(goal || 0, ...vals, 1);
  const bw = W / vals.length;
  const ink = getComputedStyle(document.body).getPropertyValue('--ink');
  vals.forEach((v, i) => {
    const h = Math.max(3, (v / max) * (H - 8));
    ctx.fillStyle = goal && v >= goal ? '#4caf7d' : '#ff6b35';
    ctx.fillRect(i * bw + 2, H - h, Math.max(2, bw - 5), h);
  });
  if (goal) {
    const gy = H - (goal / max) * (H - 8);
    ctx.strokeStyle = ink; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }
}

function detail(ctx, t) {
  const tk = todayKey();
  const val = t.log[tk] ?? (t.type === 'counter' ? 0 : null);
  modal({
    title: `${t.emoji} ${esc(t.name)}`,
    bodyHTML: `
      <div class="center" style="padding:8px 0 4px">
        <div class="trk-val" style="font-size:52px" id="td-val">${val ?? '–'}</div>
        <div class="trk-unit">${esc(t.unit || '')} today ${t.goal ? `· goal ${t.goal}` : ''}</div>
      </div>
      <div id="td-controls" class="center" style="padding:10px 0"></div>
      <canvas class="spark" id="td-spark" style="height:72px"></canvas>
      <p class="muted center" id="td-stats" style="margin-top:8px"></p>`,
    onMount(sheet) {
      const zone = sheet.querySelector('#td-controls');
      const valEl = sheet.querySelector('#td-val');
      const setVal = v => {
        t.log[tk] = v; save();
        valEl.textContent = v ?? '–';
        if (t.goal && v >= t.goal) addXP(8, `${t.name} goal!`);
        redraw();
      };
      if (t.type === 'counter') {
        const minus = el(`<button class="btn" style="font-size:18px">−</button>`);
        const plus = el(`<button class="btn primary" style="font-size:18px;margin-left:10px">+1</button>`);
        minus.addEventListener('click', () => setVal(Math.max(0, (t.log[tk] || 0) - 1)));
        plus.addEventListener('click', () => { setVal((t.log[tk] || 0) + 1); });
        zone.append(minus, plus);
      } else if (t.type === 'yesno') {
        const yes = el(`<button class="btn green">yes ✓</button>`);
        const no = el(`<button class="btn" style="margin-left:10px">not today</button>`);
        yes.addEventListener('click', () => setVal(1));
        no.addEventListener('click', () => setVal(0));
        zone.append(yes, no);
      } else if (t.type === 'rating') {
        for (let i = 1; i <= 5; i++) {
          const b = el(`<button class="btn small" style="margin:2px">${i}</button>`);
          b.addEventListener('click', () => setVal(i));
          zone.appendChild(b);
        }
      } else {
        const inp = el(`<input type="number" inputmode="decimal" style="width:140px;text-align:center" placeholder="0">`);
        const ok = el(`<button class="btn primary" style="margin-left:8px">log</button>`);
        ok.addEventListener('click', () => { const v = parseFloat(inp.value); if (!isNaN(v)) setVal(v); });
        zone.append(inp, ok);
      }
      const redraw = () => {
        const vals = Array.from({ length: 14 }, (_, i) => t.log[daysAgoKey(13 - i)] ?? 0);
        drawSpark(sheet.querySelector('#td-spark'), vals, t.goal);
        const logged = Object.values(t.log).filter(v => v !== null && v !== undefined);
        const days = Object.keys(t.log).length;
        const avg = logged.length ? (logged.reduce((a, b) => a + b, 0) / logged.length).toFixed(1) : '–';
        sheet.querySelector('#td-stats').textContent = `${days} days logged · average ${avg} · last 14 days above`;
      };
      redraw();
    },
    actions: [
      { label: '🗑', cls: 'ghost', onClick: () => { confirmModal('delete tracker?', `all <b>${esc(t.name)}</b> history will go.`, () => { S.trackers = S.trackers.filter(x => x.id !== t.id); save(); ctx.refresh(); }); } },
      { label: '✎ edit', cls: '', onClick: () => { trackerForm(t, () => { save(); ctx.refresh(); }); } },
      { label: 'done', cls: 'primary', onClick: () => ctx.refresh() },
    ],
  });
}

export default {
  id: 'trackers', name: 'Trackers', icon: '📊', w: 560, h: 660,
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">trackers</div>
      <div class="pixel-sub">if it matters, it gets a graph</div></div>`));

    const addRow = el(`<div class="chip-row" style="margin:14px 0"></div>`);
    const newBtn = el(`<button class="btn primary small">+ track anything</button>`);
    newBtn.addEventListener('click', () => trackerForm(null, t => {
      t.id = uid(); t.log = {};
      S.trackers.push(t); save(); ctx.refresh();
    }));
    addRow.appendChild(newBtn);
    for (const p of PRESETS) {
      if (S.trackers.some(t => t.name === p.name)) continue;
      const c = el(`<button class="chip">+ ${p.emoji} ${p.name}</button>`);
      c.addEventListener('click', () => {
        S.trackers.push({ ...p, id: uid(), log: {} }); save(); ctx.refresh();
      });
      addRow.appendChild(c);
    }
    body.appendChild(addRow);

    if (!S.trackers.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">📊</div>
        <div class="e-serif">track literally anything</div>
        <div class="e-sub">water, mood, jokes told, pages read, times you touched grass. every tracker gets its own chart.</div></div>`));
      return;
    }

    const grid = el(`<div class="trk-grid"></div>`);
    const tk = todayKey();
    for (const t of S.trackers) {
      const v = t.log[tk];
      const disp = t.type === 'yesno' ? (v === 1 ? '✓' : v === 0 ? '✗' : '–') : (v ?? '–');
      const card = el(`
        <div class="trk-card">
          <span class="trk-emoji">${t.emoji}</span>
          <div class="trk-name">${esc(t.name)}</div>
          <span class="trk-val">${disp}</span>
          <span class="trk-unit">${esc(t.unit || '')}${t.goal ? ' / ' + t.goal : ''}</span>
          <canvas class="spark"></canvas>
        </div>`);
      card.addEventListener('click', () => detail(ctx, t));
      grid.appendChild(card);
      requestAnimationFrame(() => {
        const vals = Array.from({ length: 14 }, (_, i) => t.log[daysAgoKey(13 - i)] ?? 0);
        drawSpark(card.querySelector('.spark'), vals, t.goal);
      });
    }
    body.appendChild(grid);
  },
};
