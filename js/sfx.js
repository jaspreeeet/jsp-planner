/* ═══════════ SFX — tiny retro blips, pure WebAudio, zero assets ═══════════ */
import { S } from './core.js';

let ctx = null;
const ac = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());
export const sfxOn = () => S.settings.sfx !== false;   // default on

function blip(freq, dur = 0.05, type = 'square', gain = 0.045, slide = 0) {
  if (!sfxOn()) return;
  try {
    const a = ac();
    if (a.state === 'suspended') a.resume();
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start(); o.stop(a.currentTime + dur + 0.02);
  } catch {}
}

export const click = () => blip(1250, 0.035);
export const pop = () => blip(560, 0.07, 'square', 0.05, 300);
export const win = () => { blip(660, 0.07); setTimeout(() => blip(880, 0.07), 80); setTimeout(() => blip(1320, 0.11), 160); };
export const boot = () => { blip(440, 0.09, 'triangle', 0.06); setTimeout(() => blip(660, 0.09, 'triangle', 0.06), 110); setTimeout(() => blip(880, 0.16, 'triangle', 0.06), 220); };

/* global wiring: any tappable thing clicks */
export function wireSfx() {
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.btn, .chip, .desk-icon, .dock-btn, .pcheck, .habit-check, .tabs button, .mem-card, .bub, .win-close, .mood-row button, .t2-chip, .t2-mini')) click();
  }, { capture: true, passive: true });
}
