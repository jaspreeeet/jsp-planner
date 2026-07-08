/* ═══════════ SELF-CARE — breathe · ground · focus · soft words ═══════════ */
import { S, save, esc, el, addXP, toast } from '../core.js';
import { openApp } from '../wm.js';

const AFFIRM = [
  'you are not behind. you are on your own timeline.',
  'done is beautiful. perfect is a mirage.',
  'your brain is not broken — it just runs a different, more interesting OS.',
  'rest is part of the work.',
  'you\'ve survived 100% of your worst days.',
  'small steps still move you forward.',
  'the task is scary until it\'s started. then it\'s just a task.',
  'you\'re allowed to take up space, time, and two more snacks.',
  'future-you is already proud of present-you for trying.',
  'a messy attempt beats a perfect plan every time.',
];
const ROMANTIC = [
  'light a candle before you study — make it a scene from a film.',
  'plate your snack like a tiny café. you deserve garnish.',
  'name today\'s walk something dramatic. "the promenade".',
  'play the mixtape and pretend the montage has started.',
  'take one photo of something ordinary that looked pretty today.',
  'drink your water from your fanciest glass. hydration, but couture.',
];

let iv = null, pomoIv = null;

export default {
  id: 'selfcare', name: 'Care', icon: '🫧', w: 500, h: 640,
  onClose() { clearInterval(iv); clearInterval(pomoIv); },
  render(ctx, params) {
    clearInterval(iv); clearInterval(pomoIv);
    const { body } = ctx;
    const tab = (params && params.tab) || 'breathe';
    body.appendChild(el(`
      <div><div class="serif-h">self-care</div>
      <div class="pixel-sub">maintenance for the main character</div></div>`));

    const tabs = el(`
      <div class="tabs" style="margin-top:12px">
        <button data-t="breathe" class="${tab === 'breathe' ? 'on' : ''}">🫧 breathe</button>
        <button data-t="ground" class="${tab === 'ground' ? 'on' : ''}">🌍 ground</button>
        <button data-t="focus" class="${tab === 'focus' ? 'on' : ''}">🍅 focus</button>
        <button data-t="soft" class="${tab === 'soft' ? 'on' : ''}">💌 soft words</button>
      </div>`);
    tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => ctx.refresh({ tab: b.dataset.t })));
    body.appendChild(tabs);

    if (tab === 'breathe') renderBreathe(ctx, body);
    else if (tab === 'ground') renderGround(ctx, body);
    else if (tab === 'focus') renderFocus(ctx, body);
    else renderSoft(ctx, body);
  },
};

function renderBreathe(ctx, body) {
  body.appendChild(el(`<p class="muted center" style="margin-top:10px">box breathing · 4-4-4-4 · follow the circle</p>`));
  const stage = el(`
    <div class="breath-stage">
      <div class="breath-circle" id="bc">ready?</div>
      <button class="btn primary" style="margin-top:26px" id="bc-go">begin</button>
      <div class="pixel-sub" id="bc-count" style="margin-top:12px"></div>
    </div>`);
  body.appendChild(stage);
  const circle = stage.querySelector('#bc');
  const count = stage.querySelector('#bc-count');
  stage.querySelector('#bc-go').addEventListener('click', function () {
    this.classList.add('hidden');
    const phases = [
      ['breathe in…', 1.45], ['hold', 1.45], ['breathe out…', 1], ['hold', 1],
    ];
    let p = 0, rounds = 0;
    const step = () => {
      const [label, scale] = phases[p % 4];
      circle.textContent = label;
      circle.style.transform = `scale(${scale})`;
      p++;
      if (p % 4 === 0) {
        rounds++;
        count.textContent = `round ${rounds} / 4`;
        if (rounds >= 4) {
          clearInterval(iv);
          circle.textContent = 'lovely ✓';
          circle.style.transform = 'scale(1)';
          S.stats.breaths++;
          addXP(10, 'breathed');
          save();
        }
      }
    };
    step();
    iv = setInterval(step, 4000);
  });
}

const GROUND_STEPS = [
  ['👀', '5 things you can SEE', 'look around slowly. name them out loud or in your head.'],
  ['✋', '4 things you can TOUCH', 'your sleeve, the desk, your hair, the chair…'],
  ['👂', '3 things you can HEAR', 'near sounds, far sounds, your own breath.'],
  ['👃', '2 things you can SMELL', 'or two smells you love, from memory.'],
  ['👅', '1 thing you can TASTE', 'sip something. or just notice.'],
];
function renderGround(ctx, body) {
  let i = 0;
  const card = el(`
    <div class="card center" style="margin-top:14px">
      <div class="e-art" style="font-size:44px" id="g-e"></div>
      <div class="serif-h" id="g-t" style="font-size:24px"></div>
      <p class="muted" id="g-s"></p>
      <button class="btn primary" id="g-next" style="margin-top:14px">next →</button>
    </div>`);
  body.appendChild(card);
  const paint = () => {
    const [e2, t, s] = GROUND_STEPS[i];
    card.querySelector('#g-e').textContent = e2;
    card.querySelector('#g-t').textContent = t;
    card.querySelector('#g-s').textContent = s;
    card.querySelector('#g-next').textContent = i === GROUND_STEPS.length - 1 ? 'done ✓' : 'next →';
  };
  card.querySelector('#g-next').addEventListener('click', () => {
    if (i < GROUND_STEPS.length - 1) { i++; paint(); }
    else {
      addXP(10, 'grounded');
      toast('back in the room. you did great 🌍');
      ctx.refresh({ tab: 'breathe' });
    }
  });
  paint();
}

function renderFocus(ctx, body) {
  body.appendChild(el(`<p class="muted center" style="margin-top:10px">25 on · 5 off. the mixtape makes a great body double.</p>`));
  let secs = 25 * 60, mode = 'focus', running = false;
  const zone = el(`
    <div class="center" style="padding:16px 0">
      <div class="timer-big" id="po-t">25:00</div>
      <div class="pixel-sub" id="po-m" style="margin:8px 0 16px">focus round</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn primary" id="po-go">start</button>
        <button class="btn" id="po-reset">reset</button>
        <button class="btn" id="po-tape">📼</button>
      </div>
    </div>`);
  body.appendChild(zone);
  const disp = zone.querySelector('#po-t'), modeEl = zone.querySelector('#po-m'), go = zone.querySelector('#po-go');
  const paint = () => disp.textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
  go.addEventListener('click', () => {
    running = !running;
    go.textContent = running ? 'pause' : 'resume';
    if (running) {
      pomoIv = setInterval(() => {
        secs--;
        paint();
        if (secs <= 0) {
          clearInterval(pomoIv); running = false;
          if (mode === 'focus') {
            S.stats.pomos++;
            addXP(20, 'pomodoro!');
            save();
            mode = 'break'; secs = 5 * 60;
            modeEl.textContent = 'break — stand up, look far away';
            go.textContent = 'start break';
          } else {
            mode = 'focus'; secs = 25 * 60;
            modeEl.textContent = 'focus round';
            go.textContent = 'start';
            toast('break over — one more? 🍅');
          }
          paint();
        }
      }, 1000);
    } else clearInterval(pomoIv);
  });
  zone.querySelector('#po-reset').addEventListener('click', () => {
    clearInterval(pomoIv); running = false; mode = 'focus'; secs = 25 * 60;
    modeEl.textContent = 'focus round'; go.textContent = 'start'; paint();
  });
  zone.querySelector('#po-tape').addEventListener('click', () => openApp('mixtape'));
}

function renderSoft(ctx, body) {
  const a = AFFIRM[Math.floor(Math.random() * AFFIRM.length)];
  const r = ROMANTIC[Math.floor(Math.random() * ROMANTIC.length)];
  body.appendChild(el(`<div class="affirm" style="margin-top:8px">“${a}”</div>`));
  body.appendChild(el(`<div class="section-h">🕯 romanticise today</div>`));
  body.appendChild(el(`<p class="muted" style="font-size:14px;line-height:1.6">${r}</p>`));
  const btn = el(`<button class="btn wide" style="margin-top:16px">↻ another one</button>`);
  btn.addEventListener('click', () => ctx.refresh({ tab: 'soft' }));
  body.appendChild(btn);
}
