/* ═══════════ HABITS — don't break the chain ═══════════ */
import { S, save, todayKey, daysAgoKey, esc, el, uid, addXP, toast, emit, habitStreak } from '../core.js';
import { modal, confirmModal } from '../wm.js';

const PRESETS = [
  { name: 'Shower', emoji: '🚿' }, { name: 'Meds on time', emoji: '💊' },
  { name: 'Study session', emoji: '📚' }, { name: 'Touch grass', emoji: '🌿' },
  { name: 'Sleep before 12', emoji: '🌙' }, { name: 'Move your body', emoji: '🏃' },
];

function bestStreak(h) {
  // longest run in history
  const keys = Object.keys(h.done || {}).sort();
  if (!keys.length) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1] + 'T12:00:00');
    prev.setDate(prev.getDate() + 1);
    if (todayKey(prev) === keys[i]) { run++; best = Math.max(best, run); }
    else run = 1;
  }
  return best;
}

function habitForm(existing, onSave) {
  const h = existing || { name: '', emoji: '🔥' };
  modal({
    title: existing ? '🔥 edit habit' : '🔥 new chain',
    bodyHTML: `
      <div class="two-col">
        <div><label class="fld">emoji</label><input type="text" id="hf-emoji" maxlength="4" value="${esc(h.emoji)}"></div>
        <div><label class="fld">habit — keep it tiny & daily</label><input type="text" id="hf-name" value="${esc(h.name)}" placeholder="e.g. 10 pages"></div>
      </div>`,
    actions: [
      { label: 'cancel', cls: 'ghost' },
      {
        label: 'start the chain', cls: 'primary',
        onClick(sheet) {
          const name = sheet.querySelector('#hf-name').value.trim();
          if (!name) { toast('name the habit!'); return false; }
          h.name = name;
          h.emoji = sheet.querySelector('#hf-emoji').value.trim() || '🔥';
          onSave(h);
        },
      },
    ],
  });
}

export default {
  id: 'habits', name: 'Chains', icon: '🔥', w: 540, h: 660,
  badge() { const tk = todayKey(); return (S.habits || []).filter(h => !(h.done && h.done[tk])).length ? 0 : 0; },
  render(ctx) {
    const { body } = ctx;
    const tk = todayKey();
    body.appendChild(el(`
      <div><div class="serif-h">chains</div>
      <div class="pixel-sub">show up daily · watch the links stack · don't break it</div></div>`));

    const addRow = el(`<div class="chip-row" style="margin:14px 0"></div>`);
    const newBtn = el(`<button class="btn primary small">+ new chain</button>`);
    newBtn.addEventListener('click', () => habitForm(null, h => {
      h.id = uid(); h.done = {};
      S.habits.push(h); save(); ctx.refresh();
    }));
    addRow.appendChild(newBtn);
    for (const p of PRESETS) {
      if (S.habits.some(h => h.name === p.name)) continue;
      const c = el(`<button class="chip">+ ${p.emoji} ${p.name}</button>`);
      c.addEventListener('click', () => {
        S.habits.push({ id: uid(), ...p, done: {} }); save(); ctx.refresh();
      });
      addRow.appendChild(c);
    }
    body.appendChild(addRow);

    if (!S.habits.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">⛓</div>
        <div class="e-serif">no chains yet</div>
        <div class="e-sub">pick one tiny thing to do daily. every day you do it, a link is forged. the chain does the motivating.</div></div>`));
      return;
    }

    for (const h of S.habits) {
      const on = h.done && h.done[tk];
      const streak = habitStreak(h);
      const best = bestStreak(h);
      const total = Object.keys(h.done || {}).length;

      const card = el(`
        <div class="card">
          <div style="display:flex;align-items:center;gap:12px">
            <button class="habit-check ${on ? 'on' : ''}">✓</button>
            <div style="flex:1;min-width:0">
              <div class="card-title" style="margin:0">${h.emoji} ${esc(h.name)}
                <span class="ct-spacer"></span>
                <button class="btn small ghost" data-edit>✎</button>
                <button class="btn small ghost" data-del>🗑</button>
              </div>
              <div class="pixel-sub" style="margin-top:3px">🔥 ${streak} now · 🏆 ${best} best · ${total} total days</div>
            </div>
          </div>
          <div class="chain-strip" data-chain></div>
          <div class="pixel-sub" data-msg style="margin-top:2px"></div>
        </div>`);

      // 14-day chain visual
      const strip = card.querySelector('[data-chain]');
      const days = 14;
      for (let i = days - 1; i >= 0; i--) {
        const k = daysAgoKey(i);
        const done = h.done && h.done[k];
        if (i < days - 1) {
          const prevDone = h.done && h.done[daysAgoKey(i + 1)];
          strip.appendChild(el(`<span class="chain-link ${done && prevDone ? 'on' : ''}"></span>`));
        }
        const cell = el(`<span class="chain-cell ${done ? 'on' : ''} ${i === 0 ? 'today' : ''}" title="${k}"></span>`);
        strip.appendChild(cell);
      }
      const msg = card.querySelector('[data-msg]');
      msg.textContent = on
        ? (streak >= 3 ? `link #${streak} forged. the chain grows ⛓` : 'link forged today ✓')
        : (streak > 1 ? `⚠ ${streak}-day chain on the line — one tap keeps it alive` : 'tap ✓ to forge today\'s link');
      if (!on && streak > 1) msg.style.color = 'var(--red)';

      card.querySelector('.habit-check').addEventListener('click', () => {
        h.done = h.done || {};
        if (h.done[tk]) { delete h.done[tk]; }
        else {
          h.done[tk] = 1;
          const s = habitStreak(h);
          addXP(8 + Math.min(12, s), s > 1 ? `${h.name} · ${s} days!` : h.name);
          if ([7, 14, 30, 50, 100].includes(s)) setTimeout(() => toast(`⛓ ${s}-DAY CHAIN — ${h.name}. unreal.`, 'xp'), 600);
        }
        save(); emit('data'); ctx.refresh();
      });
      card.querySelector('[data-edit]').addEventListener('click', () => habitForm(h, () => { save(); ctx.refresh(); }));
      card.querySelector('[data-del]').addEventListener('click', () =>
        confirmModal('break the chain?', `delete <b>${esc(h.name)}</b> and its ${total} days of history?`, () => {
          S.habits = S.habits.filter(x => x.id !== h.id); save(); ctx.refresh();
        }));
      body.appendChild(card);
    }
    body.appendChild(el(`<p class="muted center" style="margin-top:4px">missed a day? the chain restarts — but your totals never reset. progress is cumulative.</p>`));
  },
};
