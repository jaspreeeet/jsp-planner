/* ═══════════ COLLECTIONS — jokes, one-liners, quotes, anything ═══════════ */
import { S, save, esc, el, addXP, uid, toast } from '../core.js';
import { modal, confirmModal } from '../wm.js';

const PRESETS = [
  { name: 'Jokes', emoji: '😂' },
  { name: 'One-liners', emoji: '💬' },
  { name: 'Vocab', emoji: '🔤' },
  { name: 'Quotes', emoji: '❝' },
  { name: 'Watch list', emoji: '🎬' },
  { name: 'Gift ideas', emoji: '🎁' },
];

export default {
  id: 'collections', name: 'Collect', icon: '🗂', w: 540, h: 660,
  render(ctx, params) {
    const { body } = ctx;
    const openId = params && params.open;
    const col = openId && S.collections.find(c => c.id === openId);

    if (col) return renderCollection(ctx, col);

    body.appendChild(el(`
      <div><div class="serif-h">collections</div>
      <div class="pixel-sub">a home for every stray gem</div></div>`));

    const addRow = el(`<div class="chip-row" style="margin:14px 0"></div>`);
    const newBtn = el(`<button class="btn primary small">+ new collection</button>`);
    newBtn.addEventListener('click', () => modal({
      title: '🗂 new collection',
      bodyHTML: `
        <div class="two-col">
          <div><label class="fld">emoji</label><input type="text" id="cf-emoji" maxlength="4" value="✦"></div>
          <div><label class="fld">name</label><input type="text" id="cf-name" placeholder="recipes, dreams, red flags…"></div>
        </div>`,
      actions: [
        { label: 'cancel', cls: 'ghost' },
        {
          label: 'create', cls: 'primary',
          onClick(sheet) {
            const name = sheet.querySelector('#cf-name').value.trim();
            if (!name) { toast('name it!'); return false; }
            S.collections.push({ id: uid(), name, emoji: sheet.querySelector('#cf-emoji').value.trim() || '✦', items: [] });
            save(); ctx.refresh();
          },
        },
      ],
    }));
    addRow.appendChild(newBtn);
    for (const p of PRESETS) {
      if (S.collections.some(c => c.name === p.name)) continue;
      const c = el(`<button class="chip">+ ${p.emoji} ${p.name}</button>`);
      c.addEventListener('click', () => {
        S.collections.push({ id: uid(), ...p, items: [] }); save(); ctx.refresh();
      });
      addRow.appendChild(c);
    }
    body.appendChild(addRow);

    if (!S.collections.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">🗂</div>
        <div class="e-serif">nothing collected yet</div>
        <div class="e-sub">heard a great joke? found a word you love? give it a shelf so it never evaporates.</div></div>`));
      return;
    }

    const grid = el(`<div class="trk-grid"></div>`);
    for (const c of S.collections) {
      const card = el(`
        <div class="trk-card">
          <span class="trk-emoji">${c.emoji}</span>
          <div class="trk-name">${esc(c.name)}</div>
          <span class="trk-val">${c.items.length}</span>
          <span class="trk-unit">item${c.items.length === 1 ? '' : 's'}</span>
        </div>`);
      card.addEventListener('click', () => ctx.refresh({ open: c.id }));
      grid.appendChild(card);
    }
    body.appendChild(grid);
  },
};

function renderCollection(ctx, col) {
  const { body } = ctx;
  const head = el(`
    <div style="display:flex;align-items:center;gap:10px">
      <button class="btn small">←</button>
      <div style="flex:1"><div class="serif-h" style="font-size:26px;margin:0">${col.emoji} ${esc(col.name)}</div>
      <div class="pixel-sub">${col.items.length} treasures</div></div>
      <button class="btn small ghost" data-del>🗑</button>
    </div>`);
  head.querySelector('.btn').addEventListener('click', () => ctx.refresh({}));
  head.querySelector('[data-del]').addEventListener('click', () =>
    confirmModal('delete collection?', `<b>${esc(col.name)}</b> and all ${col.items.length} items?`, () => {
      S.collections = S.collections.filter(x => x.id !== col.id); save(); ctx.refresh({});
    }));
  body.appendChild(head);

  const inputRow = el(`
    <div style="display:flex;gap:8px;margin:14px 0">
      <input type="text" id="ci-in" placeholder="add to ${esc(col.name.toLowerCase())}…" style="flex:1">
      <button class="btn primary">+</button>
    </div>`);
  const doAdd = () => {
    const input = inputRow.querySelector('#ci-in');
    const text = input.value.trim();
    if (!text) return;
    col.items.unshift({ id: uid(), text, ts: Date.now(), fav: false });
    addXP(4, 'collected');
    save(); ctx.refresh({ open: col.id });
  };
  inputRow.querySelector('.btn').addEventListener('click', doAdd);
  inputRow.querySelector('#ci-in').addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
  body.appendChild(inputRow);

  if (!col.items.length) {
    body.appendChild(el(`<div class="empty"><div class="e-art">${col.emoji}</div><div class="e-serif">empty shelf</div><div class="e-sub">first one's the hardest. type it above ↑</div></div>`));
    return;
  }

  // random gem button
  if (col.items.length > 2) {
    const rand = el(`<button class="btn small wide" style="margin-bottom:10px">🎲 surprise me with one</button>`);
    rand.addEventListener('click', () => {
      const item = col.items[Math.floor(Math.random() * col.items.length)];
      modal({ title: `${col.emoji} from ${esc(col.name)}`, bodyHTML: `<div class="affirm">“${esc(item.text)}”</div>` });
    });
    body.appendChild(rand);
  }

  for (const item of col.items) {
    const row = el(`
      <div class="row">
        <button class="r-x" style="font-size:17px;color:${item.fav ? 'var(--accent)' : 'var(--ink-faint)'}" data-fav>${item.fav ? '★' : '☆'}</button>
        <div class="r-main"><div class="r-title" style="font-weight:400">${esc(item.text)}</div></div>
        <button class="r-x">×</button>
      </div>`);
    row.querySelector('[data-fav]').addEventListener('click', () => {
      item.fav = !item.fav; save(); ctx.refresh({ open: col.id });
    });
    row.querySelector('.r-x:last-child').addEventListener('click', () => {
      col.items = col.items.filter(x => x.id !== item.id); save(); ctx.refresh({ open: col.id });
    });
    body.appendChild(row);
  }
}
