/* ═══════════ UNSTUCK — for analysis paralysis & frozen moments ═══════════ */
import { S, save, todayKey, esc, el, addXP, uid, toast, emit } from '../core.js';
import { modal, openApp } from '../wm.js';

const WHEEL_COLORS = ['#ff6b35', '#4a8fd9', '#4caf7d', '#9b7ede', '#e88bb5', '#ffb347'];

export default {
  id: 'unstuck', name: 'Unstuck', icon: '🌀', w: 520, h: 660,
  badge() { return S.inbox.length > 5 ? S.inbox.length : 0; },
  render(ctx, params) {
    const { body } = ctx;
    const tab = (params && params.tab) || 'stuck';

    body.appendChild(el(`
      <div><div class="serif-h">unstuck</div>
      <div class="pixel-sub">when the brain buffers, borrow mine</div></div>`));

    const tabs = el(`
      <div class="tabs" style="margin-top:12px">
        <button data-t="stuck" class="${tab === 'stuck' ? 'on' : ''}">🌀 i'm stuck</button>
        <button data-t="wheel" class="${tab === 'wheel' ? 'on' : ''}">🎡 pick for me</button>
        <button data-t="inbox" class="${tab === 'inbox' ? 'on' : ''}">⚡ inbox ${S.inbox.length ? '(' + S.inbox.length + ')' : ''}</button>
      </div>`);
    tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => ctx.refresh({ tab: b.dataset.t })));
    body.appendChild(tabs);

    if (tab === 'stuck') renderStuck(ctx, body);
    else if (tab === 'wheel') renderWheel(ctx, body);
    else renderInbox(ctx, body);
  },
};

/* ---------- "I'm stuck" flow ---------- */
function renderStuck(ctx, body) {
  body.appendChild(el(`<p class="muted" style="margin-bottom:12px">no thinking required. just tap the one that feels true:</p>`));
  const zone = el(`<div class="big-choice"></div>`);
  const options = [
    {
      lbl: '😵‍💫 too many options, can\'t choose',
      act: () => ctx.refresh({ tab: 'wheel' }),
    },
    {
      lbl: '🗻 task feels too big to start',
      act: () => modal({
        title: '🔪 shrink it',
        bodyHTML: `
          <p class="muted">what's the task?</p>
          <input type="text" id="sh-task" placeholder="e.g. study for physics exam" style="margin:8px 0">
          <p class="muted">now — what would <b>2 minutes</b> of it look like? (open the book counts. sitting at the desk counts.)</p>
          <input type="text" id="sh-tiny" placeholder="e.g. open notes to chapter 4" style="margin:8px 0">`,
        actions: [
          { label: 'cancel', cls: 'ghost' },
          {
            label: 'make it today\'s task', cls: 'primary',
            onClick(sheet) {
              const tiny = sheet.querySelector('#sh-tiny').value.trim() || sheet.querySelector('#sh-task').value.trim();
              if (!tiny) return false;
              S.tasks.push({ id: uid(), text: '🌱 ' + tiny, dateKey: todayKey(), energy: 'low', time: '', ts: Date.now() });
              save(); emit('data');
              toast('tiny version planted. that IS the task now.');
              addXP(6, 'shrunk it');
            },
          },
        ],
      }),
    },
    {
      lbl: '🚀 i know what to do, can\'t start',
      act: () => fiveMinTimer(ctx),
    },
    {
      lbl: '🧠 head is too full / noisy',
      act: () => { document.getElementById('dock-capture').click(); },
    },
    {
      lbl: '🪫 no energy for anything',
      act: () => modal({
        title: '🪫 low battery protocol',
        bodyHTML: `
          <div class="affirm">rest is a task and you're allowed to do it properly.</div>
          <p class="muted center">pick one: drink water · lie down for 10 min with the mixtape · step outside for 2 min. that's the whole job.</p>`,
        actions: [
          { label: '📼 mixtape', cls: '', onClick: () => openApp('mixtape') },
          { label: 'ok 💛', cls: 'primary' },
        ],
      }),
    },
    {
      lbl: '😰 spiralling / anxious',
      act: () => openApp('selfcare', { tab: 'ground' }),
    },
  ];
  for (const o of options) {
    const b = el(`<button class="btn">${o.lbl}</button>`);
    b.addEventListener('click', o.act);
    zone.appendChild(b);
  }
  body.appendChild(zone);
}

function fiveMinTimer(ctx) {
  let secs = 300, iv;
  const m = modal({
    title: '🚀 the 5-minute deal',
    bodyHTML: `
      <p class="muted center">do the thing for 5 minutes. if it still sucks after, you're free to stop — no guilt. (you won't stop.)</p>
      <div class="timer-big" id="fm-t" style="margin:14px 0">5:00</div>
      <div class="center"><button class="btn primary" id="fm-go">start</button></div>`,
    actions: [{ label: 'close', cls: 'ghost', onClick: () => clearInterval(iv) }],
    onMount(sheet) {
      const disp = sheet.querySelector('#fm-t');
      sheet.querySelector('#fm-go').addEventListener('click', function () {
        this.disabled = true;
        iv = setInterval(() => {
          secs--;
          disp.textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
          if (secs <= 0) {
            clearInterval(iv);
            disp.textContent = 'GO ON?';
            addXP(12, '5-min launch');
            toast('🚀 you started. that was the hard part.');
          }
        }, 1000);
      });
    },
  });
}

/* ---------- wheel ---------- */
function renderWheel(ctx, body) {
  const todays = S.tasks.filter(t => t.dateKey === todayKey() && !t.done).map(t => t.text);
  let items = todays.length >= 2 ? todays.slice(0, 6) : [];

  body.appendChild(el(`<p class="muted" style="margin:12px 0 4px">${items.length ? 'loaded with today\'s tasks — or type your own:' : 'type choices, one per line:'}</p>`));
  const ta = el(`<textarea rows="3" placeholder="pizza\npasta\nsalad">${esc(items.join('\n'))}</textarea>`);
  body.appendChild(ta);

  const wrap = el(`
    <div class="wheel-wrap">
      <div class="wheel-pointer">▼</div>
      <div class="wheel" id="wheel"></div>
      <button class="btn primary" id="spin-btn">SPIN — decide for me</button>
      <div class="serif-h" id="wheel-result" style="min-height:36px"></div>
    </div>`);
  body.appendChild(wrap);

  const wheel = wrap.querySelector('#wheel');
  let rot = 0;
  const paint = list => {
    if (list.length < 2) { wheel.style.background = 'var(--paper-3)'; return; }
    const seg = 360 / list.length;
    wheel.style.background = `conic-gradient(${list.map((_, i) =>
      `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})`;
  };
  paint(items.length ? items : []);
  ta.addEventListener('input', () => paint(ta.value.split('\n').map(s => s.trim()).filter(Boolean)));

  wrap.querySelector('#spin-btn').addEventListener('click', () => {
    const list = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (list.length < 2) { toast('need at least 2 options!'); return; }
    paint(list);
    const seg = 360 / list.length;
    const winner = Math.floor(Math.random() * list.length);
    // land pointer (top) in middle of winner segment
    rot += 1440 + (360 - (winner * seg + seg / 2)) - (rot % 360);
    wheel.style.transform = `rotate(${rot}deg)`;
    wrap.querySelector('#wheel-result').textContent = '…';
    setTimeout(() => {
      wrap.querySelector('#wheel-result').textContent = '→ ' + list[winner];
      addXP(3, 'decision made');
    }, 3600);
  });
}

/* ---------- inbox triage ---------- */
function renderInbox(ctx, body) {
  if (!S.inbox.length) {
    body.appendChild(el(`
      <div class="empty"><div class="e-art">🌊</div>
      <div class="e-serif">inbox zero, brain calm</div>
      <div class="e-sub">everything you dump with the big <b>+</b> button lands here for sorting later.</div></div>`));
    return;
  }
  body.appendChild(el(`<p class="muted" style="margin:12px 0">one at a time. where does each thought live?</p>`));
  const item = S.inbox[0];
  const card = el(`
    <div class="card">
      <div class="pixel-sub">${esc(item.tag)} · ${S.inbox.length} left</div>
      <div class="affirm" style="padding:14px 4px">“${esc(item.text)}”</div>
      <div class="big-choice">
        <button class="btn" data-act="task">▤ make it a task for today</button>
        <button class="btn" data-act="journal">✎ log it in the journal</button>
        <button class="btn" data-act="collect">🗂 file into a collection…</button>
        <button class="btn" data-act="trash">🗑 it served its purpose, let it go</button>
      </div>
    </div>`);
  const done = (msg) => {
    S.inbox = S.inbox.filter(x => x.id !== item.id);
    save(); emit('data');
    if (msg) toast(msg);
    addXP(3, 'sorted');
    ctx.refresh({ tab: 'inbox' });
  };
  card.querySelector('[data-act=task]').addEventListener('click', () => {
    S.tasks.push({ id: uid(), text: item.text, dateKey: todayKey(), energy: 'mid', time: '', ts: Date.now() });
    done('→ today\'s plan');
  });
  card.querySelector('[data-act=journal]').addEventListener('click', () => {
    S.journal.push({ id: uid(), sig: 'note', text: item.text, dateKey: todayKey(), done: false, ts: Date.now() });
    S.stats.journalEntries++;
    done('→ journal');
  });
  card.querySelector('[data-act=collect]').addEventListener('click', () => {
    if (!S.collections.length) { toast('make a collection first (Collect app)'); return; }
    modal({
      title: '🗂 file under…',
      bodyHTML: `<div class="big-choice">${S.collections.map(c =>
        `<button class="btn" data-col="${c.id}">${c.emoji} ${esc(c.name)}</button>`).join('')}</div>`,
      onMount(sheet, close) {
        sheet.querySelectorAll('[data-col]').forEach(b => b.addEventListener('click', () => {
          const col = S.collections.find(c => c.id === b.dataset.col);
          col.items.unshift({ id: uid(), text: item.text, ts: Date.now(), fav: false });
          close(); done(`→ ${col.name}`);
        }));
      },
      actions: [{ label: 'cancel', cls: 'ghost' }],
    });
  });
  card.querySelector('[data-act=trash]').addEventListener('click', () => done('released 🕊'));
  body.appendChild(card);
}
