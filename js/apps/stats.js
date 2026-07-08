/* ═══════════ STATS — your life, gamified & framed ═══════════ */
import { S, el, esc, levelOf, xpForLevel, ACHIEVEMENTS, daysAgoKey, todayKey } from '../core.js';

export default {
  id: 'stats', name: 'Stats', icon: '🏆', w: 520, h: 660,
  render(ctx) {
    const { body } = ctx;
    const lvl = levelOf(S.xp.total);
    const cur = S.xp.total - xpForLevel(lvl);
    const need = xpForLevel(lvl + 1) - xpForLevel(lvl);
    const days = Math.max(1, Math.round((Date.now() - (S.profile.joined || Date.now())) / 86400000) + 1);

    body.appendChild(el(`
      <div><div class="serif-h">player card</div>
      <div class="pixel-sub">day ${days} of the save file</div></div>`));

    body.appendChild(el(`
      <div class="card" style="margin-top:14px">
        <div class="lvl-ring">
          <div class="lvl-num">LV${lvl}</div>
          <div style="flex:1">
            <div class="pixel-sub" style="margin-bottom:6px">${cur} / ${need} xp to level ${lvl + 1}</div>
            <div class="pbar"><i style="width:${Math.min(100, Math.round(cur / need * 100))}%"></i></div>
            <div class="pixel-sub" style="margin-top:6px">+${S.xp.today} xp today · ${S.xp.total} lifetime</div>
          </div>
        </div>
      </div>`));

    // activity heat strip: last 28 days of "did anything"
    const activeDays = new Set();
    S.tasks.filter(t => t.done).forEach(t => activeDays.add(t.dateKey));
    S.journal.forEach(j => activeDays.add(j.dateKey));
    S.meds.forEach(m => Object.keys(m.taken || {}).forEach(k => { if ((m.taken[k] || []).length) activeDays.add(k); }));
    S.trackers.forEach(t => Object.keys(t.log || {}).forEach(k => activeDays.add(k)));
    let strip = '<div style="display:grid;grid-template-columns:repeat(28,1fr);gap:3px">';
    for (let i = 27; i >= 0; i--) {
      const k = daysAgoKey(i);
      const on = activeDays.has(k);
      strip += `<div title="${k}" style="aspect-ratio:1;border-radius:3px;border:1.5px solid var(--ink);background:${on ? 'var(--accent)' : 'var(--paper-3)'};${k === todayKey() ? 'outline:2px solid var(--blue)' : ''}"></div>`;
    }
    strip += '</div>';
    body.appendChild(el(`<div class="card"><div class="card-title">🗓 last 28 days</div>${strip}
      <div class="pixel-sub" style="margin-top:8px">${activeDays.size ? [...activeDays].filter(k => k >= daysAgoKey(27)).length + ' active days — showing up counts' : 'your story starts today'}</div></div>`));

    const st = S.stats;
    body.appendChild(el(`
      <div class="card"><div class="card-title">📊 lifetime numbers</div>
      <div class="tiny-stats" style="grid-template-columns:repeat(3,1fr)">
        <div class="tstat"><div class="ts-n">${st.tasksDone}</div><div class="ts-l">tasks done</div></div>
        <div class="tstat"><div class="ts-n">${st.medsTaken}</div><div class="ts-l">doses taken</div></div>
        <div class="tstat"><div class="ts-n">${st.journalEntries}</div><div class="ts-l">journal lines</div></div>
        <div class="tstat"><div class="ts-n">${st.captures}</div><div class="ts-l">brain dumps</div></div>
        <div class="tstat"><div class="ts-n">${st.pomos}</div><div class="ts-l">pomodoros</div></div>
        <div class="tstat"><div class="ts-n">${st.gamesPlayed}</div><div class="ts-l">games played</div></div>
      </div></div>`));

    body.appendChild(el(`<div class="section-h">🏅 achievements · ${S.achievements.length}/${ACHIEVEMENTS.length}</div>`));
    const grid = el(`<div class="ach-grid"></div>`);
    for (const a of ACHIEVEMENTS) {
      const got = S.achievements.includes(a.id);
      grid.appendChild(el(`
        <div class="ach ${got ? '' : 'locked'}">
          <div class="a-e">${a.e}</div><div class="a-n">${esc(a.n)}</div>
        </div>`));
    }
    body.appendChild(grid);
  },
};
