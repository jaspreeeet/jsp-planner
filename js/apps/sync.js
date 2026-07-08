/* ═══════════ SYNC & SETTINGS — iCloud via Shortcuts · backups · reminders ═══════════ */
import { S, save, saveNow, kvSet, esc, el, toast, todayKey, photoAll, photoPut } from '../core.js';
import { modal } from '../wm.js';

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
        <div style="display:flex;align-items:center;gap:10px;margin-top:14px">
          <button class="pcheck ${S.settings.night ? 'on' : ''}" id="st-night"></button>
          <span style="font-size:14px">🌙 night mode</span>
        </div>
      </div>`);
    pers.querySelector('#st-name').addEventListener('change', e => {
      S.settings.greetName = e.target.value.trim(); save(); toast('noted 💛');
    });
    pers.querySelector('#st-night').addEventListener('click', function () {
      S.settings.night = !S.settings.night;
      this.classList.toggle('on', S.settings.night);
      document.body.classList.toggle('night', S.settings.night);
      save();
    });
    body.appendChild(pers);

    /* --- iCloud sync via Shortcuts --- */
    body.appendChild(el(`<div class="section-h">☁️ iCloud sync (via Shortcuts)</div>`));
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
        <p class="muted" style="line-height:1.6">in the <b>Shortcuts app</b>, create two shortcuts:</p>
        <div class="card flat" style="margin-top:10px">
          <div class="card-title">1 · name it exactly: Planner Backup</div>
          <p class="muted" style="line-height:1.7">
          ① <b>Get Clipboard</b><br>
          ② <b>Save File</b> → iCloud Drive → folder <code>Planner</code> → name <code>planner-backup.json</code> → turn <b>Overwrite</b> ON</p>
        </div>
        <div class="card flat">
          <div class="card-title">2 · name it exactly: Planner Restore</div>
          <p class="muted" style="line-height:1.7">
          ① <b>Get File</b> → iCloud Drive → <code>Planner/planner-backup.json</code><br>
          ② <b>Copy to Clipboard</b><br>
          ③ <b>Open URLs</b> → <code>${location.origin}${location.pathname}#paste</code></p>
        </div>
        <p class="muted">then: tap <b>backup</b> on one device, <b>restore</b> on another. iCloud carries it between them automatically. photos ride along only in the backup <i>file</i> below (they're too big for the clipboard).</p>`,
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
