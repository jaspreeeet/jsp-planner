/* ═══════════ TODAY — everything due, one calm place ═══════════ */
import { S, save, todayKey, fmtTime, esc, el, addXP, toast, emit } from '../core.js';
import { openApp } from '../wm.js';
import { nextEvent, daysUntil } from './events.js';

function medsDue() {
  const tk = todayKey();
  const out = [];
  for (const m of S.meds) {
    const taken = (m.taken && m.taken[tk]) || [];
    for (const t of m.times) if (!taken.includes(t)) out.push({ med: m, time: t });
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}
function tasksToday() { return S.tasks.filter(t => t.dateKey === todayKey() && !t.done); }
function nowHM() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

function nextUp() {
  const now = nowHM();
  const due = medsDue().filter(d => d.time <= now);
  if (due.length) return { k: 'med overdue', t: `take ${due[0].med.name}`, s: `was due ${fmtTime(due[0].time)} · tap to open meds`, app: 'meds' };
  const tasks = tasksToday().sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  if (tasks.length) return { k: 'next task', t: tasks[0].text, s: tasks[0].time ? `at ${fmtTime(tasks[0].time)} · tap to plan` : 'whenever you\'re ready · tap to plan', app: 'planner' };
  const soon = medsDue();
  if (soon.length) return { k: 'coming up', t: `${soon[0].med.name} at ${fmtTime(soon[0].time)}`, s: 'nothing else pending. breathe.', app: 'meds' };
  return { k: 'all clear', t: 'nothing is chasing you', s: 'romanticise something · or press play on the mixtape', app: 'mixtape' };
}

export default {
  id: 'today', name: 'Today', icon: '☀', w: 540, h: 680,
  badge() { return medsDue().filter(d => d.time <= nowHM()).length; },
  render(ctx) {
    const { body } = ctx;
    const nu = nextUp();
    const due = medsDue();
    const tasks = tasksToday();
    const doneToday = S.tasks.filter(t => t.dateKey === todayKey() && t.done).length;

    body.appendChild(el(`
      <div class="today-hero">
        <div class="serif-h">today</div>
        <div class="pixel-sub">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} · lv up by living</div>
      </div>`));

    const nuCard = el(`
      <div class="next-up">
        <div class="nu-k">↑ next up</div>
        <div class="nu-t">${esc(nu.t)}</div>
        <div class="nu-s">${esc(nu.s)}</div>
      </div>`);
    nuCard.addEventListener('click', () => openApp(nu.app));
    body.appendChild(nuCard);

    body.appendChild(el(`
      <div class="tiny-stats">
        <div class="tstat"><div class="ts-n">${due.length}</div><div class="ts-l">meds left</div></div>
        <div class="tstat"><div class="ts-n">${tasks.length}</div><div class="ts-l">tasks left</div></div>
        <div class="tstat"><div class="ts-n">${doneToday}</div><div class="ts-l">done ✓</div></div>
      </div>`));

    // nearest countdown — time, made visible
    const ne = nextEvent();
    if (ne) {
      const d = daysUntil(ne.date);
      const evRow = el(`
        <div class="card flat" style="display:flex;align-items:center;gap:10px;cursor:pointer;background:var(--paper-2)">
          <span style="font-size:20px">${ne.emoji}</span>
          <div class="r-main"><div class="r-title" style="font-size:13px">${esc(ne.name)}</div></div>
          <span class="pixel-sub" style="color:${d <= 3 ? 'var(--red)' : 'var(--accent)'}">${d === 0 ? 'TODAY' : d + (d === 1 ? ' day' : ' days')}</span>
        </div>`);
      evRow.addEventListener('click', () => openApp('events'));
      body.appendChild(evRow);
    }

    // meds due
    if (due.length) {
      body.appendChild(el(`<div class="section-h">💊 due today</div>`));
      const list = el(`<div></div>`);
      for (const d of due.slice(0, 5)) {
        const row = el(`
          <div class="row">
            <button class="pcheck"></button>
            <span class="med-dot" style="background:${d.med.color || '#ff6b35'}"></span>
            <div class="r-main"><div class="r-title">${esc(d.med.name)}</div>
            <div class="r-sub">${esc(d.med.dose || '')}</div></div>
            <span class="r-meta">${fmtTime(d.time)}</span>
          </div>`);
        row.querySelector('.pcheck').addEventListener('click', btn => {
          const tk = todayKey();
          d.med.taken = d.med.taken || {};
          (d.med.taken[tk] = d.med.taken[tk] || []).push(d.time);
          S.stats.medsTaken++;
          addXP(8, d.med.name);
          save(); emit('data');
          ctx.refresh();
        });
        list.appendChild(row);
      }
      body.appendChild(list);
    }

    // tasks
    body.appendChild(el(`<div class="section-h">▤ today's plan</div>`));
    if (!tasks.length) {
      body.appendChild(el(`<p class="muted">no tasks planned — tap to <b>plan your day</b> or enjoy the blank space.</p>`)).addEventListener('click', () => openApp('planner'));
    } else {
      const list = el(`<div></div>`);
      for (const t of tasks.slice(0, 6)) {
        const row = el(`
          <div class="row">
            <button class="pcheck"></button>
            <div class="r-main"><div class="r-title">${esc(t.text)}</div></div>
            ${t.time ? `<span class="r-meta">${fmtTime(t.time)}</span>` : ''}
          </div>`);
        row.querySelector('.pcheck').addEventListener('click', () => {
          t.done = true; S.stats.tasksDone++;
          addXP(10, 'task done');
          save(); emit('data'); ctx.refresh();
        });
        list.appendChild(row);
      }
      body.appendChild(list);
    }

    // inbox peek
    if (S.inbox.length) {
      body.appendChild(el(`<div class="section-h">⚡ in your inbox</div>`));
      const peek = el(`<div></div>`);
      for (const item of S.inbox.slice(0, 3)) {
        peek.appendChild(el(`
          <div class="row"><span>${item.tag.split(' ')[0]}</span>
          <div class="r-main"><div class="r-title" style="font-weight:400">${esc(item.text)}</div></div></div>`));
      }
      const more = el(`<button class="btn small wide" style="margin-top:8px">sort my inbox (${S.inbox.length}) →</button>`);
      more.addEventListener('click', () => openApp('unstuck', { tab: 'inbox' }));
      peek.appendChild(more);
      body.appendChild(peek);
    }

    // shortcuts to the rest
    body.appendChild(el(`<div class="section-h">✦ jump to</div>`));
    const jump = el(`<div class="chip-row"></div>`);
    [['🧘 self-care', 'selfcare'], ['✎ journal', 'journal'], ['📊 trackers', 'trackers'], ['🌀 unstuck', 'unstuck'], ['📼 mixtape', 'mixtape']].forEach(([lbl, app]) => {
      const c = el(`<button class="chip">${lbl}</button>`);
      c.addEventListener('click', () => openApp(app));
      jump.appendChild(c);
    });
    body.appendChild(jump);
  },
};
