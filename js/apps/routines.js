/* ═══════════ ROUTINES — shower, morning, wind-down… autopilot checklists ═══════════ */
import { S, save, todayKey, esc, el, addXP, uid, calcStreak, emit, toast } from '../core.js';
import { modal, confirmModal } from '../wm.js';

const PRESETS = [
  { name: 'Morning launch', emoji: '🌅', steps: ['water first', 'meds', 'face + teeth', 'get dressed', 'one look at Today app'] },
  { name: 'Shower & reset', emoji: '🚿', steps: ['shower', 'skincare', 'fresh clothes', 'hang the towel (yes really)'] },
  { name: 'Study warm-up', emoji: '📚', steps: ['clear desk', 'water bottle', 'phone in another room', 'open ONE subject', 'press play on mixtape'] },
  { name: 'Wind-down', emoji: '🌙', steps: ['tomorrow\'s top 3', 'meds', 'teeth', 'screens away', 'lights low'] },
];

function routineForm(existing, onSave) {
  const r = existing || { name: '', emoji: '✨', steps: [] };
  modal({
    title: existing ? '✨ edit routine' : '✨ new routine',
    bodyHTML: `
      <label class="fld">emoji</label><input type="text" id="rf-emoji" value="${esc(r.emoji)}" maxlength="4" style="width:80px">
      <label class="fld">name</label><input type="text" id="rf-name" value="${esc(r.name)}" placeholder="e.g. Gym prep">
      <label class="fld">steps — one per line, keep them TINY</label>
      <textarea id="rf-steps" rows="6" placeholder="fill water bottle\npack headphones">${esc((r.steps || []).map(s => s.text ?? s).join('\n'))}</textarea>`,
    actions: [
      { label: 'cancel', cls: 'ghost' },
      {
        label: 'save', cls: 'primary',
        onClick(sheet) {
          const name = sheet.querySelector('#rf-name').value.trim();
          if (!name) { toast('needs a name!'); return false; }
          r.name = name;
          r.emoji = sheet.querySelector('#rf-emoji').value.trim() || '✨';
          r.steps = sheet.querySelector('#rf-steps').value.split('\n').map(s => s.trim()).filter(Boolean)
            .map(text => ({ id: uid(), text }));
          onSave(r);
        },
      },
    ],
  });
}

export default {
  id: 'routines', name: 'Routines', icon: '🔁', w: 520, h: 660,
  badge() {
    const tk = todayKey();
    return S.routines.filter(r => r.steps.length && ((r.done && r.done[tk]) || []).length < r.steps.length).length ? 0 : 0;
  },
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">routines</div>
      <div class="pixel-sub">decide once · never re-decide</div></div>`));

    const addRow = el(`<div class="chip-row" style="margin:14px 0"></div>`);
    const newBtn = el(`<button class="btn primary small">+ custom</button>`);
    newBtn.addEventListener('click', () => routineForm(null, r => {
      r.id = uid(); r.done = {};
      S.routines.push(r); save(); ctx.refresh();
    }));
    addRow.appendChild(newBtn);
    for (const p of PRESETS) {
      if (S.routines.some(r => r.name === p.name)) continue;
      const c = el(`<button class="chip">+ ${p.emoji} ${p.name}</button>`);
      c.addEventListener('click', () => {
        S.routines.push({ id: uid(), name: p.name, emoji: p.emoji, done: {}, steps: p.steps.map(text => ({ id: uid(), text })) });
        save(); ctx.refresh(); toast(`${p.emoji} added — tweak it anytime`);
      });
      addRow.appendChild(c);
    }
    body.appendChild(addRow);

    if (!S.routines.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">🔁</div>
        <div class="e-serif">no autopilot yet</div>
        <div class="e-sub">routines turn "ugh, what do I do" into "just follow the list". grab a preset above.</div></div>`));
      return;
    }

    const tk = todayKey();
    for (const r of S.routines) {
      const doneIds = (r.done && r.done[tk]) || [];
      const pct = r.steps.length ? Math.round(doneIds.length / r.steps.length * 100) : 0;
      const streak = calcStreak(r.done || {}, k => {
        const arr = (r.done && r.done[k]) || [];
        return r.steps.length > 0 && arr.length >= r.steps.length;
      });
      const card = el(`
        <div class="card">
          <div class="card-title">${r.emoji} ${esc(r.name)}
            <span class="ct-spacer"></span>
            ${streak > 1 ? `<span class="streak-flame">🔥${streak}</span>` : ''}
            <button class="btn small ghost" data-act="edit">✎</button>
            <button class="btn small ghost" data-act="del">🗑</button>
          </div>
          <div class="pbar" style="margin-bottom:10px"><i style="width:${pct}%"></i></div>
          <div data-steps></div>
        </div>`);
      const zone = card.querySelector('[data-steps]');
      for (const s of r.steps) {
        const on = doneIds.includes(s.id);
        const row = el(`
          <div class="row">
            <button class="pcheck ${on ? 'on' : ''}"></button>
            <div class="r-main"><div class="r-title ${on ? 'done' : ''}" style="font-weight:400">${esc(s.text)}</div></div>
          </div>`);
        row.querySelector('.pcheck').addEventListener('click', () => {
          r.done = r.done || {}; r.done[tk] = r.done[tk] || [];
          if (on) r.done[tk] = r.done[tk].filter(x => x !== s.id);
          else {
            r.done[tk].push(s.id);
            if (r.done[tk].length === r.steps.length) addXP(15, r.name + ' complete!');
            else addXP(2);
          }
          save(); emit('data'); ctx.refresh();
        });
        zone.appendChild(row);
      }
      card.querySelector('[data-act=edit]').addEventListener('click', () =>
        routineForm(r, () => { save(); ctx.refresh(); }));
      card.querySelector('[data-act=del]').addEventListener('click', () =>
        confirmModal('remove?', `delete <b>${esc(r.name)}</b>?`, () => {
          S.routines = S.routines.filter(x => x.id !== r.id); save(); ctx.refresh();
        }));
      body.appendChild(card);
    }
  },
};
