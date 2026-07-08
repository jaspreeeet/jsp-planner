/* ═══════════ PLANNER — gentle time-blocking, energy-aware ═══════════ */
import { S, save, todayKey, fmtTime, esc, el, addXP, uid, emit, toast } from '../core.js';
import { modal } from '../wm.js';

const ENERGY = { high: '⚡ high', mid: '〰 mid', low: '🪫 low' };

function taskForm(dateKey, existing, onSave) {
  const t = existing || { text: '', time: '', energy: 'mid', dateKey };
  modal({
    title: existing ? '▤ edit task' : '▤ new task',
    bodyHTML: `
      <label class="fld">what (small & concrete beats big & vague)</label>
      <input type="text" id="tf-text" value="${esc(t.text)}" placeholder="e.g. read 5 pages of chem">
      <div class="two-col">
        <div><label class="fld">time (optional)</label><input type="time" id="tf-time" value="${t.time || ''}"></div>
        <div><label class="fld">energy needed</label>
          <select id="tf-energy">
            ${Object.entries(ENERGY).map(([k, v]) => `<option value="${k}" ${t.energy === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select></div>
      </div>`,
    actions: [
      { label: 'cancel', cls: 'ghost' },
      {
        label: 'save', cls: 'primary',
        onClick(sheet) {
          const text = sheet.querySelector('#tf-text').value.trim();
          if (!text) { toast('what\'s the task?'); return false; }
          t.text = text;
          t.time = sheet.querySelector('#tf-time').value;
          t.energy = sheet.querySelector('#tf-energy').value;
          onSave(t);
        },
      },
    ],
  });
}

export default {
  id: 'planner', name: 'Plan', icon: '▤', w: 540, h: 680,
  badge() { return 0; },
  render(ctx, params) {
    const { body } = ctx;
    const dk = (params && params.dateKey) || todayKey();
    const d = new Date(dk + 'T12:00:00');
    const isToday = dk === todayKey();

    const head = el(`
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn small" data-nav="-1">←</button>
        <div style="flex:1;text-align:center">
          <div class="serif-h" style="font-size:26px;margin:0">${isToday ? 'today' : d.toLocaleDateString('en-GB', { weekday: 'long' })}</div>
          <div class="pixel-sub">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</div>
        </div>
        <button class="btn small" data-nav="1">→</button>
      </div>`);
    head.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
      const nd = new Date(d); nd.setDate(nd.getDate() + Number(b.dataset.nav));
      ctx.refresh({ dateKey: todayKey(nd) });
    }));
    body.appendChild(head);

    const tasks = S.tasks.filter(t => t.dateKey === dk).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    const open = tasks.filter(t => !t.done), done = tasks.filter(t => t.done);

    const addBtn = el(`<button class="btn primary wide" style="margin:14px 0">+ add to this day</button>`);
    addBtn.addEventListener('click', () => taskForm(dk, null, t => {
      t.id = uid(); t.ts = Date.now();
      S.tasks.push(t); save(); emit('data'); ctx.refresh({ dateKey: dk });
    }));
    body.appendChild(addBtn);

    // pull from inbox
    const todos = S.inbox.filter(i => i.tag.includes('todo'));
    if (todos.length) {
      const pull = el(`<button class="btn small wide" style="margin-bottom:12px">⤵ pull ${todos.length} todo${todos.length > 1 ? 's' : ''} from brain dumps</button>`);
      pull.addEventListener('click', () => {
        for (const i of todos) {
          S.tasks.push({ id: uid(), text: i.text, dateKey: dk, energy: 'mid', time: '', ts: Date.now() });
          S.inbox = S.inbox.filter(x => x.id !== i.id);
        }
        save(); emit('data'); ctx.refresh({ dateKey: dk });
        toast('inbox → plan. zero thoughts lost ✓');
      });
      body.appendChild(pull);
    }

    if (!open.length && !done.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">🌤</div>
        <div class="e-serif">a blank day</div>
        <div class="e-sub">pick <b>1–3 things max</b>. a short list you finish beats a long list that stares at you.</div></div>`));
    }

    if (open.length) {
      body.appendChild(el(`<div class="section-h">to do · ${open.length}</div>`));
      for (const t of open) {
        const row = el(`
          <div class="row">
            <button class="pcheck"></button>
            <div class="r-main">
              <div class="r-title">${esc(t.text)}</div>
              <div class="r-sub">${ENERGY[t.energy] || ''}</div>
            </div>
            ${t.time ? `<span class="r-meta">${fmtTime(t.time)}</span>` : ''}
            <button class="r-x" data-act="edit">✎</button>
            <button class="r-x" data-act="del">×</button>
          </div>`);
        row.querySelector('.pcheck').addEventListener('click', () => {
          t.done = true; S.stats.tasksDone++;
          addXP(10, 'task done'); save(); emit('data'); ctx.refresh({ dateKey: dk });
        });
        row.querySelector('[data-act=edit]').addEventListener('click', () =>
          taskForm(dk, t, () => { save(); ctx.refresh({ dateKey: dk }); }));
        row.querySelector('[data-act=del]').addEventListener('click', () => {
          S.tasks = S.tasks.filter(x => x.id !== t.id); save(); emit('data'); ctx.refresh({ dateKey: dk });
        });
        body.appendChild(row);
      }
      // migrate leftovers
      if (!isToday && dk < todayKey()) {
        const mig = el(`<button class="btn small wide" style="margin-top:10px">→ migrate leftovers to today</button>`);
        mig.addEventListener('click', () => {
          open.forEach(t => t.dateKey = todayKey());
          save(); emit('data'); ctx.refresh({ dateKey: todayKey() });
          toast('carried forward. no guilt — that\'s the system working.');
        });
        body.appendChild(mig);
      }
    }

    if (done.length) {
      body.appendChild(el(`<div class="section-h">done · ${done.length} ✓</div>`));
      for (const t of done) {
        const row = el(`
          <div class="row">
            <button class="pcheck on"></button>
            <div class="r-main"><div class="r-title done">${esc(t.text)}</div></div>
          </div>`);
        row.querySelector('.pcheck').addEventListener('click', () => {
          t.done = false; save(); emit('data'); ctx.refresh({ dateKey: dk });
        });
        body.appendChild(row);
      }
    }

    if (open.length > 4) body.appendChild(el(`<p class="muted center" style="margin-top:10px">psst — ${open.length} is a lot. protect tomorrow-you: move some forward →</p>`));
  },
};
