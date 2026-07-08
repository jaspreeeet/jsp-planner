/* ═══════════ POCKET — where the money went, without the shame ═══════════ */
import { S, save, todayKey, esc, el, uid, toast } from '../core.js';
import { modal } from '../wm.js';

const CATS = [
  ['🍕', 'food'], ['☕', 'coffee'], ['🚕', 'travel'], ['🛍', 'shopping'],
  ['📚', 'study'], ['🎬', 'fun'], ['💊', 'health'], ['✨', 'other'],
];

function monthKey(dk) { return dk.slice(0, 7); }

export default {
  id: 'money', name: 'Pocket', icon: '💸', w: 500, h: 660,
  render(ctx) {
    const { body } = ctx;
    const mk = monthKey(todayKey());
    const entries = S.money.entries.filter(e2 => monthKey(e2.dateKey) === mk);
    const total = entries.reduce((a, b) => a + b.amount, 0);
    const budget = S.money.budget;

    body.appendChild(el(`
      <div><div class="serif-h">pocket</div>
      <div class="pixel-sub">${new Date().toLocaleDateString('en-GB', { month: 'long' })} · no judgement, just data</div></div>`));

    // quick add
    let cat = CATS[0];
    const quick = el(`
      <div class="card" style="margin-top:14px">
        <div style="display:flex;gap:8px">
          <input type="number" id="mo-amt" inputmode="decimal" placeholder="0" style="flex:1;font-family:var(--mono);font-size:24px">
          <button class="btn primary" id="mo-add" style="font-size:16px">+ log</button>
        </div>
        <input type="text" id="mo-note" placeholder="what was it? (optional)" style="margin-top:8px">
        <div class="chip-row" id="mo-cats" style="margin-top:10px"></div>
      </div>`);
    const catZone = quick.querySelector('#mo-cats');
    CATS.forEach((c, i) => {
      const chip = el(`<button class="chip ${i === 0 ? 'on' : ''}">${c[0]} ${c[1]}</button>`);
      chip.addEventListener('click', () => {
        catZone.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
        chip.classList.add('on'); cat = c;
      });
      catZone.appendChild(chip);
    });
    quick.querySelector('#mo-add').addEventListener('click', () => {
      const amt = parseFloat(quick.querySelector('#mo-amt').value);
      if (isNaN(amt) || amt <= 0) { toast('how much was it?'); return; }
      S.money.entries.unshift({ id: uid(), amount: amt, cat: cat[1], emoji: cat[0], note: quick.querySelector('#mo-note').value.trim(), dateKey: todayKey() });
      save(); ctx.refresh();
    });
    body.appendChild(quick);

    // month summary
    const sum = el(`
      <div class="card">
        <div class="card-title">this month
          <span class="ct-spacer"></span>
          <button class="btn small ghost" data-budget>${budget ? '✎ budget' : '+ set budget'}</button>
        </div>
        <div class="trk-val" style="font-size:40px">${total.toFixed(0)}</div>
        ${budget ? `
          <div class="pbar" style="margin-top:8px"><i style="width:${Math.min(100, total / budget * 100)}%;${total > budget ? 'background:var(--red)' : ''}"></i></div>
          <div class="pixel-sub" style="margin-top:6px">${total > budget ? `${(total - budget).toFixed(0)} over — it happens` : `${(budget - total).toFixed(0)} left of ${budget}`}</div>` : ''}
      </div>`);
    sum.querySelector('[data-budget]').addEventListener('click', () => modal({
      title: '💸 monthly budget',
      bodyHTML: `<label class="fld">spending ceiling for the month</label><input type="number" id="bu-amt" inputmode="decimal" value="${budget || ''}">`,
      actions: [
        { label: 'remove', cls: 'ghost', onClick: () => { S.money.budget = null; save(); ctx.refresh(); } },
        {
          label: 'save', cls: 'primary',
          onClick(sheet) {
            const b = parseFloat(sheet.querySelector('#bu-amt').value);
            S.money.budget = isNaN(b) ? null : b; save(); ctx.refresh();
          },
        },
      ],
    }));
    body.appendChild(sum);

    // by category
    if (entries.length) {
      const byCat = {};
      for (const e2 of entries) byCat[e2.cat] = (byCat[e2.cat] || 0) + e2.amount;
      const max = Math.max(...Object.values(byCat));
      body.appendChild(el(`<div class="section-h">📊 where it went</div>`));
      for (const [c, amt] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
        const emoji = (CATS.find(x => x[1] === c) || ['✨'])[0];
        body.appendChild(el(`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="width:60px;font-size:12px">${emoji} ${c}</span>
            <div class="pbar" style="flex:1;height:12px"><i style="width:${Math.round(amt / max * 100)}%"></i></div>
            <span class="r-meta" style="width:56px;text-align:right">${amt.toFixed(0)}</span>
          </div>`));
      }
      body.appendChild(el(`<div class="section-h">🧾 recent</div>`));
      for (const e2 of entries.slice(0, 12)) {
        const row = el(`
          <div class="row"><span>${e2.emoji}</span>
            <div class="r-main"><div class="r-title" style="font-weight:400">${esc(e2.note || e2.cat)}</div>
            <div class="r-sub">${e2.dateKey.slice(5)}</div></div>
            <span class="r-meta">${e2.amount.toFixed(0)}</span>
            <button class="r-x">×</button>
          </div>`);
        row.querySelector('.r-x').addEventListener('click', () => {
          S.money.entries = S.money.entries.filter(x => x.id !== e2.id); save(); ctx.refresh();
        });
        body.appendChild(row);
      }
    } else {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">💸</div>
        <div class="e-serif">clean slate</div>
        <div class="e-sub">log spends in 2 taps. by month-end you'll <i>know</i> instead of wonder.</div></div>`));
    }
  },
};
