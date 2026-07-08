/* ═══════════ SKY — weather, romanticised (data: open-meteo.com) ═══════════ */
import { S, save, esc, el, toast } from '../core.js';

const CODES = {
  0: ['☀️', 'clear skies', 'golden hour will be elite today'],
  1: ['🌤', 'mostly clear', 'a soft-light kind of day'],
  2: ['⛅', 'partly cloudy', 'dramatic sky, main-character weather'],
  3: ['☁️', 'overcast', 'cosy blanket sky. tea weather.'],
  45: ['🌫', 'foggy', 'the world got a film filter today'],
  48: ['🌫', 'icy fog', 'mysterious. wear layers.'],
  51: ['🌦', 'light drizzle', 'the gentle kind. romantic, honestly'],
  53: ['🌦', 'drizzle', 'petrichor incoming'],
  55: ['🌧', 'heavy drizzle', 'umbrella recommended'],
  61: ['🌧', 'light rain', 'rain-on-window study ambience: free'],
  63: ['🌧', 'rain', 'perfect excuse to stay in and conquer'],
  65: ['⛈', 'heavy rain', 'blanket. mixtape. go nowhere.'],
  71: ['🌨', 'light snow', 'the world is being gentle today'],
  73: ['❄️', 'snow', 'snow day energy'],
  75: ['❄️', 'heavy snow', 'full snow globe mode'],
  80: ['🌦', 'showers', 'carry the umbrella, thank yourself later'],
  81: ['🌧', 'rain showers', 'dodge the drops'],
  82: ['⛈', 'violent showers', 'stay in. seriously.'],
  95: ['⛈', 'thunderstorm', 'sky drama! watch from inside'],
  96: ['⛈', 'storm + hail', 'nature is having a moment'],
  99: ['⛈', 'storm + hail', 'nature is having a moment'],
};
const code = c => CODES[c] || ['🌡', 'weather', 'whatever it is, you\'ve got this'];

async function fetchWeather(lat, lon) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code&hourly=temperature_2m,weather_code&forecast_hours=12&timezone=auto`;
  const r = await fetch(u);
  if (!r.ok) throw new Error('weather api');
  return r.json();
}

export default {
  id: 'weather', name: 'Sky', icon: '🌤', w: 460, h: 600,
  render(ctx) {
    const { body } = ctx;
    body.appendChild(el(`
      <div><div class="serif-h">the sky today</div>
      <div class="pixel-sub">dress accordingly · romanticise regardless</div></div>`));

    const zone = el(`<div style="margin-top:14px"></div>`);
    body.appendChild(zone);

    const cached = S.settings.weatherCache;
    const render2 = data => {
      zone.innerHTML = '';
      const [emo, name, vibe] = code(data.current.weather_code);
      zone.appendChild(el(`
        <div class="card center">
          <div style="font-size:56px">${emo}</div>
          <div class="trk-val" style="font-size:48px">${Math.round(data.current.temperature_2m)}°</div>
          <div class="pixel-sub">${name} · feels like ${Math.round(data.current.apparent_temperature)}°</div>
          <div class="affirm" style="padding:12px 4px 2px;font-size:19px">“${vibe}”</div>
        </div>`));
      const strip = el(`<div class="card"><div class="card-title">next 12 hours</div><div style="display:flex;overflow-x:auto;gap:6px" data-h></div></div>`);
      const hz = strip.querySelector('[data-h]');
      (data.hourly.time || []).forEach((t, i) => {
        const h = new Date(t).getHours();
        hz.appendChild(el(`
          <div class="center" style="min-width:44px;padding:4px 0">
            <div class="pixel-sub">${String(h).padStart(2, '0')}</div>
            <div style="font-size:18px;margin:3px 0">${code(data.hourly.weather_code[i])[0]}</div>
            <div style="font-family:var(--mono);font-size:16px">${Math.round(data.hourly.temperature_2m[i])}°</div>
          </div>`));
      });
      zone.appendChild(strip);
      zone.appendChild(el(`<p class="muted center">data by open-meteo.com · updated ${new Date(S.settings.weatherCache.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>`));
    };

    const load = () => {
      zone.innerHTML = '<div class="empty"><div class="e-art">📡</div><div class="e-serif">reading the sky…</div></div>';
      navigator.geolocation.getCurrentPosition(async pos => {
        try {
          const data = await fetchWeather(pos.coords.latitude.toFixed(3), pos.coords.longitude.toFixed(3));
          S.settings.weatherCache = { ts: Date.now(), data };
          save();
          render2(data);
        } catch { zone.innerHTML = ''; zone.appendChild(el(`<div class="empty"><div class="e-serif">the sky isn't answering</div><div class="e-sub">check your connection and try again.</div></div>`)); }
      }, () => {
        zone.innerHTML = '';
        zone.appendChild(el(`
          <div class="empty"><div class="e-art">🧭</div>
          <div class="e-serif">where are you?</div>
          <div class="e-sub">allow location access (asked once) and I'll read your local sky. nothing is stored anywhere but here.</div></div>`));
      }, { timeout: 10000, maximumAge: 600000 });
    };

    if (cached && Date.now() - cached.ts < 30 * 60 * 1000) render2(cached.data);
    else load();

    const refresh = el(`<button class="btn small wide" style="margin-top:10px">↻ refresh</button>`);
    refresh.addEventListener('click', load);
    body.appendChild(refresh);
  },
};
