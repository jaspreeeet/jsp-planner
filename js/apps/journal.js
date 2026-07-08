/* ═══════════ BULLET JOURNAL — rapid logging, real bujo signifiers ═══════════ */
import { S, save, todayKey, esc, el, addXP, uid, daysAgoKey, emit } from '../core.js';

const SIGS = {
  task: { sym: '•', label: 'task' },
  event: { sym: '○', label: 'event' },
  note: { sym: '–', label: 'note' },
  star: { sym: '★', label: 'priority' },
  idea: { sym: '!', label: 'idea' },
  grateful: { sym: '♡', label: 'grateful' },
};

export default {
  id: 'journal', name: 'Journal', icon: '✎', w: 540, h: 680,
  render(ctx, params) {
    const { body } = ctx;
    const view = (params && params.view) || 'daily';

    body.appendChild(el(`
      <div><div class="serif-h">bullet journal</div>
      <div class="pixel-sub">rapid log · ${Object.values(SIGS).map(s => s.sym + ' ' + s.label).join(' · ')}</div></div>`));

    const tabs = el(`
      <div class="tabs" style="margin-top:12px">
        <button data-v="daily" class="${view === 'daily' ? 'on' : ''}">daily log</button>
        <button data-v="week" class="${view === 'week' ? 'on' : ''}">past 7 days</button>
        <button data-v="stars" class="${view === 'stars' ? 'on' : ''}">★ highlights</button>
      </div>`);
    tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => ctx.refresh({ view: b.dataset.v })));
    body.appendChild(tabs);

    const feed = el(`<div style="min-height:120px"></div>`);
    body.appendChild(feed);

    const renderEntry = (e2, showDate) => {
      const row = el(`
        <div class="bujo-line">
          <span class="bujo-sig" title="tap: toggle done">${e2.done && e2.sig === 'task' ? '×' : SIGS[e2.sig]?.sym || '–'}</span>
          <span class="bujo-txt ${e2.done ? 'done' : ''}">${esc(e2.text)}${showDate ? ` <span class="muted" style="font-size:11px">· ${e2.dateKey.slice(5)}</span>` : ''}</span>
          <button class="r-x">×</button>
        </div>`);
      row.querySelector('.bujo-sig').addEventListener('click', () => {
        if (e2.sig === 'task') { e2.done = !e2.done; if (e2.done) addXP(6, 'bujo task'); }
        save(); ctx.refresh({ view });
      });
      row.querySelector('.r-x').addEventListener('click', () => {
        S.journal = S.journal.filter(x => x.id !== e2.id); save(); ctx.refresh({ view });
      });
      return row;
    };

    if (view === 'daily') {
      const entries = S.journal.filter(e2 => e2.dateKey === todayKey());
      if (!entries.length) feed.appendChild(el(`
        <div class="empty"><div class="e-art">✒️</div>
        <div class="e-serif">fresh page</div>
        <div class="e-sub">one line is enough. what's on your mind, what happened, what are you grateful for?</div></div>`));
      entries.forEach(e2 => feed.appendChild(renderEntry(e2)));
    } else if (view === 'week') {
      for (let i = 0; i < 7; i++) {
        const k = daysAgoKey(i);
        const entries = S.journal.filter(e2 => e2.dateKey === k);
        if (!entries.length) continue;
        const d = new Date(k + 'T12:00:00');
        feed.appendChild(el(`<div class="bujo-date-h">${i === 0 ? 'today' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</div>`));
        entries.forEach(e2 => feed.appendChild(renderEntry(e2)));
      }
      if (!feed.children.length) feed.appendChild(el(`<div class="empty"><div class="e-serif">quiet week in the log</div></div>`));
    } else {
      const stars = S.journal.filter(e2 => e2.sig === 'star' || e2.sig === 'grateful');
      if (!stars.length) feed.appendChild(el(`<div class="empty"><div class="e-art">★</div><div class="e-serif">no highlights yet</div><div class="e-sub">mark entries with ★ or ♡ and they collect here — your personal museum.</div></div>`));
      stars.slice().reverse().forEach(e2 => feed.appendChild(renderEntry(e2, true)));
    }

    // input row (daily only)
    if (view === 'daily') {
      let sig = 'task';
      const inputRow = el(`
        <div class="bujo-input-row">
          <div class="sig-picker">${Object.entries(SIGS).map(([k, v], i) =>
            `<button data-sig="${k}" class="${i === 0 ? 'on' : ''}" title="${v.label}">${v.sym}</button>`).join('')}</div>
          <input type="text" id="bujo-in" placeholder="rapid log…" style="flex:1">
        </div>`);
      inputRow.querySelectorAll('[data-sig]').forEach(b => b.addEventListener('click', () => {
        sig = b.dataset.sig;
        inputRow.querySelectorAll('[data-sig]').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        inputRow.querySelector('#bujo-in').focus();
      }));
      const input = inputRow.querySelector('#bujo-in');
      input.addEventListener('keydown', ev => {
        if (ev.key !== 'Enter') return;
        const text = input.value.trim();
        if (!text) return;
        S.journal.push({ id: uid(), sig, text, dateKey: todayKey(), done: false, ts: Date.now() });
        S.stats.journalEntries++;
        addXP(4, 'logged');
        save(); emit('data'); ctx.refresh({ view });
      });
      body.appendChild(inputRow);
      setTimeout(() => input.focus(), 60);
    }
  },
};
