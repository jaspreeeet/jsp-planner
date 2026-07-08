/* ═══════════ PHOTOS — visual folders: outfits, notes, inspo, anything ═══════════ */
import { S, save, esc, el, addXP, uid, toast, todayKey, photoPut, photoGet, photoDel } from '../core.js';
import { modal, confirmModal } from '../wm.js';

const urlCache = new Map();
async function photoURL(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const rec = await photoGet(id);
  if (!rec) return null;
  const u = URL.createObjectURL(rec.blob);
  urlCache.set(id, u);
  return u;
}

function resizeImage(file, maxSide = 1400) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => res(b || file), 'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => res(file);
    img.src = URL.createObjectURL(file);
  });
}

const PRESET_ALBUMS = [
  { name: 'Outfits', emoji: '👗' },
  { name: 'Class notes', emoji: '📝' },
  { name: 'Inspo', emoji: '✨' },
  { name: 'Receipts & docs', emoji: '🧾' },
];

export default {
  id: 'photos', name: 'Photos', icon: '📷', w: 580, h: 660,
  render(ctx, params) {
    const { body } = ctx;
    const album = params && params.album && S.albums.find(a => a.id === params.album);
    if (album) return renderAlbum(ctx, album);

    body.appendChild(el(`
      <div><div class="serif-h">photo folders</div>
      <div class="pixel-sub">see it → find it → never lose it</div></div>`));

    const addRow = el(`<div class="chip-row" style="margin:14px 0"></div>`);
    const newBtn = el(`<button class="btn primary small">+ new folder</button>`);
    newBtn.addEventListener('click', () => modal({
      title: '📷 new folder',
      bodyHTML: `
        <div class="two-col">
          <div><label class="fld">emoji</label><input type="text" id="af-emoji" maxlength="4" value="📁"></div>
          <div><label class="fld">name</label><input type="text" id="af-name" placeholder="anything visual"></div>
        </div>`,
      actions: [
        { label: 'cancel', cls: 'ghost' },
        {
          label: 'create', cls: 'primary',
          onClick(sheet) {
            const name = sheet.querySelector('#af-name').value.trim();
            if (!name) { toast('name it!'); return false; }
            S.albums.push({ id: uid(), name, emoji: sheet.querySelector('#af-emoji').value.trim() || '📁', photoIds: [] });
            save(); ctx.refresh();
          },
        },
      ],
    }));
    addRow.appendChild(newBtn);
    for (const p of PRESET_ALBUMS) {
      if (S.albums.some(a => a.name === p.name)) continue;
      const c = el(`<button class="chip">+ ${p.emoji} ${p.name}</button>`);
      c.addEventListener('click', () => { S.albums.push({ id: uid(), ...p, photoIds: [] }); save(); ctx.refresh(); });
      addRow.appendChild(c);
    }
    body.appendChild(addRow);

    if (!S.albums.length) {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">📷</div>
        <div class="e-serif">visual memory, unlocked</div>
        <div class="e-sub">outfit pics, whiteboard photos, that one screenshot you always lose — give them folders.</div></div>`));
      return;
    }

    const grid = el(`<div class="album-grid"></div>`);
    for (const a of S.albums) {
      const card = el(`
        <div class="album-card">
          <div class="album-cover">${a.emoji}</div>
          <div class="album-meta"><div class="album-name">${esc(a.name)}</div>
          <div class="album-count">${a.photoIds.length} photo${a.photoIds.length === 1 ? '' : 's'}</div></div>
        </div>`);
      card.addEventListener('click', () => ctx.refresh({ album: a.id }));
      grid.appendChild(card);
      if (a.photoIds.length) photoURL(a.photoIds[a.photoIds.length - 1]).then(u => {
        if (u) card.querySelector('.album-cover').innerHTML = `<img src="${u}" alt="">`;
      });
    }
    body.appendChild(grid);
  },
};

function renderAlbum(ctx, album) {
  const { body } = ctx;
  const head = el(`
    <div style="display:flex;align-items:center;gap:10px">
      <button class="btn small">←</button>
      <div style="flex:1"><div class="serif-h" style="font-size:26px;margin:0">${album.emoji} ${esc(album.name)}</div>
      <div class="pixel-sub">${album.photoIds.length} photos</div></div>
      <button class="btn small ghost" data-del>🗑</button>
    </div>`);
  head.querySelector('.btn').addEventListener('click', () => ctx.refresh({}));
  head.querySelector('[data-del]').addEventListener('click', () =>
    confirmModal('delete folder?', `<b>${esc(album.name)}</b> and its ${album.photoIds.length} photos?`, async () => {
      for (const id of album.photoIds) await photoDel(id);
      S.albums = S.albums.filter(x => x.id !== album.id); save(); ctx.refresh({});
    }));
  body.appendChild(head);

  const addBtn = el(`<button class="btn primary wide" style="margin:14px 0">+ add photos</button>`);
  const fileIn = el(`<input type="file" accept="image/*" multiple class="hidden">`);
  addBtn.addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', async () => {
    const files = [...fileIn.files];
    if (!files.length) return;
    toast(`saving ${files.length}…`);
    for (const f of files) {
      const blob = await resizeImage(f);
      const id = uid();
      await photoPut({ id, blob, album: album.id, ts: Date.now() });
      album.photoIds.push(id);
    }
    addXP(5, 'photos saved');
    save(); ctx.refresh({ album: album.id });
  });
  body.append(addBtn, fileIn);

  if (!album.photoIds.length) {
    body.appendChild(el(`<div class="empty"><div class="e-art">${album.emoji}</div><div class="e-serif">empty folder</div><div class="e-sub">photos live on this device & sync via your backups.</div></div>`));
    return;
  }

  const grid = el(`<div class="photo-grid"></div>`);
  for (const pid of [...album.photoIds].reverse()) {
    const cell = el(`<div class="photo-cell"></div>`);
    photoURL(pid).then(u => { if (u) cell.innerHTML = `<img src="${u}" alt="" loading="lazy">`; });
    cell.addEventListener('click', () => lightbox(ctx, album, pid));
    grid.appendChild(cell);
  }
  body.appendChild(grid);
}

async function lightbox(ctx, album, pid) {
  const u = await photoURL(pid);
  const lb = el(`
    <div class="lightbox">
      <img src="${u}" alt="">
      <div style="display:flex;gap:10px">
        ${album.name === 'Outfits' ? '<button class="btn" data-outfit>📅 wear this…</button>' : ''}
        <button class="btn" data-del>🗑 delete</button>
        <button class="btn primary" data-close>close</button>
      </div>
    </div>`);
  lb.querySelector('[data-close]').addEventListener('click', () => lb.remove());
  lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
  lb.querySelector('[data-del]').addEventListener('click', async () => {
    await photoDel(pid);
    album.photoIds = album.photoIds.filter(x => x !== pid);
    save(); lb.remove(); ctx.refresh({ album: album.id });
  });
  const ob = lb.querySelector('[data-outfit]');
  if (ob) ob.addEventListener('click', () => {
    lb.remove();
    modal({
      title: '👗 plan this outfit',
      bodyHTML: `<label class="fld">for which day?</label><input type="date" id="of-date" value="${todayKey()}">`,
      actions: [
        { label: 'cancel', cls: 'ghost' },
        {
          label: 'plan it', cls: 'primary',
          onClick(sheet) {
            const dk = sheet.querySelector('#of-date').value;
            if (!dk) return false;
            S.outfits[dk] = { photoId: pid };
            save(); toast('outfit planned ✓ future-you thanks you');
            addXP(5, 'outfit planned');
          },
        },
      ],
    });
  });
  document.body.appendChild(lb);
}
