/* ═══════════ PORTALS — jump straight into your other worlds ═══════════ */
import { S, save, esc, el, uid, toast } from '../core.js';
import { modal, confirmModal } from '../wm.js';

const DEFAULTS = [
  { name: 'Apple Music', emoji: '🎵', url: 'music://' },
  { name: 'YouTube', emoji: '▶️', url: 'https://youtube.com' },
  { name: 'Notes', emoji: '📝', url: 'mobilenotes://' },
  { name: 'Reminders', emoji: '☑️', url: 'x-apple-reminderkit://' },
  { name: 'Calendar', emoji: '📅', url: 'calshow://' },
  { name: 'Mail', emoji: '✉️', url: 'message://' },
  { name: 'Spotify', emoji: '🟢', url: 'spotify://' },
  { name: 'Google Drive', emoji: '📂', url: 'https://drive.google.com' },
];

export default {
  id: 'launcher', name: 'Portals', icon: '🌐', w: 520, h: 600,
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">portals</div>
      <div class="pixel-sub">one tap → the right app or site</div></div>`));

    if (!S.links.length) {
      S.links = DEFAULTS.map(d => ({ id: uid(), ...d }));
      save();
    }

    const add = el(`<button class="btn primary wide" style="margin:14px 0">+ add portal</button>`);
    add.addEventListener('click', () => modal({
      title: '🌐 new portal',
      bodyHTML: `
        <div class="two-col">
          <div><label class="fld">emoji</label><input type="text" id="lf-emoji" maxlength="4" value="🔗"></div>
          <div><label class="fld">name</label><input type="text" id="lf-name" placeholder="my uni portal"></div>
        </div>
        <label class="fld">link (website or app url)</label>
        <input type="text" id="lf-url" placeholder="https://… or spotify:// etc">`,
      actions: [
        { label: 'cancel', cls: 'ghost' },
        {
          label: 'save', cls: 'primary',
          onClick(sheet) {
            const name = sheet.querySelector('#lf-name').value.trim();
            let url = sheet.querySelector('#lf-url').value.trim();
            if (!name || !url) { toast('need a name and a link'); return false; }
            if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
            S.links.push({ id: uid(), name, url, emoji: sheet.querySelector('#lf-emoji').value.trim() || '🔗' });
            save(); ctx.refresh();
          },
        },
      ],
    }));
    body.appendChild(add);

    const grid = el(`<div class="tile-grid"></div>`);
    for (const l of S.links) {
      const t = el(`
        <a class="tile" href="${esc(l.url)}" target="${l.url.startsWith('http') ? '_blank' : '_self'}" rel="noopener">
          <span class="t-e">${l.emoji}</span><div class="t-n">${esc(l.name)}</div>
          <button class="r-x">×</button>
        </a>`);
      t.querySelector('.r-x').addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        confirmModal('remove portal?', `<b>${esc(l.name)}</b>`, () => {
          S.links = S.links.filter(x => x.id !== l.id); save(); ctx.refresh();
        });
      });
      grid.appendChild(t);
    }
    body.appendChild(grid);
    body.appendChild(el(`<p class="muted center" style="margin-top:14px">app links (music://, spotify://…) work on iPhone & iPad. add anything — uni portal, group chat, cloud drive.</p>`));
  },
};
