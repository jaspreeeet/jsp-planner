/* ═══════════ ORACLE — a tiny Claude living in your OS ═══════════ */
import { S, save, esc, el, toast, uid, todayKey, emit } from '../core.js';
import { openApp } from '../wm.js';
import { aiReady, ask, dayContext, taskSplit } from '../ai.js';

const CHIPS = [
  ['🗺 plan my day', 'Look at my day and suggest an order of attack: what to do first and why, keeping energy levels in mind. Max 5 lines.', true],
  ['⚡ hype me up', 'Hype me up to start working in 3 sentences. Reference my actual tasks if any.', true],
  ['🎲 fun fact', 'Tell me one delightfully weird fun fact I probably don\'t know.', false],
  ['🍳 what to eat', 'Suggest 3 easy low-effort meal ideas for someone with zero executive function right now.', false],
  ['🧹 unstick me', 'I feel stuck and scattered. Give me one tiny 2-minute action to start with, based on my day.', true],
  ['😂 tell me a joke', 'Tell me one genuinely good short joke. Not a dad joke unless it\'s elite.', false],
];

export default {
  id: 'oracle', name: 'Oracle', icon: '🔮', w: 520, h: 660,
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">the oracle</div>
      <div class="pixel-sub">a tiny claude, living in your OS · knows your day</div></div>`));

    if (!aiReady()) {
      const setup = el(`
        <div class="empty"><div class="e-art">🔮</div>
        <div class="e-serif">the oracle sleeps</div>
        <div class="e-sub">add your Anthropic API key in <b>Sync → claude brain</b> to wake it. it runs on the cheapest model — a question costs a fraction of a cent.</div>
        <button class="btn primary small">open sync →</button></div>`);
      setup.querySelector('.btn').addEventListener('click', () => openApp('sync'));
      body.appendChild(setup);
      return;
    }

    const chat = el(`<div style="min-height:180px" data-chat></div>`);
    const chips = el(`<div class="chip-row" style="margin:12px 0"></div>`);
    const inputRow = el(`
      <div style="display:flex;gap:8px;position:sticky;bottom:0;background:var(--paper);padding:10px 0">
        <input type="text" id="or-in" placeholder="ask anything…" style="flex:1">
        <button class="btn primary">✨</button>
      </div>`);

    const bubble = (text, who) => {
      const b = el(`
        <div class="card flat" style="margin-bottom:10px;${who === 'me'
          ? 'background:var(--paper-2);margin-left:36px'
          : 'border-color:var(--purple);box-shadow:3px 3px 0 var(--purple);margin-right:24px'}">
          <div class="pixel-sub" style="margin-bottom:4px">${who === 'me' ? 'you' : '🔮 oracle'}</div>
          <div style="font-size:14px;line-height:1.55;white-space:pre-wrap;user-select:text;-webkit-user-select:text">${esc(text)}</div>
        </div>`);
      chat.appendChild(b);
      b.scrollIntoView({ block: 'end' });
      return b;
    };

    const go = async (prompt, withContext) => {
      bubble(prompt, 'me');
      const wait = bubble('…consulting the crystal ball…', 'oracle');
      try {
        const answer = await ask(prompt, { system: withContext ? 'Context about the user\'s day:\n' + dayContext() : '' });
        wait.remove();
        bubble(answer, 'oracle');
      } catch (e) {
        wait.remove();
        bubble('✦ ' + e.message, 'oracle');
      }
    };

    for (const [lbl, prompt, withCtx] of CHIPS) {
      const c = el(`<button class="chip">${lbl}</button>`);
      c.addEventListener('click', () => go(prompt, withCtx));
      chips.appendChild(c);
    }

    const send = () => {
      const input = inputRow.querySelector('#or-in');
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      go(q, true);
    };
    inputRow.querySelector('.btn').addEventListener('click', send);
    inputRow.querySelector('#or-in').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    if (!chat.children.length) {
      chat.appendChild(el(`<p class="muted center" style="padding:16px 8px">it can see today's tasks, meds, mood & chains — ask it to plan, hype, unstick, or amuse you. tap a chip ↓</p>`));
    }
    body.append(chat, chips, inputRow);
  },
};

/* used by Unstuck — AI task splitter that plants steps into today */
export async function splitIntoTasks(taskText, onDone) {
  toast('🔮 splitting it…');
  try {
    const out = await taskSplit(taskText);
    const steps = out.split('\n').map(s => s.replace(/^[-•\d.)\s]+/, '').trim()).filter(s => s.length > 2).slice(0, 5);
    if (!steps.length) throw new Error('the oracle mumbled — try again');
    for (const s of steps) {
      S.tasks.push({ id: uid(), text: '🌱 ' + s, dateKey: todayKey(), energy: 'low', time: '', ts: Date.now() });
    }
    save(); emit('data');
    toast(`⛏ split into ${steps.length} tiny steps → today's plan`);
    if (onDone) onDone(steps);
  } catch (e) {
    toast('✦ ' + e.message);
  }
}
