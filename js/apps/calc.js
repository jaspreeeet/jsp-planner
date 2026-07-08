/* ═══════════ CALC — a pocket calculator from 1987 ═══════════ */
import { el } from '../core.js';

function evaluate(expr) {
  if (!/^[0-9+\-*/().%\s]+$/.test(expr)) return null;
  try {
    const v = Function('"use strict";return (' + expr.replace(/%/g, '/100') + ')')();
    if (typeof v !== 'number' || !isFinite(v)) return null;
    return Math.round(v * 1e10) / 1e10;
  } catch { return null; }
}

export default {
  id: 'calc', name: 'Calc', icon: '🧮', w: 340, h: 560,
  render(ctx) {
    const { body } = ctx;
    let expr = '', last = '';

    const disp = el(`
      <div class="card flat" style="background:var(--paper-2);text-align:right;padding:14px;overflow:hidden">
        <div class="pixel-sub" data-hist style="min-height:14px">jsp·os pocket calc</div>
        <div style="font-family:var(--mono);font-size:44px;line-height:1.1;word-break:break-all" data-main>0</div>
      </div>`);
    body.appendChild(disp);
    const main = disp.querySelector('[data-main]');
    const hist = disp.querySelector('[data-hist]');

    const KEYS = [
      ['C', '(', ')', '÷'],
      ['7', '8', '9', '×'],
      ['4', '5', '6', '−'],
      ['1', '2', '3', '+'],
      ['%', '0', '.', '='],
    ];
    const grid = el(`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px"></div>`);
    const paint = () => { main.textContent = expr || '0'; };
    for (const row of KEYS) for (const k of row) {
      const isOp = '÷×−+='.includes(k);
      const b = el(`<button class="btn ${k === '=' ? 'primary' : ''} ${k === 'C' ? 'blue' : ''}" style="font-size:18px;padding:14px 0;font-family:var(--mono)">${k}</button>`);
      b.addEventListener('click', () => {
        if (k === 'C') { expr = ''; hist.textContent = 'cleared'; }
        else if (k === '=') {
          const v = evaluate(expr);
          if (v === null) { hist.textContent = 'hmm, that\'s not maths'; }
          else { hist.textContent = expr + ' ='; expr = String(v); last = String(v); }
        } else {
          const map = { '÷': '/', '×': '*', '−': '-' };
          expr += map[k] || k;
        }
        paint();
      });
      grid.appendChild(b);
    }
    body.appendChild(grid);
    body.appendChild(el(`<p class="muted center" style="margin-top:12px">solar powered (by vibes)</p>`));
  },
};
