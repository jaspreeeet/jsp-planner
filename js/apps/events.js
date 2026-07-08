/* ═══════════ COUNTDOWNS — because time is invisible until it isn't ═══════════ */
import { S, save, todayKey, esc, el, uid, toast, emit } from '../core.js';
import { modal, confirmModal } from '../wm.js';

export function daysUntil(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  const now = new Date(todayKey() + 'T00:00:00');
  return Math.round((d - now) / 86400000);
}
export function nextEvent() {
  const up = S.events.filter(e2 => daysUntil(e2.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  return up[0] || null;
}

function eventForm(existing, onSave) {
  const ev = existing || { name: '', emoji: '🎯', date: todayKey() };
  modal({
    title: existing ? '⏳ edit countdown' : '⏳ new countdown',
    bodyHTML: `
      <div class="two-col">
        <div><label class="fld">emoji</label><input type="text" id="ef-emoji" maxlength="4" value="${esc(ev.emoji)}"></div>
        <div><label class="fld">what</label><input type="text" id="ef-name" value="${esc(ev.name)}" placeholder="chem exam, trip, birthday…"></div>
      </div>
      <label class="fld">when</label><input type="date" id="ef-date" value="${ev.date}">`,
    actions: [
      { label: 'cancel', cls: 'ghost' },
      {
        label: 'save', cls: 'primary',
        onClick(sheet) {
          const name = sheet.querySelector('#ef-name').value.trim();
          const date = sheet.querySelector('#ef-date').value;
          if (!name || !date) { toast('needs a name and a date'); return false; }
          ev.name = name; ev.date = date;
          ev.emoji = sheet.querySelector('#ef-emoji').value.trim() || '🎯';
          onSave(ev);
        },
      },
    ],
  });
}

export default {
  id: 'events', name: 'Countdown', icon: '⏳', w: 500, h: 620,
  badge() { return S.events.filter(e2 => { const d = daysUntil(e2.date); return d >= 0 && d <= 2; }).length; },
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">countdowns</div>
      <div class="pixel-sub">making time visible since right now</div></div>`));

    const add = el(`<button class="btn primary wide" style="margin:14px 0">+ count down to something</button>`);
    add.addEventListener('click', () => eventForm(null, ev => {
      ev.id = uid(); S.events.push(ev); save(); emit('data'); ctx.refresh();
    }));
    body.appendChild(add);

    const upcoming = S.events.filter(e2 => daysUntil(e2.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
    const past = S.events.filter(e2 => daysUntil(e2.date) < 0);

    if (!S.events.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">⏳</div>
        <div class="e-serif">nothing on the horizon?</div>
        <div class="e-sub">exams, deadlines, trips, birthdays — countdowns defeat time-blindness. add one ↑</div></div>`));
      return;
    }

    for (const ev of upcoming) {
      const d = daysUntil(ev.date);
      const urgent = d <= 3;
      const card = el(`
        <div class="card" style="${urgent ? 'border-color:var(--red)' : ''}">
          <div style="display:flex;align-items:center;gap:14px">
            <span style="font-size:30px">${ev.emoji}</span>
            <div style="flex:1">
              <div class="r-title">${esc(ev.name)}</div>
              <div class="r-sub">${new Date(ev.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}</div>
            </div>
            <div class="center">
              <div class="trk-val" style="font-size:36px;color:${urgent ? 'var(--red)' : 'var(--accent)'}">${d === 0 ? '🎉' : d}</div>
              <div class="pixel-sub">${d === 0 ? 'today!' : d === 1 ? 'day left' : 'days left'}</div>
            </div>
            <button class="r-x" data-edit>✎</button>
            <button class="r-x" data-del>×</button>
          </div>
        </div>`);
      card.querySelector('[data-edit]').addEventListener('click', () => eventForm(ev, () => { save(); emit('data'); ctx.refresh(); }));
      card.querySelector('[data-del]').addEventListener('click', () =>
        confirmModal('remove?', `stop counting down to <b>${esc(ev.name)}</b>?`, () => {
          S.events = S.events.filter(x => x.id !== ev.id); save(); emit('data'); ctx.refresh();
        }));
      body.appendChild(card);
    }

    if (past.length) {
      body.appendChild(el(`<div class="section-h">🗄 in the past</div>`));
      for (const ev of past) {
        const row = el(`
          <div class="row"><span>${ev.emoji}</span>
          <div class="r-main"><div class="r-title done">${esc(ev.name)}</div></div>
          <span class="r-meta">${-daysUntil(ev.date)}d ago</span>
          <button class="r-x">×</button></div>`);
        row.querySelector('.r-x').addEventListener('click', () => {
          S.events = S.events.filter(x => x.id !== ev.id); save(); ctx.refresh();
        });
        body.appendChild(row);
      }
    }
  },
};
