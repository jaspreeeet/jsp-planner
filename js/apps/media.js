/* ═══════════ MEDIA — apple music, youtube & spotify in real windows ═══════════ */
import { S, save, esc, el, uid, toast } from '../core.js';
import { confirmModal } from '../wm.js';

const KINDS = {
  am: { label: '🍎 Music', hint: 'share any song/album/playlist in Apple Music → copy link → paste here', open: 'music://', openLbl: 'open Apple Music ↗' },
  yt: { label: '▶️ YouTube', hint: 'paste any video, live stream, short or playlist link', open: 'https://youtube.com', openLbl: 'open YouTube ↗' },
  sp: { label: '🟢 Spotify', hint: 'share any song/album/playlist in Spotify → copy link → paste here', open: 'spotify://', openLbl: 'open Spotify ↗' },
  sc: { label: '☁️ SoundCloud', hint: 'paste any track or set link from SoundCloud', open: 'https://soundcloud.com', openLbl: 'open SoundCloud ↗' },
};

const STARTERS = [
  { kind: 'yt', title: 'lofi girl — beats to study to', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { kind: 'yt', title: 'synthwave radio — beats to chill to', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { kind: 'am', title: "Today's Hits", url: 'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb' },
  { kind: 'sp', title: 'Peaceful Piano', url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { kind: 'sp', title: 'Deep Focus', url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ' },
];

/* link → {embed, height} or null if not recognised */
export function toEmbed(raw) {
  let u;
  try { u = new URL(raw.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');

  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const list = u.searchParams.get('list');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (u.pathname.startsWith('/watch')) id = u.searchParams.get('v') || '';
    else if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/live/') || u.pathname.startsWith('/embed/'))
      id = u.pathname.split('/')[2] || '';
    if (list && !id) return { kind: 'yt', embed: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&rel=0`, ratio: true };
    if (!id) return null;
    const extra = list ? `&list=${list}` : '';
    return { kind: 'yt', embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0${extra}`, ratio: true };
  }
  if (host === 'music.apple.com') {
    const isSong = u.searchParams.get('i') || u.pathname.includes('/song/');
    return { kind: 'am', embed: 'https://embed.music.apple.com' + u.pathname + u.search, height: isSong ? 175 : 450 };
  }
  if (host === 'soundcloud.com' || host === 'on.soundcloud.com') {
    return { kind: 'sc', embed: 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(raw.trim()) + '&color=%23ff6b35&show_teaser=false', height: 166 };
  }
  if (host === 'open.spotify.com') {
    const parts = u.pathname.split('/').filter(Boolean);           // [type, id] or [embed, type, id]
    if (parts[0] === 'embed') parts.shift();
    if (parts.length < 2) return null;
    const short = parts[0] === 'track' || parts[0] === 'episode';
    return { kind: 'sp', embed: `https://open.spotify.com/embed/${parts[0]}/${parts[1].split('?')[0]}?utm_source=generator`, height: short ? 152 : 380 };
  }
  return null;
}

function frameFor(item) {
  const e2 = toEmbed(item.url);
  if (!e2) return el(`<p class="muted">hmm, can't embed that link.</p>`);
  if (e2.ratio) return el(`
    <div class="media-ratio">
      <iframe src="${esc(e2.embed)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen frameborder="0"></iframe>
    </div>`);
  return el(`
    <iframe class="media-frame" src="${esc(e2.embed)}" style="height:${e2.height}px"
      allow="autoplay *; encrypted-media *; clipboard-write"
      frameborder="0"></iframe>`);
}

export default {
  id: 'media', name: 'Media', icon: '📺', w: 640, h: 720,
  render(ctx, params) {
    const { body } = ctx;
    if (!S.media.seeded) {
      S.media.items = STARTERS.map(s => ({ id: uid(), ...s }));
      S.media.seeded = true;
      save();
    }
    const tab = (params && params.tab) || S.media.tab || 'yt';
    S.media.tab = tab;
    const items = S.media.items.filter(i => i.kind === tab);
    // resume: no explicit pick → reopen what you played last on this tab
    const nowId = (params && params.play) || (S.media.last && S.media.last.tab === tab ? S.media.last.id : null);
    const now = items.find(i => i.id === nowId) || null;
    if (now && params && params.play) { S.media.last = { tab, id: now.id }; save(); }

    body.appendChild(el(`
      <div><div class="serif-h">media</div>
      <div class="pixel-sub">your channels, playing right here</div></div>`));

    const tabs = el(`
      <div class="tabs" style="margin-top:12px">
        ${Object.entries(KINDS).map(([k, v]) =>
          `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${v.label}</button>`).join('')}
      </div>`);
    tabs.querySelectorAll('button').forEach(b =>
      b.addEventListener('click', () => { save(); ctx.refresh({ tab: b.dataset.t }); }));
    body.appendChild(tabs);

    // now playing
    if (now) {
      const wrap = el(`
        <div class="card nowplaying-card">
          <div class="card-title">📻 now playing · ${esc(now.title)}
            <span class="ct-spacer"></span>
            <button class="btn small ghost" data-stop>✕ stop</button>
          </div>
        </div>`);
      wrap.appendChild(frameFor(now));
      wrap.querySelector('[data-stop]').addEventListener('click', () => ctx.refresh({ tab }));
      body.appendChild(wrap);
      if (tab !== 'yt') body.appendChild(el(`<p class="muted" style="margin:-4px 0 10px">🔓 hearing 30-sec previews? tap the <b>sign in</b> / ⋯ button inside the player once — then your subscription plays full songs here.</p>`));
    }

    // paste a link
    const paste = el(`
      <div class="card flat" style="background:var(--paper-2)">
        <div style="display:flex;gap:8px">
          <input type="text" id="md-url" placeholder="paste a ${KINDS[tab].label.slice(2).trim()} link…" style="flex:1">
          <button class="btn primary" id="md-go">▶</button>
        </div>
        <p class="muted" style="margin-top:8px;font-size:11px">${KINDS[tab].hint}</p>
      </div>`);
    const playPasted = () => {
      const url = paste.querySelector('#md-url').value.trim();
      if (!url) return;
      const e2 = toEmbed(url);
      if (!e2) { toast('that link doesn\'t look embeddable 🤔'); return; }
      const item = { id: uid(), kind: e2.kind, title: 'untitled — tap ✎ to name it', url };
      S.media.items.unshift(item);
      save();
      ctx.refresh({ tab: e2.kind, play: item.id });
    };
    paste.querySelector('#md-go').addEventListener('click', playPasted);
    paste.querySelector('#md-url').addEventListener('keydown', e2 => { if (e2.key === 'Enter') playPasted(); });
    body.appendChild(paste);

    // library
    body.appendChild(el(`<div class="section-h">📚 library</div>`));
    if (!items.length) {
      body.appendChild(el(`<p class="muted">nothing saved here yet — paste a link above and it joins the library automatically.</p>`));
    }
    for (const item of items) {
      const row = el(`
        <div class="row" style="cursor:pointer">
          <span style="font-size:18px">${item.id === nowId ? '📻' : '▸'}</span>
          <div class="r-main"><div class="r-title" style="font-weight:500">${esc(item.title)}</div></div>
          <button class="r-x" data-ren>✎</button>
          <button class="r-x" data-del>×</button>
        </div>`);
      row.addEventListener('click', e2 => {
        if (e2.target.closest('.r-x')) return;
        ctx.refresh({ tab, play: item.id });
      });
      row.querySelector('[data-ren]').addEventListener('click', () => {
        const name = prompt('name this:', item.title);
        if (name && name.trim()) { item.title = name.trim(); save(); ctx.refresh({ tab, play: nowId }); }
      });
      row.querySelector('[data-del]').addEventListener('click', () =>
        confirmModal('remove?', `take <b>${esc(item.title)}</b> out of the library?`, () => {
          S.media.items = S.media.items.filter(x => x.id !== item.id);
          save(); ctx.refresh({ tab });
        }));
      body.appendChild(row);
    }

    const ext = el(`<button class="btn small wide" style="margin-top:14px">${KINDS[tab].openLbl}</button>`);
    ext.addEventListener('click', () => open(KINDS[tab].open, '_blank'));
    body.appendChild(ext);
  },
};
