/* ═══════════ CALENDAR — day · week · month, all of life in pixels ═══════════ */
import { S, save, todayKey, fmtTime, esc, el, uid, toast, emit } from '../core.js';
import { modal } from '../wm.js';

const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const COLORS = { task: 'var(--blue)', event: 'var(--red)', ics: 'var(--purple)', outfit: 'var(--pink)', med: 'var(--green)' };

function key(d) { return todayKey(d); }
function shift(dk, days) { const d = new Date(dk + 'T12:00:00'); d.setDate(d.getDate() + days); return key(d); }
function itemsOn(dk) {
  const out = [];
  for (const t of S.tasks.filter(t => t.dateKey === dk)) out.push({ kind: 'task', time: t.time || '', title: t.text, done: t.done, ref: t });
  for (const e2 of S.events.filter(e2 => e2.date === dk)) out.push({ kind: 'event', time: '', title: e2.emoji + ' ' + e2.name });
  for (const c of (S.calendarEvents || []).filter(c => c.date === dk)) out.push({ kind: 'ics', time: c.time || '', title: c.title });
  if (S.outfits[dk]) out.push({ kind: 'outfit', time: '', title: '👗 outfit planned' });
  return out.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

/* ---- minimal .ics import ---- */
function parseICS(text) {
  const events = [];
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  for (const b of blocks.slice(0, 400)) {
    const body = b.split('END:VEVENT')[0];
    const sum = /SUMMARY[^:]*:(.+)/.exec(body);
    const dt = /DTSTART[^:]*:(\d{8})(T(\d{4}))?/.exec(body);
    if (!sum || !dt) continue;
    const date = `${dt[1].slice(0, 4)}-${dt[1].slice(4, 6)}-${dt[1].slice(6, 8)}`;
    const time = dt[3] ? `${dt[3].slice(0, 2)}:${dt[3].slice(2, 4)}` : '';
    events.push({ id: uid(), title: sum[1].trim().replace(/\\,/g, ','), date, time });
  }
  return events;
}

/* ---- full .ics export (meds + tasks + countdowns) ---- */
function exportICS() {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jsp-os//planner//EN', 'X-WR-CALNAME:JSP·OS'];
  const dk = todayKey().replace(/-/g, '');
  for (const m of S.meds) for (const t of m.times) {
    L.push('BEGIN:VEVENT', `UID:med-${m.id}-${t.replace(':', '')}@jsp-os`, `DTSTART:${dk}T${t.replace(':', '')}00`,
      'RRULE:FREQ=DAILY', `SUMMARY:💊 ${m.name}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${m.name}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  }
  for (const t of S.tasks.filter(t => !t.done && t.dateKey >= todayKey())) {
    const d = t.dateKey.replace(/-/g, '');
    if (t.time) L.push('BEGIN:VEVENT', `UID:task-${t.id}@jsp-os`, `DTSTART:${d}T${t.time.replace(':', '')}00`, `SUMMARY:▤ ${t.text}`, 'END:VEVENT');
    else L.push('BEGIN:VEVENT', `UID:task-${t.id}@jsp-os`, `DTSTART;VALUE=DATE:${d}`, `SUMMARY:▤ ${t.text}`, 'END:VEVENT');
  }
  for (const e2 of S.events) {
    L.push('BEGIN:VEVENT', `UID:evt-${e2.id}@jsp-os`, `DTSTART;VALUE=DATE:${e2.date.replace(/-/g, '')}`, `SUMMARY:${e2.emoji} ${e2.name}`, 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar' }));
  a.download = 'jsp-calendar.ics';
  a.click();
}

export default {
  id: 'calendar', name: 'Calendar', icon: '📅', w: 600, h: 700,
  render(ctx, params) {
    const { body } = ctx;
    const view = (params && params.view) || 'month';
    const anchor = (params && params.anchor) || todayKey();
    const go = (v, a) => ctx.refresh({ view: v, anchor: a || anchor });

    body.appendChild(el(`
      <div><div class="serif-h">calendar</div>
      <div class="pixel-sub">tasks · countdowns · outfits · your apple calendar</div></div>`));

    const tabs = el(`
      <div class="tabs" style="margin-top:12px">
        <button data-v="day" class="${view === 'day' ? 'on' : ''}">day</button>
        <button data-v="week" class="${view === 'week' ? 'on' : ''}">week</button>
        <button data-v="month" class="${view === 'month' ? 'on' : ''}">month</button>
      </div>`);
    tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => go(b.dataset.v)));
    body.appendChild(tabs);

    const a = new Date(anchor + 'T12:00:00');
    const step = view === 'day' ? 1 : view === 'week' ? 7 : 0;
    const head = el(`
      <div class="cal-head">
        <button class="btn small" data-n="-1">←</button>
        <div class="cal-title">${view === 'month'
          ? a.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
          : view === 'week'
            ? 'week of ' + a.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : a.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <button class="btn small" data-t>today</button>
        <button class="btn small" data-n="1">→</button>
      </div>`);
    head.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => {
      const dir = Number(b.dataset.n);
      if (view === 'month') { const d = new Date(a); d.setMonth(d.getMonth() + dir, 1); go(view, key(d)); }
      else go(view, shift(anchor, dir * step));
    }));
    head.querySelector('[data-t]').addEventListener('click', () => go(view, todayKey()));
    body.appendChild(head);

    if (view === 'month') renderMonth(ctx, body, a, go);
    else if (view === 'week') renderWeek(ctx, body, anchor, go);
    else renderDay(ctx, body, anchor);

    /* apple calendar bridge */
    body.appendChild(el(`<div class="section-h">apple calendar</div>`));
    const bridge = el(`
      <div class="two-col">
        <button class="btn wide" data-open>📅 open Calendar app</button>
        <button class="btn wide" data-exp>⬆ send my stuff (.ics)</button>
      </div>
      `);
    body.appendChild(bridge);
    const imp = el(`
      <button class="btn wide" style="margin-top:8px" data-imp>⬇ import events (.ics file)</button>`);
    const fileIn = el(`<input type="file" accept=".ics,text/calendar" class="hidden">`);
    bridge.querySelector('[data-open]').addEventListener('click', () => location.href = 'calshow://');
    bridge.querySelector('[data-exp]').addEventListener('click', () => { exportICS(); toast('open the file → adds to Apple Calendar with alarms'); });
    imp.addEventListener('click', () => fileIn.click());
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0];
      if (!f) return;
      const evts = parseICS(await f.text());
      if (!evts.length) { toast('no events found in that file 🤔'); return; }
      const existing = new Set((S.calendarEvents || []).map(e2 => e2.title + e2.date + e2.time));
      let added = 0;
      for (const e2 of evts) if (!existing.has(e2.title + e2.date + e2.time)) { S.calendarEvents.push(e2); added++; }
      save(); emit('data');
      toast(`${added} events imported ✓`);
      ctx.refresh({ view, anchor });
    });
    body.append(imp, fileIn);
    body.appendChild(el(`<p class="muted" style="margin-top:8px">to import: Apple Calendar → File → Export (Mac) or forward a calendar invite file. websites can't read your calendar directly — this bridge is the private way.</p>`));
    if ((S.calendarEvents || []).length) {
      const clr = el(`<button class="btn ghost small wide" style="margin-top:4px">clear ${S.calendarEvents.length} imported events</button>`);
      clr.addEventListener('click', () => { S.calendarEvents = []; save(); ctx.refresh({ view, anchor }); });
      body.appendChild(clr);
    }
  },
};

function renderMonth(ctx, body, a, go) {
  const grid = el(`<div class="cal-grid"></div>`);
  DOW.forEach(d => grid.appendChild(el(`<div class="cal-dow">${d}</div>`)));
  const first = new Date(a.getFullYear(), a.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;   // monday-first
  const start = new Date(first);
  start.setDate(1 - startOffset);
  const tk = todayKey();
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const dk = key(d);
    const inMonth = d.getMonth() === a.getMonth();
    const items = itemsOn(dk);
    const dots = items.slice(0, 4).map(it => `<i style="background:${COLORS[it.kind]}"></i>`).join('');
    const cell = el(`
      <div class="cal-cell ${inMonth ? '' : 'faded'} ${dk === tk ? 'today' : ''}">
        <span class="d">${d.getDate()}</span>
        <span class="cal-dots">${dots}</span>
      </div>`);
    cell.addEventListener('click', () => go('day', dk));
    grid.appendChild(cell);
  }
  body.appendChild(grid);
  body.appendChild(el(`
    <div class="chip-row" style="margin-top:8px">
      ${Object.entries({ task: 'tasks', event: 'countdowns', ics: 'imported', outfit: 'outfits' }).map(([k, v]) =>
        `<span class="tag" style="border-color:transparent;display:inline-flex;align-items:center;gap:4px"><i style="width:6px;height:6px;border-radius:1px;background:${COLORS[k]};display:inline-block"></i>${v}</span>`).join('')}
    </div>`));
}

function renderWeek(ctx, body, anchor, go) {
  const a = new Date(anchor + 'T12:00:00');
  const monday = new Date(a); monday.setDate(a.getDate() - ((a.getDay() + 6) % 7));
  const grid = el(`<div class="cal-week-grid"></div>`);
  const tk = todayKey();
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const dk = key(d);
    const items = itemsOn(dk);
    const col = el(`
      <div class="cal-week-col" style="${dk === tk ? 'border-color:var(--accent);border-style:solid' : ''}">
        <div class="cal-dow" style="text-align:left">${DOW[i]} <b style="font-family:var(--mono);font-size:13px">${d.getDate()}</b></div>
        ${items.slice(0, 4).map(it => `<div class="cal-evt" style="border-left:4px solid ${COLORS[it.kind]};${it.done ? 'opacity:.4;text-decoration:line-through' : ''}">${esc(it.title)}</div>`).join('')}
        ${items.length > 4 ? `<div class="pixel-sub" style="margin-top:3px">+${items.length - 4}</div>` : ''}
      </div>`);
    col.addEventListener('click', () => go('day', dk));
    grid.appendChild(col);
  }
  body.appendChild(grid);
}

function renderDay(ctx, body, anchor) {
  const items = itemsOn(anchor);
  const tk = todayKey();
  // meds schedule shown for today/future
  if (anchor >= tk && S.meds.length) {
    for (const m of S.meds) for (const t of m.times) items.push({ kind: 'med', time: t, title: '💊 ' + m.name });
    items.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  }
  if (!items.length) {
    body.appendChild(el(`<div class="empty"><div class="e-art">🌤</div><div class="e-serif">nothing on this day</div><div class="e-sub">gloriously unclaimed. keep it — or plan one thing below.</div></div>`));
  } else {
    for (const it of items) {
      const row = el(`
        <div class="tl-row">
          <span class="tl-time">${it.time ? fmtTime(it.time) : '·'}</span>
          <span class="tl-dot" style="background:${COLORS[it.kind]}"></span>
          <div class="r-main"><div class="r-title ${it.done ? 'done' : ''}" style="font-weight:500;font-size:14px">${esc(it.title)}</div></div>
          ${it.kind === 'task' && !it.done ? '<button class="pcheck"></button>' : ''}
        </div>`);
      const chk = row.querySelector('.pcheck');
      if (chk) chk.addEventListener('click', () => {
        it.ref.done = true; S.stats.tasksDone++; save(); emit('data'); ctx.refresh({ view: 'day', anchor });
      });
      body.appendChild(row);
    }
  }
  const add = el(`<button class="btn primary wide" style="margin-top:10px">+ plan something this day</button>`);
  add.addEventListener('click', () => modal({
    title: '▤ new task · ' + anchor,
    bodyHTML: `
      <label class="fld">what</label><input type="text" id="cf-text" placeholder="small & concrete">
      <label class="fld">time (optional)</label><input type="time" id="cf-time">`,
    actions: [
      { label: 'cancel', cls: 'ghost' },
      {
        label: 'plan it', cls: 'primary',
        onClick(sheet) {
          const text = sheet.querySelector('#cf-text').value.trim();
          if (!text) { toast('what\'s the task?'); return false; }
          S.tasks.push({ id: uid(), text, time: sheet.querySelector('#cf-time').value, dateKey: anchor, energy: 'mid', ts: Date.now() });
          save(); emit('data'); ctx.refresh({ view: 'day', anchor });
        },
      },
    ],
  }));
  body.appendChild(add);
}
