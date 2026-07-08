/* ═══════════ PEOPLE — remember the humans (ADHD object permanence, social edition) ═══════════ */
import { S, save, todayKey, esc, el, uid, toast } from '../core.js';
import { modal, confirmModal } from '../wm.js';

function daysSince(dk) {
  if (!dk) return null;
  return Math.round((new Date(todayKey() + 'T00:00:00') - new Date(dk + 'T00:00:00')) / 86400000);
}

function personForm(existing, onSave) {
  const p = existing || { name: '', emoji: '🙂', notes: '', likes: '', birthday: '' };
  modal({
    title: existing ? '💛 edit person' : '💛 new person',
    bodyHTML: `
      <div class="two-col">
        <div><label class="fld">emoji</label><input type="text" id="pf-emoji" maxlength="4" value="${esc(p.emoji)}"></div>
        <div><label class="fld">name</label><input type="text" id="pf-name" value="${esc(p.name)}"></div>
      </div>
      <label class="fld">things they love (gift-idea goldmine)</label>
      <input type="text" id="pf-likes" value="${esc(p.likes || '')}" placeholder="matcha, cats, f1…">
      <label class="fld">birthday (optional)</label>
      <input type="date" id="pf-bday" value="${p.birthday || ''}">
      <label class="fld">notes — inside jokes, their news, what to ask about</label>
      <textarea id="pf-notes" rows="3">${esc(p.notes || '')}</textarea>`,
    actions: [
      { label: 'cancel', cls: 'ghost' },
      {
        label: 'save', cls: 'primary',
        onClick(sheet) {
          const name = sheet.querySelector('#pf-name').value.trim();
          if (!name) { toast('who is it?'); return false; }
          p.name = name;
          p.emoji = sheet.querySelector('#pf-emoji').value.trim() || '🙂';
          p.likes = sheet.querySelector('#pf-likes').value.trim();
          p.birthday = sheet.querySelector('#pf-bday').value;
          p.notes = sheet.querySelector('#pf-notes').value.trim();
          onSave(p);
        },
      },
    ],
  });
}

export default {
  id: 'people', name: 'People', icon: '💛', w: 500, h: 640,
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">people</div>
      <div class="pixel-sub">out of sight ≠ out of heart anymore</div></div>`));

    const add = el(`<button class="btn primary wide" style="margin:14px 0">+ add someone</button>`);
    add.addEventListener('click', () => personForm(null, p => {
      p.id = uid(); S.people.push(p); save(); ctx.refresh();
    }));
    body.appendChild(add);

    if (!S.people.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">💛</div>
        <div class="e-serif">your favourite humans</div>
        <div class="e-sub">what they love, their birthdays, that thing they told you — saved forever, glanceable before you text them.</div></div>`));
      return;
    }

    for (const p of S.people) {
      const since = daysSince(p.lastTalked);
      const nudge = since !== null && since > 21;
      const card = el(`
        <div class="card">
          <div class="card-title"><span style="font-size:20px">${p.emoji}</span> ${esc(p.name)}
            <span class="ct-spacer"></span>
            <button class="btn small ghost" data-edit>✎</button>
            <button class="btn small ghost" data-del>🗑</button>
          </div>
          ${p.likes ? `<div class="r-sub" style="margin-bottom:6px">loves: ${esc(p.likes)}</div>` : ''}
          ${p.birthday ? `<div class="r-sub" style="margin-bottom:6px">🎂 ${new Date(p.birthday + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</div>` : ''}
          ${p.notes ? `<div class="why-box" style="margin:6px 0">${esc(p.notes)}</div>` : ''}
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
            <button class="btn small" data-talked>👋 we talked today</button>
            <span class="pixel-sub" style="color:${nudge ? 'var(--red)' : 'var(--ink-soft)'}">
              ${since === null ? '' : since === 0 ? 'talked today ✓' : `${since}d since you talked${nudge ? ' — maybe say hi?' : ''}`}
            </span>
          </div>
        </div>`);
      card.querySelector('[data-talked]').addEventListener('click', () => {
        p.lastTalked = todayKey(); save(); ctx.refresh(); toast('logged 💛');
      });
      card.querySelector('[data-edit]').addEventListener('click', () => personForm(p, () => { save(); ctx.refresh(); }));
      card.querySelector('[data-del]').addEventListener('click', () =>
        confirmModal('remove?', `remove <b>${esc(p.name)}</b> from people?`, () => {
          S.people = S.people.filter(x => x.id !== p.id); save(); ctx.refresh();
        }));
      body.appendChild(card);
    }
  },
};
