/* ═══════════ SHORTCUTS — press a button here, your device does things ═══════════ */
import { S, save, esc, el, uid, toast } from '../core.js';
import { modal, confirmModal } from '../wm.js';

const IDEAS = [
  ['🖥', 'Setup VS Code', 'On Mac: open VS Code + your project folder + a terminal, start a focus timer'],
  ['🎧', 'Study Mode', 'Turn on Do Not Disturb, play a playlist, set a 25-min timer'],
  ['😴', 'Wind Down', 'Set tomorrow\'s alarm, enable Sleep Focus, dim lights'],
  ['📍', 'Text my ETA', 'Send your live ETA to a chosen contact'],
  ['💊', 'Log meds to Health', 'Add your dose to Apple Health with one tap'],
  ['📸', 'Scan to Notes', 'Open the document scanner straight into a note'],
  ['🚕', 'Call me a ride', 'Open your taxi app with home pre-filled'],
  ['☀️', 'Morning Briefing', 'Speak today\'s weather, calendar and reminders aloud'],
];

function runShortcut(sc) {
  const base = 'shortcuts://run-shortcut?name=' + encodeURIComponent(sc.name);
  const url = sc.input ? base + '&input=text&text=' + encodeURIComponent(sc.input) : base;
  location.href = url;
}

export default {
  id: 'shortcuts', name: 'Buttons', icon: '⚡', w: 520, h: 640,
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">magic buttons</div>
      <div class="pixel-sub">runs your Apple Shortcuts — real actions on this device</div></div>`));

    const add = el(`<button class="btn primary wide" style="margin:14px 0">+ add a button</button>`);
    add.addEventListener('click', () => modal({
      title: '⚡ new magic button',
      bodyHTML: `
        <p class="muted">the name must match a shortcut in your <b>Shortcuts app</b> exactly.</p>
        <div class="two-col">
          <div><label class="fld">emoji</label><input type="text" id="sf-emoji" maxlength="4" value="⚡"></div>
          <div><label class="fld">shortcut name</label><input type="text" id="sf-name" placeholder="Setup VS Code"></div>
        </div>
        <label class="fld">text to send it (optional)</label>
        <input type="text" id="sf-input" placeholder="passed as input to the shortcut">`,
      actions: [
        { label: 'cancel', cls: 'ghost' },
        {
          label: 'save', cls: 'primary',
          onClick(sheet) {
            const name = sheet.querySelector('#sf-name').value.trim();
            if (!name) { toast('needs the shortcut\'s name'); return false; }
            S.shortcuts.push({
              id: uid(), name,
              emoji: sheet.querySelector('#sf-emoji').value.trim() || '⚡',
              input: sheet.querySelector('#sf-input').value.trim(),
            });
            save(); ctx.refresh();
          },
        },
      ],
    }));
    body.appendChild(add);

    if (S.shortcuts.length) {
      const grid = el(`<div class="tile-grid"></div>`);
      for (const sc of S.shortcuts) {
        const t = el(`
          <button class="tile"><span class="t-e">${sc.emoji}</span>
          <div class="t-n">${esc(sc.name)}</div>
          <button class="r-x">×</button></button>`);
        t.addEventListener('click', e => {
          if (e.target.classList.contains('r-x')) {
            confirmModal('remove button?', `<b>${esc(sc.name)}</b> stays in your Shortcuts app — this only removes the button.`, () => {
              S.shortcuts = S.shortcuts.filter(x => x.id !== sc.id); save(); ctx.refresh();
            });
            return;
          }
          runShortcut(sc);
        });
        grid.appendChild(t);
      }
      body.appendChild(grid);
    } else {
      body.appendChild(el(`
        <div class="empty"><div class="e-art">⚡</div>
        <div class="e-serif">no buttons yet</div>
        <div class="e-sub">make a shortcut in Apple's <b>Shortcuts app</b>, then add a button here with the same name. tap → it runs.</div></div>`));
    }

    body.appendChild(el(`<div class="section-h">💡 shortcut ideas</div>`));
    body.appendChild(el(`<p class="muted" style="margin-bottom:8px">build these in the Shortcuts app (2 min each), then add buttons for them here:</p>`));
    for (const [e2, name, desc] of IDEAS) {
      body.appendChild(el(`
        <div class="row"><span style="font-size:20px">${e2}</span>
        <div class="r-main"><div class="r-title">${name}</div><div class="r-sub">${desc}</div></div></div>`));
    }
    const openSc = el(`<button class="btn wide" style="margin-top:12px">open Shortcuts app →</button>`);
    openSc.addEventListener('click', () => location.href = 'shortcuts://');
    body.appendChild(openSc);
  },
};
