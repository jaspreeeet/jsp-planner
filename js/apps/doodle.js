/* ═══════════ DOODLE — a tiny canvas for restless hands ═══════════ */
import { S, save, esc, el, uid, toast, addXP, photoPut } from '../core.js';

const COLORS = ['#211d19', '#ff6b35', '#ffb347', '#4a8fd9', '#4caf7d', '#e88bb5', '#9b7ede', '#e05252', '#f2ecdd'];

export default {
  id: 'doodle', name: 'Doodle', icon: '🖍', w: 520, h: 660,
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">doodle</div>
      <div class="pixel-sub">fidget productively · saves to Photos</div></div>`));

    let color = COLORS[0], size = 4, drawing = false, dirty = false;

    const bar = el(`<div class="chip-row" style="margin:12px 0"></div>`);
    COLORS.forEach((c, i) => {
      const chip = el(`<button class="chip ${i === 0 ? 'on' : ''}" style="background:${c};width:30px;height:30px;padding:0">&nbsp;</button>`);
      chip.addEventListener('click', () => {
        bar.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); chip.classList.add('on'); color = c;
      });
      bar.appendChild(chip);
    });
    body.appendChild(bar);

    const sizes = el(`
      <div class="chip-row" style="margin-bottom:10px">
        <button class="chip" data-s="2">fine</button>
        <button class="chip on" data-s="4">pen</button>
        <button class="chip" data-s="10">marker</button>
        <button class="chip" data-s="26">chunky</button>
      </div>`);
    sizes.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
      sizes.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); b.classList.add('on');
      size = Number(b.dataset.s);
    }));
    body.appendChild(sizes);

    const cv = el(`<canvas class="game-canvas" style="width:100%;touch-action:none;background:#fffdf6"></canvas>`);
    body.appendChild(cv);
    requestAnimationFrame(() => {
      cv.width = cv.clientWidth * 2; cv.height = Math.round(cv.clientWidth * 1.1) * 2;
      cv.style.height = Math.round(cv.clientWidth * 1.1) + 'px';
      const g = cv.getContext('2d');
      g.fillStyle = '#fffdf6'; g.fillRect(0, 0, cv.width, cv.height);
      g.lineCap = g.lineJoin = 'round';
    });
    const g = () => cv.getContext('2d');
    const pos = e2 => {
      const r = cv.getBoundingClientRect();
      return [(e2.clientX - r.left) * (cv.width / r.width), (e2.clientY - r.top) * (cv.height / r.height)];
    };
    cv.addEventListener('pointerdown', e2 => {
      drawing = true; dirty = true;
      const [x, y] = pos(e2);
      const c = g(); c.strokeStyle = color; c.lineWidth = size * 2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + .1, y + .1); c.stroke();
      cv.setPointerCapture(e2.pointerId);
    });
    cv.addEventListener('pointermove', e2 => {
      if (!drawing) return;
      const [x, y] = pos(e2);
      const c = g(); c.lineTo(x, y); c.stroke();
    });
    cv.addEventListener('pointerup', () => { drawing = false; g().beginPath(); });

    const actions = el(`
      <div class="two-col" style="margin-top:12px">
        <button class="btn">🧻 start over</button>
        <button class="btn primary">💾 save to Photos</button>
      </div>`);
    actions.children[0].addEventListener('click', () => {
      const c = g(); c.fillStyle = '#fffdf6'; c.fillRect(0, 0, cv.width, cv.height); dirty = false;
    });
    actions.children[1].addEventListener('click', () => {
      if (!dirty) { toast('doodle something first!'); return; }
      cv.toBlob(async blob => {
        let album = S.albums.find(a => a.name === 'Doodles');
        if (!album) { album = { id: uid(), name: 'Doodles', emoji: '🖍', photoIds: [] }; S.albums.push(album); }
        const id = uid();
        await photoPut({ id, blob, album: album.id, ts: Date.now() });
        album.photoIds.push(id);
        save();
        addXP(6, 'art!');
        toast('saved to Photos → 🖍 Doodles');
      }, 'image/png');
    });
    body.appendChild(actions);
  },
};
