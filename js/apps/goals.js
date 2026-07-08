/* ═══════════ QUESTS — big goals, broken into boss fights ═══════════ */
import { S, save, esc, el, uid, addXP, toast } from '../core.js';
import { modal, confirmModal } from '../wm.js';

function goalForm(existing, onSave) {
  const g = existing || { name: '', emoji: '🏔', why: '', milestones: [] };
  modal({
    title: existing ? '🏔 edit quest' : '🏔 new quest',
    bodyHTML: `
      <div class="two-col">
        <div><label class="fld">emoji</label><input type="text" id="gf-emoji" maxlength="4" value="${esc(g.emoji)}"></div>
        <div><label class="fld">the quest</label><input type="text" id="gf-name" value="${esc(g.name)}" placeholder="ace this semester"></div>
      </div>
      <label class="fld">why it matters (your future self will read this)</label>
      <textarea id="gf-why" rows="2">${esc(g.why || '')}</textarea>
      <label class="fld">milestones — one per line, small enough to finish</label>
      <textarea id="gf-miles" rows="5" placeholder="make revision schedule\nfinish chapter 1 notes">${esc((g.milestones || []).map(m => m.text).join('\n'))}</textarea>`,
    actions: [
      { label: 'cancel', cls: 'ghost' },
      {
        label: 'save', cls: 'primary',
        onClick(sheet) {
          const name = sheet.querySelector('#gf-name').value.trim();
          if (!name) { toast('name the quest!'); return false; }
          const old = g.milestones || [];
          g.name = name;
          g.emoji = sheet.querySelector('#gf-emoji').value.trim() || '🏔';
          g.why = sheet.querySelector('#gf-why').value.trim();
          g.milestones = sheet.querySelector('#gf-miles').value.split('\n').map(s => s.trim()).filter(Boolean)
            .map(text => old.find(m => m.text === text) || { id: uid(), text, done: false });
          onSave(g);
        },
      },
    ],
  });
}

export default {
  id: 'goals', name: 'Quests', icon: '🏔', w: 520, h: 660,
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">quests</div>
      <div class="pixel-sub">main story missions · side quests welcome</div></div>`));

    const add = el(`<button class="btn primary wide" style="margin:14px 0">+ start a quest</button>`);
    add.addEventListener('click', () => goalForm(null, g => {
      g.id = uid(); S.goals.push(g); save(); ctx.refresh();
    }));
    body.appendChild(add);

    if (!S.goals.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">🏔</div>
        <div class="e-serif">no active quests</div>
        <div class="e-sub">a goal with milestones beats a wish. break something big into boss fights ↑</div></div>`));
      return;
    }

    for (const g of S.goals) {
      const done = g.milestones.filter(m => m.done).length;
      const pct = g.milestones.length ? Math.round(done / g.milestones.length * 100) : 0;
      const complete = pct === 100 && g.milestones.length;
      const card = el(`
        <div class="card" style="${complete ? 'border-color:var(--green)' : ''}">
          <div class="card-title">${g.emoji} ${esc(g.name)} ${complete ? '· ⭐ COMPLETE' : ''}
            <span class="ct-spacer"></span>
            <button class="btn small ghost" data-edit>✎</button>
            <button class="btn small ghost" data-del>🗑</button>
          </div>
          ${g.why ? `<div class="why-box" style="margin:0 0 10px">“${esc(g.why)}”</div>` : ''}
          <div class="pbar" style="margin-bottom:4px"><i style="width:${pct}%"></i></div>
          <div class="pixel-sub" style="margin-bottom:8px">${done}/${g.milestones.length} milestones · ${pct}%</div>
          <div data-miles></div>
        </div>`);
      const zone = card.querySelector('[data-miles]');
      for (const m of g.milestones) {
        const row = el(`
          <div class="row">
            <button class="pcheck ${m.done ? 'on' : ''}"></button>
            <div class="r-main"><div class="r-title ${m.done ? 'done' : ''}" style="font-weight:400">${esc(m.text)}</div></div>
          </div>`);
        row.querySelector('.pcheck').addEventListener('click', () => {
          m.done = !m.done;
          if (m.done) {
            const allDone = g.milestones.every(x => x.done);
            addXP(allDone ? 40 : 12, allDone ? `QUEST COMPLETE: ${g.name}!` : 'milestone!');
          }
          save(); ctx.refresh();
        });
        zone.appendChild(row);
      }
      card.querySelector('[data-edit]').addEventListener('click', () => goalForm(g, () => { save(); ctx.refresh(); }));
      card.querySelector('[data-del]').addEventListener('click', () =>
        confirmModal('abandon quest?', `<b>${esc(g.name)}</b> and its milestones?`, () => {
          S.goals = S.goals.filter(x => x.id !== g.id); save(); ctx.refresh();
        }));
      body.appendChild(card);
    }
  },
};
