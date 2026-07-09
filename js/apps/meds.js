/* ═══════════ MEDS & SUPPLEMENTS — with the WHY front and centre ═══════════ */
import { S, save, todayKey, fmtTime, esc, el, addXP, uid, calcStreak, emit, toast } from '../core.js';
import { modal, confirmModal, openApp } from '../wm.js';
import { aiReady, medFact } from '../ai.js';

const COLORS = ['#ff6b35', '#4a8fd9', '#4caf7d', '#9b7ede', '#e88bb5', '#ffb347', '#e05252'];

function medForm(existing, onSave) {
  const m = existing || { name: '', dose: '', why: '', kind: 'med', times: ['09:00'], color: COLORS[0] };
  modal({
    title: existing ? '💊 edit' : '💊 new med / supplement',
    bodyHTML: `
      <label class="fld">name</label><input type="text" id="mf-name" value="${esc(m.name)}" placeholder="e.g. Vitamin D3">
      <label class="fld">dose</label><input type="text" id="mf-dose" value="${esc(m.dose)}" placeholder="e.g. 1 tablet · 1000 IU">
      <label class="fld">why i absolutely take this</label>
      <textarea id="mf-why" rows="2" placeholder="future-you's reason to not skip it…">${esc(m.why)}</textarea>
      <label class="fld">times (comma separated, 24h)</label>
      <input type="text" id="mf-times" value="${esc(m.times.join(', '))}" placeholder="09:00, 21:00">
      <label class="fld">colour</label>
      <div class="chip-row" id="mf-colors">${COLORS.map(c =>
        `<button class="chip" data-c="${c}" style="background:${c};width:34px;border-color:${c === m.color ? 'var(--ink)' : 'transparent'}">&nbsp;</button>`).join('')}</div>`,
    onMount(sheet) {
      sheet.querySelectorAll('#mf-colors .chip').forEach(b => b.addEventListener('click', () => {
        m.color = b.dataset.c;
        sheet.querySelectorAll('#mf-colors .chip').forEach(x => x.style.borderColor = 'transparent');
        b.style.borderColor = 'var(--ink)';
      }));
    },
    actions: [
      { label: 'cancel', cls: 'ghost' },
      {
        label: 'save', cls: 'primary',
        onClick(sheet) {
          const name = sheet.querySelector('#mf-name').value.trim();
          if (!name) { toast('needs a name!'); return false; }
          m.name = name;
          m.dose = sheet.querySelector('#mf-dose').value.trim();
          m.why = sheet.querySelector('#mf-why').value.trim();
          m.times = sheet.querySelector('#mf-times').value.split(',').map(s => s.trim()).filter(s => /^\d{1,2}:\d{2}$/.test(s));
          if (!m.times.length) m.times = ['09:00'];
          m.times = m.times.map(t => t.padStart(5, '0')).sort();
          onSave(m);
        },
      },
    ],
  });
}

export default {
  id: 'meds', name: 'Meds', icon: '💊', w: 520, h: 660,
  badge() {
    const tk = todayKey(); const now = new Date();
    const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    let n = 0;
    for (const m of S.meds) {
      const taken = (m.taken && m.taken[tk]) || [];
      n += m.times.filter(t => t <= hm && !taken.includes(t)).length;
    }
    return n;
  },
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">meds & supplements</div>
      <div class="pixel-sub">tiny rituals, big payoffs</div></div>`));

    const addBtn = el(`<button class="btn primary wide" style="margin:14px 0">+ add med or supplement</button>`);
    addBtn.addEventListener('click', () => medForm(null, m => {
      m.id = uid(); m.taken = {};
      S.meds.push(m); save(); emit('data'); ctx.refresh();
      addXP(5, 'new ritual');
    }));
    body.appendChild(addBtn);

    if (!S.meds.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">💊</div>
        <div class="e-serif">nothing here yet</div>
        <div class="e-sub">add your meds & supplements once — I'll remember the schedule and the <i>why</i>, forever.</div></div>`));
      return;
    }

    const tk = todayKey();
    for (const m of S.meds) {
      const taken = (m.taken && m.taken[tk]) || [];
      const streak = calcStreak(m.taken || {}, k => {
        const arr = (m.taken && m.taken[k]) || [];
        return m.times.every(t => arr.includes(t));
      });
      const card = el(`
        <div class="card">
          <div class="card-title">
            <span class="med-dot" style="background:${m.color}"></span>
            ${esc(m.name)} <span class="muted" style="font-weight:400">${esc(m.dose || '')}</span>
            <span class="ct-spacer"></span>
            ${streak > 1 ? `<span class="streak-flame">🔥${streak}</span>` : ''}
            <button class="btn small ghost" data-act="fact" title="fun fact from claude">✨</button>
            <button class="btn small ghost" data-act="edit">✎</button>
            <button class="btn small ghost" data-act="del">🗑</button>
          </div>
          <div class="chip-row" data-times></div>
          ${m.why ? `<div class="why-box">“${esc(m.why)}”</div>` : ''}
        </div>`);
      const timesZone = card.querySelector('[data-times]');
      for (const t of m.times) {
        const isTaken = taken.includes(t);
        const c = el(`<button class="chip ${isTaken ? 'on' : ''}">${isTaken ? '✓ ' : ''}${fmtTime(t)}</button>`);
        c.addEventListener('click', () => {
          m.taken = m.taken || {}; m.taken[tk] = m.taken[tk] || [];
          if (isTaken) { m.taken[tk] = m.taken[tk].filter(x => x !== t); }
          else { m.taken[tk].push(t); S.stats.medsTaken++; addXP(8, m.name); }
          save(); emit('data'); ctx.refresh();
        });
        timesZone.appendChild(c);
      }
      card.querySelector('[data-act=fact]').addEventListener('click', () => {
        if (!aiReady()) { toast('add your API key in Sync → claude brain first 🔮'); openApp('sync'); return; }
        modal({
          title: `✨ about ${esc(m.name)}`,
          bodyHTML: `<div class="affirm" data-fact style="font-size:17px">consulting the oracle…</div>`,
          onMount(sheet) {
            medFact(m).then(t => { const n = sheet.querySelector('[data-fact]'); if (n) n.textContent = '“' + t + '”'; })
              .catch(e2 => { const n = sheet.querySelector('[data-fact]'); if (n) n.textContent = '✦ ' + e2.message; });
          },
        });
      });
      card.querySelector('[data-act=edit]').addEventListener('click', () =>
        medForm(m, () => { save(); emit('data'); ctx.refresh(); }));
      card.querySelector('[data-act=del]').addEventListener('click', () =>
        confirmModal('remove?', `stop tracking <b>${esc(m.name)}</b>? history goes too.`, () => {
          S.meds = S.meds.filter(x => x.id !== m.id); save(); emit('data'); ctx.refresh();
        }));
      body.appendChild(card);
    }

    body.appendChild(el(`<p class="muted center" style="margin-top:6px">tip: the <b>sync</b> app can export these as native iPhone reminders (.ics)</p>`));
  },
};
