/* ═══════════ SYNC & SETTINGS — iCloud via Shortcuts · backups · reminders ═══════════ */
import { S, save, saveNow, kvSet, esc, el, toast, todayKey, photoAll, photoPut } from '../core.js';
import { modal } from '../wm.js';
import { cloudReady, getCurrentUser, signInWithPassword, signUpWithPassword, disconnect, push, pullIfNewer } from '../cloud.js';
import { aiReady, ask } from '../ai.js';

function stateJSON() { return JSON.stringify({ app: 'jsp-os', ts: Date.now(), state: JSON.parse(JSON.stringify(S)) }); }

async function fullBackupJSON() {
  const photos = await photoAll();
  const packed = [];
  for (const p of photos) {
    const b64 = await new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(p.blob);
    });
    packed.push({ id: p.id, album: p.album, ts: p.ts, b64 });
  }
  return JSON.stringify({ app: 'jsp-os', ts: Date.now(), state: JSON.parse(JSON.stringify(S)), photos: packed });
}

async function restoreFromJSON(text) {
  let data;
  try { data = JSON.parse(text); } catch { toast('that doesn\'t look like a backup 🤔'); return false; }
  if (!data || data.app !== 'jsp-os' || !data.state) { toast('that doesn\'t look like a backup 🤔'); return false; }
  await kvSet('state', data.state);
  if (Array.isArray(data.photos)) {
    for (const p of data.photos) {
      const blob = await (await fetch(p.b64)).blob();
      await photoPut({ id: p.id, blob, album: p.album, ts: p.ts });
    }
  }
  toast('restored ✓ reloading…');
  setTimeout(() => location.reload(), 900);
  return true;
}

function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ---- meds → .ics with native alarms ---- */
function medsICS() {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jsp-os//planner//EN', 'X-WR-CALNAME:JSP Meds'];
  const dk = todayKey().replace(/-/g, '');
  let n = 0;
  for (const m of S.meds) for (const t of m.times) {
    const hm = t.replace(':', '') + '00';
    lines.push(
      'BEGIN:VEVENT',
      `UID:jsp-med-${m.id}-${t.replace(':', '')}@jsp-os`,
      `DTSTART:${dk}T${hm}`,
      `RRULE:FREQ=DAILY`,
      `SUMMARY:💊 ${m.name}${m.dose ? ' — ' + m.dose : ''}`,
      m.why ? `DESCRIPTION:why: ${m.why.replace(/\n/g, ' ')}` : 'DESCRIPTION:logged in JSP·OS',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:💊 ${m.name}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT');
    n++;
  }
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n'), count: n };
}

function pasteRestoreModal() {
  modal({
    title: '📥 restore from clipboard',
    bodyHTML: `
      <p class="muted">your backup is on the clipboard. tap the button and allow paste — I'll do the rest.</p>
      <div class="center" style="margin-top:12px"><button class="btn primary" id="pr-go">📋 paste & restore</button></div>
      <textarea id="pr-manual" rows="3" placeholder="…or long-press and paste here manually" style="margin-top:12px"></textarea>`,
    onMount(sheet, close) {
      sheet.querySelector('#pr-go').addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (await restoreFromJSON(text)) close();
        } catch { toast('couldn\'t read clipboard — paste manually below'); }
      });
      sheet.querySelector('#pr-manual').addEventListener('input', async e => {
        if (e.target.value.length > 50) { if (await restoreFromJSON(e.target.value)) close(); }
      });
    },
    actions: [{ label: 'cancel', cls: 'ghost' }],
  });
}

export default {
  id: 'sync', name: 'Sync', icon: '☁️', w: 540, h: 680,
  render(ctx, params) {
    const { body } = ctx;
    if (params && params.paste) { setTimeout(pasteRestoreModal, 300); }

    body.appendChild(el(`
      <div><div class="serif-h">sync & settings</div>
      <div class="pixel-sub">your data lives on your devices — you hold the keys</div></div>`));

    /* --- personalisation --- */
    body.appendChild(el(`<div class="section-h">✨ make it yours</div>`));
    const pers = el(`
      <div class="card">
        <label class="fld" style="margin-top:0">what should I call you?</label>
        <input type="text" id="st-name" value="${esc(S.settings.greetName || '')}" placeholder="your name / nickname">
        <label class="fld">colour theme</label>
        <div class="chip-row" id="st-themes"></div>
      </div>`);
    pers.querySelector('#st-name').addEventListener('change', e => {
      S.settings.greetName = e.target.value.trim(); save(); toast('noted 💛');
    });
    const THEMES = [
      ['cream', '🏖 poolside'], ['night', '🌙 night'], ['miami', '🌴 miami'],
      ['matcha', '🍵 matcha'], ['ocean', '🌊 ocean'], ['blush', '🌸 blush'], ['terminal', '👾 terminal'],
    ];
    const themeZone = pers.querySelector('#st-themes');
    const curTheme = S.settings.theme || 'cream';
    for (const [id, lbl] of THEMES) {
      const c = el(`<button class="chip ${curTheme === id ? 'on' : ''}">${lbl}</button>`);
      c.addEventListener('click', () => {
        S.settings.theme = id;
        document.body.dataset.theme = id;
        themeZone.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
        c.classList.add('on');
        save(); toast(lbl + ' — looking good');
      });
      themeZone.appendChild(c);
    }
    const vibes = el(`
      <div class="chip-row" style="margin-top:10px">
        <button class="chip ${S.settings.sfx !== false ? 'on' : ''}" data-v="sfx">🔊 sounds</button>
        <button class="chip ${S.settings.crt ? 'on' : ''}" data-v="crt">📺 crt mode</button>
      </div>`);
    vibes.querySelector('[data-v=sfx]').addEventListener('click', function () {
      S.settings.sfx = S.settings.sfx === false;
      this.classList.toggle('on', S.settings.sfx !== false);
      save();
    });
    vibes.querySelector('[data-v=crt]').addEventListener('click', function () {
      S.settings.crt = !S.settings.crt;
      document.body.classList.toggle('crt', S.settings.crt);
      this.classList.toggle('on', S.settings.crt);
      save();
    });
    pers.appendChild(vibes);
    body.appendChild(pers);

    /* --- account sync (GitHub gist) --- */
    body.appendChild(el(`<div class="section-h">🌩 account sync — automatic</div>`));
    if (cloudReady()) {
      const g = S.settings?.cloud || {};
      const userEmail = getCurrentUser().email;
      const card = el(`
        <div class="card" style="border-color:var(--green)">
          <div class="card-title">✓ synced as ${esc(userEmail)}
            <span class="ct-spacer"></span>
            <button class="btn small ghost" data-out>disconnect</button>
          </div>
          <p class="muted">changes push automatically ~25s after you make them, and every launch pulls the newest version. it just works.</p>
          <div class="pixel-sub" style="margin:8px 0">last push: ${g.lastPush ? new Date(g.lastPush).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'not yet'} · last pull: ${g.lastPull ? new Date(g.lastPull).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'not yet'}</div>
          <button class="btn wide" data-now>⟳ sync now</button>
        </div>`);
      card.querySelector('[data-now]').addEventListener('click', async () => {
        toast('syncing…');
        try {
          const pulled = await pullIfNewer();
          if (pulled) { toast('newer version pulled ✓ reloading'); setTimeout(() => location.reload(), 800); return; }
          await push();
          toast('pushed ✓ all devices will pick it up');
          ctx.refresh(params);
        } catch (e2) { toast('✦ ' + e2.message); }
      });
      card.querySelector('[data-out]').addEventListener('click', async () => { await disconnect(); ctx.refresh(params); });
      body.appendChild(card);
    } else {
      const card = el(`
        <div class="card" id="login-card">
          <p class="muted" style="margin-bottom:10px">log in once per device to sync your whole planner automatically.</p>
          <input type="email" id="login-email" placeholder="you@example.com" class="fld" style="margin-bottom:10px; width:100%; box-sizing: border-box;">
          <input type="password" id="login-password" placeholder="Password" class="fld" style="margin-bottom:10px; width:100%; box-sizing: border-box;">
          <div class="two-col" style="gap:10px; display:flex;">
            <button class="btn primary wide" id="login-btn" style="flex:1">Log In</button>
            <button class="btn ghost wide" id="signup-btn" style="flex:1">Sign Up</button>
          </div>
          <p class="muted" style="margin-top:8px">secure email/password login via Supabase.</p>
        </div>`);
      
      card.querySelector('#login-btn').addEventListener('click', async () => {
        const email = card.querySelector('#login-email').value.trim();
        const password = card.querySelector('#login-password').value;
        if (!email || !password) { toast('Please enter email and password'); return; }
        try {
          card.querySelector('#login-btn').disabled = true;
          await signInWithPassword(email, password);
          toast('Logged in successfully ✓');
          ctx.refresh(params);
        } catch (e) {
          toast('Error: ' + e.message);
          card.querySelector('#login-btn').disabled = false;
        }
      });

      card.querySelector('#signup-btn').addEventListener('click', async () => {
        const email = card.querySelector('#login-email').value.trim();
        const password = card.querySelector('#login-password').value;
        if (!email || !password) { toast('Please enter email and password'); return; }
        try {
          card.querySelector('#signup-btn').disabled = true;
          await signUpWithPassword(email, password);
          toast('Account created successfully ✓');
          ctx.refresh(params);
        } catch (e) {
          toast('Error: ' + e.message);
          card.querySelector('#signup-btn').disabled = false;
        }
      });

      body.appendChild(card);
    }

    /* --- claude brain --- */
    body.appendChild(el(`<div class="section-h">🔮 claude brain</div>`));
    const brain = el(`
      <div class="card" ${aiReady() ? 'style="border-color:var(--purple)"' : ''}>
        ${aiReady()
          ? `<div class="card-title">✓ the oracle is awake<span class="ct-spacer"></span><button class="btn small ghost" data-forget>forget key</button></div>
             <p class="muted">powers the 🔮 Oracle app, ✨ med fun-facts and task-splitting. runs on Haiku — a question costs a fraction of a cent.</p>
             <button class="btn wide" data-test style="margin-top:8px">🪄 test it</button>`
          : `<p class="muted" style="margin-bottom:10px">give the OS a brain: fun facts about your meds, AI task-splitting, and a resident oracle that knows your day. bring your own Anthropic API key (console.anthropic.com → API keys).</p>
             <label class="fld">anthropic api key</label>
             <input type="password" data-key placeholder="sk-ant-…" autocomplete="off">
             <button class="btn primary wide" data-save style="margin-top:10px">wake the oracle 🔮</button>
             <p class="muted" style="margin-top:8px">key lives on your device (and inside your own backups). uses claude-haiku — the cheap one.</p>`}
      </div>`);
    if (aiReady()) {
      brain.querySelector('[data-forget]').addEventListener('click', () => { delete S.settings.aiKey; save(); ctx.refresh(params); });
      brain.querySelector('[data-test]').addEventListener('click', async function () {
        this.textContent = '…';
        try { toast('🔮 ' + await ask('Say hi to your human in one short playful sentence.')); }
        catch (e2) { toast('✦ ' + e2.message); }
        this.textContent = '🪄 test it';
      });
    } else {
      brain.querySelector('[data-save]').addEventListener('click', async () => {
        const k = brain.querySelector('[data-key]').value.trim();
        if (!k) { toast('paste the key first'); return; }
        S.settings.aiKey = k; save();
        try { toast('🔮 ' + await ask('You just woke up inside this planner. Greet your human in one short excited sentence.')); ctx.refresh(params); }
        catch (e2) { delete S.settings.aiKey; save(); toast('✦ ' + e2.message); }
      });
    }
    body.appendChild(brain);

    /* --- iCloud sync via Shortcuts --- */
    body.appendChild(el(`<div class="section-h">☁️ iCloud sync (via Shortcuts) — alternative</div>`));
    const cloud = el(`
      <div class="card">
        <p class="muted" style="margin-bottom:10px">two taps to move your whole planner between iPhone, iPad & Mac through your iCloud Drive:</p>
        <div class="two-col">
          <button class="btn wide" id="cl-backup">⬆ backup<br><span style="font-size:8px">copy → iCloud</span></button>
          <button class="btn wide" id="cl-restore">⬇ restore<br><span style="font-size:8px">iCloud → here</span></button>
        </div>
        <button class="btn ghost small wide" id="cl-setup" style="margin-top:10px">first time? 2-minute setup guide</button>
      </div>`);
    cloud.querySelector('#cl-backup').addEventListener('click', async () => {
      await saveNow();
      try {
        await navigator.clipboard.writeText(stateJSON());
        toast('copied ✓ opening the Backup shortcut…');
        setTimeout(() => location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent('Planner Backup'), 700);
      } catch { toast('clipboard blocked — try the backup file instead'); }
    });
    cloud.querySelector('#cl-restore').addEventListener('click', () => {
      location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent('Planner Restore');
    });
    cloud.querySelector('#cl-setup').addEventListener('click', () => modal({
      title: '☁️ one-time setup (per device)',
      bodyHTML: `
        <p class="muted" style="line-height:1.6">I made the shortcuts for you — just install them (they're signed & safe, built by this app):</p>
        <div class="two-col" style="margin:12px 0">
          <a class="btn wide" style="text-align:center;text-decoration:none;display:block" href="shortcuts/planner-backup.shortcut" download>⬇ get<br>Planner Backup</a>
          <a class="btn wide" style="text-align:center;text-decoration:none;display:block" href="shortcuts/planner-restore.shortcut" download>⬇ get<br>Planner Restore</a>
        </div>
        <p class="muted" style="line-height:1.7">
        <b>on iPhone/iPad:</b> tap a button → open the downloaded file (tap it in Safari's ⬇ downloads, or in the Files app) → <b>Add Shortcut</b>. repeat for the second one.<br>
        <b>on Mac:</b> click both, double-click the files in Downloads → <b>Add Shortcut</b>.</p>
        <p class="muted" style="line-height:1.6">⚠️ keep the names exactly <b>Planner Backup</b> and <b>Planner Restore</b>. after installing on each device: <b>backup</b> here on one device → <b>restore</b> on another. iCloud carries it automatically. photos travel only via the backup <i>file</i> below (too big for the clipboard).</p>
        <details style="margin-top:8px"><summary class="muted" style="cursor:pointer">prefer to build them by hand?</summary>
        <div class="card flat" style="margin-top:10px">
          <div class="card-title">Planner Backup</div>
          <p class="muted" style="line-height:1.7">① <b>Get Clipboard</b> ② <b>Save File</b> → iCloud Drive → <code>Planner/planner-backup.json</code> → Overwrite ON</p>
        </div>
        <div class="card flat">
          <div class="card-title">Planner Restore</div>
          <p class="muted" style="line-height:1.7">① <b>Get File</b> → <code>Planner/planner-backup.json</code> ② <b>Get Text from Input</b> ③ <b>Copy to Clipboard</b> ④ <b>Open URL</b> → <code>${location.origin}${location.pathname}#paste</code></p>
        </div></details>`,
    }));
    body.appendChild(cloud);

    /* --- reminders --- */
    body.appendChild(el(`<div class="section-h">🔔 native reminders</div>`));
    const rem = el(`
      <div class="card">
        <p class="muted" style="margin-bottom:10px">websites can't ring your iPhone — but your Calendar can. export your med schedule as a calendar with built-in alerts:</p>
        <button class="btn wide" id="rm-ics">📆 export meds → calendar alarms (.ics)</button>
      </div>`);
    rem.querySelector('#rm-ics').addEventListener('click', () => {
      const { text, count } = medsICS();
      if (!count) { toast('add meds first — then export'); return; }
      download('jsp-meds.ics', text, 'text/calendar');
      toast(`${count} daily alarm${count > 1 ? 's' : ''} exported — open the file & add to Calendar`);
    });
    body.appendChild(rem);

    /* --- files --- */
    body.appendChild(el(`<div class="section-h">💾 backup files</div>`));
    const files = el(`
      <div class="card">
        <div class="two-col">
          <button class="btn wide" id="fb-light">⬇ backup file<br><span style="font-size:8px">everything except photos</span></button>
          <button class="btn wide" id="fb-full">⬇ full backup<br><span style="font-size:8px">includes photos (bigger)</span></button>
        </div>
        <button class="btn wide" id="fb-import" style="margin-top:10px">⬆ import a backup file</button>
        <input type="file" accept=".json,application/json" class="hidden" id="fb-file">
      </div>`);
    files.querySelector('#fb-light').addEventListener('click', async () => {
      await saveNow(); download(`jsp-backup-${todayKey()}.json`, stateJSON());
    });
    files.querySelector('#fb-full').addEventListener('click', async () => {
      await saveNow(); toast('packing photos…');
      download(`jsp-full-backup-${todayKey()}.json`, await fullBackupJSON());
    });
    const fileIn = files.querySelector('#fb-file');
    files.querySelector('#fb-import').addEventListener('click', () => fileIn.click());
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0];
      if (f) await restoreFromJSON(await f.text());
    });
    body.appendChild(files);

    body.appendChild(el(`<p class="muted center" style="margin:10px 0">everything is stored on-device (private by default). backups are how it travels.</p>`));
  },
};
