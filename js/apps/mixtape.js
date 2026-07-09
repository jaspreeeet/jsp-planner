/* ═══════════ MIXTAPE — poolsuite-style radio, streams by SomaFM ═══════════ */
import { S, save, esc, el, toast } from '../core.js';

const CHANNELS = [
  { id: 'illstreet', name: 'Side A · Lounge', emoji: '🍸', desc: 'bachelor-pad vinyl, shaken not stirred' },
  { id: 'groovesalad', name: 'Groove Salad', emoji: '🥗', desc: 'chilled beats to plan your empire to' },
  { id: 'u80s', name: 'Underground 80s', emoji: '📼', desc: 'synth-pop & new wave — pure rewind' },
  { id: 'secretagent', name: 'Secret Agent', emoji: '🕶', desc: 'your homework is a heist now' },
  { id: '7soul', name: 'Seven Inch Soul', emoji: '💃', desc: 'vintage 45s, warm crackle included' },
  { id: 'bootliquor', name: 'Boot Liquor', emoji: '🤠', desc: 'americana for golden-hour walks' },
  { id: 'defcon', name: 'DEF CON Radio', emoji: '👾', desc: 'music for hacking (or maths)' },
  { id: 'dronezone', name: 'Drone Zone', emoji: '🌌', desc: 'ambient space — deep focus fuel' },
];
const streamURL = id => `https://ice1.somafm.com/${id}-128-mp3`;

// persistent audio — keeps playing when the window closes
const audio = new Audio();
audio.preload = 'none';
let playing = false;

function chan() { return CHANNELS[S.mixtape.channel] || CHANNELS[0]; }

function syncMini() {
  const wrap = document.getElementById('mb-nowplaying');
  const btn = document.getElementById('mb-play');
  const lbl = document.getElementById('mb-track');
  if (!wrap) return;
  wrap.classList.toggle('hidden', !playing && audio.paused && !audio.src);
  btn.textContent = playing ? '❚❚' : '▶';
  lbl.textContent = chan().name.toLowerCase();
}

async function play() {
  const c = chan();
  if (!audio.src.includes(c.id)) audio.src = streamURL(c.id);
  audio.volume = S.mixtape.vol ?? 0.9;
  try {
    await audio.play();
    playing = true;
  } catch { toast('tap ▶ again to start the tape'); }
  syncMini();
  updateUI();
}
function pause() { audio.pause(); playing = false; syncMini(); updateUI(); }

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('mb-play');
  if (btn) btn.addEventListener('click', () => playing ? pause() : play());
});

let uiRefresh = null;
function updateUI() { if (uiRefresh) uiRefresh(); }

/* for other apps (Today) to show/control the tape */
export function mixtapeInfo() { return { playing, name: chan().name }; }
export function mixtapeToggle() { playing ? pause() : play(); }

export default {
  id: 'mixtape', name: 'Mixtape', icon: '📼', w: 480, h: 660,
  onClose() { uiRefresh = null; },
  render(ctx) {
    const { body } = ctx;
    uiRefresh = () => { if (document.body.contains(body)) ctx.refresh(); };
    const c = chan();

    const cass = el(`
      <div class="cassette ${playing ? 'playing' : ''}">
        <div class="cass-label">
          <div class="cl-serif">${c.emoji} ${esc(c.name)}</div>
          <div class="cl-sub">jsp·os mixtape · 90 min · type II chrome</div>
        </div>
        <div class="cass-window">
          <div class="reel a"></div>
          <div class="reel b"></div>
        </div>
        <div class="cass-controls">
          <button class="btn" data-act="prev">⏮</button>
          <button class="btn primary" data-act="play">${playing ? '❚❚ pause' : '▶ play'}</button>
          <button class="btn" data-act="next">⏭</button>
        </div>
      </div>`);
    cass.querySelector('[data-act=play]').addEventListener('click', () => playing ? pause() : play());
    const skip = dir => {
      S.mixtape.channel = (S.mixtape.channel + dir + CHANNELS.length) % CHANNELS.length;
      save();
      audio.src = streamURL(chan().id);
      if (playing) play(); else ctx.refresh();
      syncMini();
    };
    cass.querySelector('[data-act=prev]').addEventListener('click', () => skip(-1));
    cass.querySelector('[data-act=next]').addEventListener('click', () => skip(1));
    body.appendChild(cass);

    // volume
    const volRow = el(`
      <div style="display:flex;align-items:center;gap:10px;margin:14px 2px">
        <span style="font-size:14px">🔈</span>
        <input type="range" min="0" max="1" step="0.05" value="${S.mixtape.vol ?? 0.9}" style="flex:1">
        <span style="font-size:14px">🔊</span>
      </div>`);
    volRow.querySelector('input').addEventListener('input', e => {
      S.mixtape.vol = parseFloat(e.target.value);
      audio.volume = S.mixtape.vol;
      save();
    });
    body.appendChild(volRow);

    body.appendChild(el(`<div class="section-h">📻 channels</div>`));
    const list = el(`<div class="channel-list"></div>`);
    CHANNELS.forEach((ch, i) => {
      const on = i === S.mixtape.channel;
      const row = el(`
        <div class="chan-row ${on ? 'on' : ''}">
          <span class="chan-emoji">${ch.emoji}</span>
          <div style="flex:1"><div class="chan-name">${esc(ch.name)}</div>
          <div class="chan-desc">${esc(ch.desc)}</div></div>
          ${on && playing ? '<div class="eq"><i></i><i></i><i></i></div>' : ''}
        </div>`);
      row.addEventListener('click', () => {
        S.mixtape.channel = i; save();
        audio.src = streamURL(ch.id);
        play();
      });
      list.appendChild(row);
    });
    body.appendChild(list);
    body.appendChild(el(`<p class="muted center" style="margin-top:12px">streams lovingly provided by <b>somafm.com</b> — listener-supported, commercial-free</p>`));
  },
};
