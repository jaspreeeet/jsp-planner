/* ═══════════ ARCADE — tiny games for tiny breaks ═══════════ */
import { S, save, el, addXP, toast } from '../core.js';

let snakeIv = null, keyFn = null;
const dropKeys = () => { if (keyFn) { removeEventListener('keydown', keyFn); keyFn = null; } };

export default {
  id: 'games', name: 'Arcade', icon: '🕹', w: 480, h: 640,
  onClose() { clearInterval(snakeIv); dropKeys(); },
  render(ctx, params) {
    clearInterval(snakeIv); dropKeys();
    const { body } = ctx;
    const tab = (params && params.tab) || 'menu';
    if (tab === 'menu') {
      body.appendChild(el(`
        <div><div class="serif-h">arcade</div>
        <div class="pixel-sub">five minutes of nothing important</div></div>`));
      const zone = el(`<div class="big-choice" style="margin-top:16px"></div>`);
      [['🃏 memory match', 'memory'], ['🐍 snake', 'snake'], ['🫧 bubble wrap', 'bubbles']].forEach(([lbl, t]) => {
        const b = el(`<button class="btn">${lbl}</button>`);
        b.addEventListener('click', () => ctx.refresh({ tab: t }));
        zone.appendChild(b);
      });
      body.appendChild(zone);
      body.appendChild(el(`<p class="muted center" style="margin-top:18px">games count as rest. rest counts as progress.</p>`));
      return;
    }
    const back = el(`<button class="btn small" style="margin-bottom:12px">← arcade</button>`);
    back.addEventListener('click', () => ctx.refresh({ tab: 'menu' }));
    body.appendChild(back);
    if (tab === 'memory') memory(ctx, body);
    else if (tab === 'snake') snake(ctx, body);
    else bubbles(ctx, body);
  },
};

/* ---------- memory match ---------- */
function memory(ctx, body) {
  const EMO = ['🌵', '📼', '🍕', '🛼', '🌈', '👾', '🍒', '☎️'];
  const deck = [...EMO, ...EMO].sort(() => Math.random() - .5);
  let open = [], moves = 0, matched = 0, lock = false;
  body.appendChild(el(`<div class="game-hud"><span id="mm-moves">moves: 0</span><span id="mm-left">pairs: 0/8</span></div>`));
  const grid = el(`<div class="memory-grid"></div>`);
  deck.forEach((e2, i) => {
    const c = el(`<button class="mem-card">${e2}</button>`);
    c.addEventListener('click', () => {
      if (lock || c.classList.contains('flip') || c.classList.contains('got')) return;
      c.classList.add('flip');
      open.push(c);
      if (open.length === 2) {
        moves++;
        body.querySelector('#mm-moves').textContent = 'moves: ' + moves;
        lock = true;
        const [a, b] = open;
        setTimeout(() => {
          if (a.textContent === b.textContent) {
            a.classList.add('got'); b.classList.add('got');
            matched++;
            body.querySelector('#mm-left').textContent = `pairs: ${matched}/8`;
            if (matched === 8) {
              S.stats.gamesPlayed++;
              addXP(15, `memory in ${moves} moves`);
              save();
              toast('🃏 full match! brain: buffed');
            }
          } else { a.classList.remove('flip'); b.classList.remove('flip'); }
          open = []; lock = false;
        }, 650);
      }
    });
    grid.appendChild(c);
  });
  body.appendChild(grid);
}

/* ---------- snake ---------- */
function snake(ctx, body) {
  body.appendChild(el(`<div class="game-hud"><span id="sn-score">score: 0</span><span class="muted" style="font-size:12px">swipe or arrow keys</span></div>`));
  const cv = el(`<canvas class="game-canvas" width="340" height="340"></canvas>`);
  body.appendChild(cv);
  const g = cv.getContext('2d');
  const N = 17, CELL = 20;
  let snk = [[8, 8], [7, 8]], dir = [1, 0], next = [1, 0], food = [12, 8], score = 0, dead = false;
  const placeFood = () => {
    do { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; }
    while (snk.some(([x, y]) => x === food[0] && y === food[1]));
  };
  const draw = () => {
    g.fillStyle = getComputedStyle(document.body).getPropertyValue('--paper-2');
    g.fillRect(0, 0, 340, 340);
    g.fillStyle = '#e05252';
    g.fillRect(food[0] * CELL + 3, food[1] * CELL + 3, CELL - 6, CELL - 6);
    snk.forEach(([x, y], i) => {
      g.fillStyle = i === 0 ? '#ff6b35' : '#211d19';
      g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    });
    if (dead) {
      g.fillStyle = 'rgba(33,29,25,.75)'; g.fillRect(0, 0, 340, 340);
      g.fillStyle = '#f2ecdd'; g.font = '20px Silkscreen'; g.textAlign = 'center';
      g.fillText('GAME OVER', 170, 160);
      g.font = '12px Silkscreen';
      g.fillText('tap to restart', 170, 190);
    }
  };
  const tick = () => {
    if (dead) return;
    dir = next;
    const head = [(snk[0][0] + dir[0] + N) % N, (snk[0][1] + dir[1] + N) % N];
    if (snk.some(([x, y]) => x === head[0] && y === head[1])) {
      dead = true;
      S.stats.gamesPlayed++;
      if (score > 0) addXP(Math.min(20, score), 'snake');
      save();
      draw();
      return;
    }
    snk.unshift(head);
    if (head[0] === food[0] && head[1] === food[1]) {
      score++;
      body.querySelector('#sn-score').textContent = 'score: ' + score;
      placeFood();
    } else snk.pop();
    draw();
  };
  snakeIv = setInterval(tick, 130);
  const setDir = (x, y) => { if (x !== -dir[0] || y !== -dir[1]) next = [x, y]; };
  keyFn = e => {
    const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (map[e.key]) { e.preventDefault(); setDir(...map[e.key]); }
  };
  addEventListener('keydown', keyFn);
  let ts = null;
  cv.addEventListener('touchstart', e => { ts = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
  cv.addEventListener('touchend', e => {
    if (!ts) return;
    const dx = e.changedTouches[0].clientX - ts[0], dy = e.changedTouches[0].clientY - ts[1];
    if (Math.abs(dx) > Math.abs(dy)) setDir(Math.sign(dx), 0); else setDir(0, Math.sign(dy));
    ts = null;
  });
  cv.addEventListener('click', () => {
    if (!dead) return;
    snk = [[8, 8], [7, 8]]; dir = [1, 0]; next = [1, 0]; score = 0; dead = false;
    body.querySelector('#sn-score').textContent = 'score: 0';
    placeFood();
    clearInterval(snakeIv);
    snakeIv = setInterval(tick, 130);
  });
  draw();
}

/* ---------- bubble wrap ---------- */
function bubbles(ctx, body) {
  body.appendChild(el(`<p class="muted center" style="margin-bottom:12px">infinite bubble wrap. deeply unproductive. perfect.</p>`));
  const grid = el(`<div class="bubble-grid"></div>`);
  let popped = 0;
  const fill = () => {
    grid.innerHTML = '';
    for (let i = 0; i < 36; i++) {
      const b = el(`<button class="bub"></button>`);
      b.addEventListener('pointerdown', () => {
        if (b.classList.contains('pop')) return;
        b.classList.add('pop');
        popped++;
        try { navigator.vibrate && navigator.vibrate(8); } catch {}
        if (popped % 36 === 0) {
          S.stats.gamesPlayed++;
          addXP(5, 'sheet popped');
          save();
          setTimeout(fill, 500);
        }
      });
      grid.appendChild(b);
    }
  };
  fill();
  body.appendChild(grid);
}
