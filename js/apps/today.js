/* ═══════════ TODAY v2 — the day, at a glance, beautiful ═══════════ */
import { S, save, todayKey, fmtTime, esc, el, addXP, toast, emit, uid, daysAgoKey, habitStreak } from '../core.js';
import { openApp } from '../wm.js';
import { nextEvent, daysUntil } from './events.js';
import { mixtapeInfo, mixtapeToggle } from './mixtape.js';

const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

function medsDue() {
  const tk = todayKey(); const out = [];
  for (const m of S.meds) {
    const taken = (m.taken && m.taken[tk]) || [];
    for (const t of m.times) if (!taken.includes(t)) out.push({ kind: 'med', med: m, time: t });
  }
  return out;
}
function timeline() {
  const tk = todayKey();
  const items = [...medsDue()];
  for (const t of S.tasks.filter(t => t.dateKey === tk && !t.done && t.time)) items.push({ kind: 'task', task: t, time: t.time });
  for (const e2 of (S.calendarEvents || []).filter(e2 => e2.date === tk)) items.push({ kind: 'ics', title: e2.title, time: e2.time || '00:00' });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}
function greet() {
  const h = new Date().getHours();
  if (h < 5) return 'quiet hours, night owl';
  if (h < 12) return 'good morning, sunshine';
  if (h < 17) return 'good afternoon';
  if (h < 22) return 'good evening';
  return 'winding down';
}
function focusPick() {
  const now = nowHM();
  const overdue = timeline().filter(i => i.time <= now);
  if (overdue.length) {
    const i = overdue[0];
    if (i.kind === 'med') return { k: 'overdue', t: `take ${i.med.name}`, s: `was due ${fmtTime(i.time)} — future-you says thanks`, act: 'open meds →', app: 'meds' };
    if (i.kind === 'task') return { k: 'now', t: i.task.text, s: `planned for ${fmtTime(i.time)}`, act: 'open plan →', app: 'planner' };
    return { k: 'happening', t: i.title, s: `at ${fmtTime(i.time)} · from your calendar`, act: 'calendar →', app: 'calendar' };
  }
  const anyTask = S.tasks.find(t => t.dateKey === todayKey() && !t.done);
  if (anyTask) return { k: 'one thing', t: anyTask.text, s: 'just this. nothing else exists.', act: 'start 5-min timer →', app: 'unstuck' };
  const soon = timeline()[0];
  if (soon) return { k: 'coming up', t: soon.kind === 'med' ? soon.med.name : (soon.task?.text || soon.title), s: `at ${fmtTime(soon.time)} · until then, you're free`, act: 'see the day →', app: 'calendar' };
  return { k: 'all clear', t: 'nothing is chasing you', s: 'romanticise something. or do absolutely nothing, beautifully.', act: 'press play →', app: 'mixtape' };
}

let tick = null;

export default {
  id: 'today', name: 'Today', icon: '☀', w: 580, h: 720,
  badge() { const n = nowHM(); return medsDue().filter(d => d.time <= n).length; },
  onClose() { clearInterval(tick); },
  render(ctx) {
    clearInterval(tick);
    const { body } = ctx;
    const tk = todayKey();
    const due = medsDue();
    const tasksLeft = S.tasks.filter(t => t.dateKey === tk && !t.done);
    const doneToday = S.tasks.filter(t => t.dateKey === tk && t.done).length;

    /* hero: live clock + greeting */
    const hero = el(`
      <div class="t2-hero">
        <div class="t2-time" data-clock>00:00</div>
        <div class="t2-hero-right">
          <div class="t2-greet">${greet()}${S.settings.greetName ? ', ' + esc(S.settings.greetName) : ''}</div>
          <div class="t2-date">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </div>`);
    body.appendChild(hero);

    const prog = el(`
      <div class="day-progress">
        <span>the day</span>
        <div class="pbar"><i data-dayb style="width:0%"></i></div>
        <span data-dayl></span>
      </div>`);
    body.appendChild(prog);

    const paintClock = () => {
      const d = new Date();
      const clockEl = hero.querySelector('[data-clock]');
      if (!clockEl) { clearInterval(tick); return; }
      clockEl.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      const start = 7, end = 23;
      const frac = Math.min(1, Math.max(0, (d.getHours() + d.getMinutes() / 60 - start) / (end - start)));
      prog.querySelector('[data-dayb]').style.width = Math.round(frac * 100) + '%';
      prog.querySelector('[data-dayl]').textContent = frac >= 1 ? 'rest now' : `${Math.round((1 - frac) * (end - start))}h left`;
    };
    paintClock();
    tick = setInterval(paintClock, 20000);

    /* focus card */
    const f = focusPick();
    const fc = el(`
      <div class="focus-card">
        <div class="fc-k">◆ ${f.k}</div>
        <div class="fc-t">${esc(f.t)}</div>
        <div class="fc-s">${esc(f.s)}</div>
        <span class="fc-act">${f.act}</span>
      </div>`);
    fc.addEventListener('click', () => openApp(f.app));
    body.appendChild(fc);

    /* stat chips */
    const bestChain = Math.max(0, ...(S.habits || []).map(habitStreak));
    const ne = nextEvent();
    const chips = el(`<div class="t2-chips"></div>`);
    const chipDefs = [
      [due.length, 'meds due', 'meds'],
      [tasksLeft.length, 'to do', 'planner'],
      [doneToday, 'done ✓', 'planner'],
      [bestChain ? bestChain + '🔥' : '—', 'best chain', 'habits'],
      ['+' + S.xp.today, 'xp today', 'stats'],
      ...(ne ? [[daysUntil(ne.date) + 'd', ne.emoji + ' ' + (ne.name.length > 9 ? ne.name.slice(0, 9) + '…' : ne.name), 'events']] : []),
    ];
    for (const [n, l, app] of chipDefs) {
      const c = el(`<button class="t2-chip"><span class="n">${n}</span><span class="l">${esc(String(l))}</span></button>`);
      c.addEventListener('click', () => openApp(app));
      chips.appendChild(c);
    }
    body.appendChild(chips);

    /* timeline */
    const tl = timeline();
    if (tl.length) {
      body.appendChild(el(`<div class="section-h">the shape of today</div>`));
      const wrap = el(`<div class="timeline"></div>`);
      const now = nowHM();
      for (const item of tl.slice(0, 8)) {
        const late = item.time <= now;
        const label = item.kind === 'med' ? `💊 ${item.med.name}` : item.kind === 'task' ? item.task.text : `📅 ${item.title}`;
        const row = el(`
          <div class="tl-row">
            <span class="tl-time" style="${late ? 'color:var(--red);font-weight:700' : ''}">${fmtTime(item.time)}</span>
            <span class="tl-dot" style="background:${item.kind === 'med' ? (item.med.color || 'var(--pink)') : item.kind === 'task' ? 'var(--blue)' : 'var(--purple)'}"></span>
            <div class="r-main"><div class="r-title" style="font-weight:500;font-size:14px">${esc(label)}</div></div>
            ${item.kind !== 'ics' ? '<button class="pcheck"></button>' : ''}
          </div>`);
        const check = row.querySelector('.pcheck');
        if (check) check.addEventListener('click', () => {
          if (item.kind === 'med') {
            item.med.taken = item.med.taken || {};
            (item.med.taken[tk] = item.med.taken[tk] || []).push(item.time);
            S.stats.medsTaken++; addXP(8, item.med.name);
          } else {
            item.task.done = true; S.stats.tasksDone++; addXP(10, 'task done');
          }
          save(); emit('data'); ctx.refresh();
        });
        wrap.appendChild(row);
      }
      body.appendChild(wrap);
    }

    /* untimed tasks */
    const loose = tasksLeft.filter(t => !t.time);
    if (loose.length) {
      body.appendChild(el(`<div class="section-h">whenever today</div>`));
      for (const t of loose.slice(0, 4)) {
        const row = el(`
          <div class="tl-row">
            <span class="tl-time">·</span>
            <span class="tl-dot" style="background:var(--paper-3)"></span>
            <div class="r-main"><div class="r-title" style="font-weight:500;font-size:14px">${esc(t.text)}</div></div>
            <button class="pcheck"></button>
          </div>`);
        row.querySelector('.pcheck').addEventListener('click', () => {
          t.done = true; S.stats.tasksDone++; addXP(10, 'task done');
          save(); emit('data'); ctx.refresh();
        });
        body.appendChild(row);
      }
      if (loose.length > 4) {
        const more = el(`<button class="btn ghost small wide">+${loose.length - 4} more in the plan →</button>`);
        more.addEventListener('click', () => openApp('planner'));
        body.appendChild(more);
      }
    }
    if (!tl.length && !loose.length) {
      const empty = el(`
        <div class="empty" style="padding:20px">
          <div class="e-serif">a beautifully blank day</div>
          <div class="e-sub">pick 1–3 things, or don't. both are valid.</div>
          <button class="btn primary small">▤ plan something</button>
        </div>`);
      empty.querySelector('.btn').addEventListener('click', () => openApp('planner'));
      body.appendChild(empty);
    }

    /* habit chains — don't break them */
    if ((S.habits || []).length) {
      body.appendChild(el(`<div class="section-h">chains</div>`));
      for (const h of S.habits.slice(0, 3)) {
        const on = h.done && h.done[tk];
        const row = el(`
          <div style="display:flex;align-items:center;gap:10px;padding:5px 0">
            <span style="font-size:17px">${h.emoji}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(h.name)} <span class="streak-flame">${habitStreak(h) > 1 ? '🔥' + habitStreak(h) : ''}</span></div>
              <div class="chain-strip" style="margin:4px 0 0" data-chain></div>
            </div>
            <button class="habit-check ${on ? 'on' : ''}" style="width:40px;height:40px;font-size:18px">✓</button>
          </div>`);
        const strip = row.querySelector('[data-chain]');
        for (let i = 6; i >= 0; i--) {
          const k = daysAgoKey(i);
          const done = h.done && h.done[k];
          if (i < 6) strip.appendChild(el(`<span class="chain-link ${done && h.done[daysAgoKey(i + 1)] ? 'on' : ''}" style="width:7px;height:5px"></span>`));
          strip.appendChild(el(`<span class="chain-cell ${done ? 'on' : ''} ${i === 0 ? 'today' : ''}" style="width:16px;height:16px"></span>`));
        }
        row.querySelector('.habit-check').addEventListener('click', () => {
          h.done = h.done || {};
          if (h.done[tk]) delete h.done[tk];
          else { h.done[tk] = 1; addXP(8, h.name); }
          save(); emit('data'); ctx.refresh();
        });
        body.appendChild(row);
      }
    }

    /* mood one-tap */
    body.appendChild(el(`<div class="section-h">mood check</div>`));
    let mood = S.trackers.find(t => t.type === 'rating' && /mood/i.test(t.name));
    const moodVal = mood ? mood.log[tk] : null;
    const moodRow = el(`
      <div class="mood-row">
        ${['😖', '😕', '😐', '🙂', '🤩'].map((e2, i) =>
          `<button data-v="${i + 1}" class="${moodVal === i + 1 ? 'on' : ''}">${e2}</button>`).join('')}
      </div>`);
    moodRow.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      if (!mood) { mood = { id: uid(), name: 'Mood', emoji: '🌈', type: 'rating', unit: '', goal: null, log: {} }; S.trackers.push(mood); }
      mood.log[tk] = Number(b.dataset.v);
      addXP(4, 'mood logged');
      save(); ctx.refresh();
    }));
    body.appendChild(moodRow);

    /* mini grid: vibes & inbox */
    const mi = mixtapeInfo();
    const wc = S.settings.weatherCache;
    const grid = el(`<div class="t2-row2" style="margin-top:14px"></div>`);
    const minis = [
      ['📼 mixtape', mi.playing ? '❚❚ ' + mi.name : '▶ ' + mi.name, () => { mixtapeToggle(); setTimeout(() => ctx.refresh(), 400); }],
      ...(wc ? [['🌤 outside', Math.round(wc.data.current.temperature_2m) + '° right now', () => openApp('weather')]] : [['🌤 outside', 'peek at the sky →', () => openApp('weather')]]),
      ['⚡ inbox', S.inbox.length ? S.inbox.length + ' thought' + (S.inbox.length > 1 ? 's' : '') + ' to sort' : 'empty. brain: calm', () => openApp('unstuck', { tab: 'inbox' })],
      ['✎ journal', 'open today\'s page →', () => openApp('journal')],
    ];
    for (const [k, v, fn] of minis) {
      const m = el(`<button class="t2-mini"><span class="m-k">${k}</span><div class="m-v">${esc(v)}</div></button>`);
      m.addEventListener('click', fn);
      grid.appendChild(m);
    }
    body.appendChild(grid);
  },
};
