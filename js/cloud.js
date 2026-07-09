/* ═══════════ CLOUD SYNC — Secure GitHub OAuth Serverless Sync ═══════════
   No PATs stored. Uses OAuth App + Serverless Proxy. */
import { S, save, saveNow } from './core.js';

const GIST_DESC = 'JSP·OS planner sync — private';
const FILE = 'jsp-os-backup.json';
const API = 'https://api.github.com';

// ⚠️ Configuration
const CLIENT_ID = 'Ov23livqxSI0BY75sgZe';
const BACKEND_URL = 'https://github-auth.7yshv8snnw.workers.dev/api/auth';

const gh = () => (S && S.settings) ? S.settings.gh : null;
const headers = t => ({
  'Authorization': 'Bearer ' + t,
  'Accept': 'application/vnd.github+json',
  'Content-Type': 'application/json',
});

export function cloudReady() { return !!(gh() && gh().token && gh().gistId); }

/**
 * 1. Call this to send the user to GitHub to sign in
 */
export function redirectToGitHub() {
  const root = window.location.origin + window.location.pathname;
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=gist&redirect_uri=${encodeURIComponent(root)}`;
}

/**
 * 2. Check URL for '?code=...' on app load, pass it here to complete login
 */
export async function handleAuthCallback(code) {
  // Exchange code for token via proxy backend
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  if (!res.ok) throw new Error('Auth proxy failed');
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  // Initialize connection with the new token
  return await connect(data.access_token);
}

export async function connect(token) {
  const u = await fetch(API + '/user', { headers: headers(token) });
  if (!u.ok) throw new Error('GitHub authorization expired or invalid.');
  const user = (await u.json()).login;

  let gistId = null;
  const list = await fetch(API + '/gists?per_page=100', { headers: headers(token) });
  if (list.ok) {
    for (const g of await list.json()) {
      if (g.description === GIST_DESC && g.files[FILE]) { gistId = g.id; break; }
    }
  }
  if (!gistId) {
    const create = await fetch(API + '/gists', {
      method: 'POST', headers: headers(token),
      body: JSON.stringify({
        description: GIST_DESC, public: false,
        files: { [FILE]: { content: JSON.stringify({ app: 'jsp-os', ts: 0, state: null }) } },
      }),
    });
    if (!create.ok) throw new Error('Could not initialize Gist storage.');
    gistId = (await create.json()).id;
  }
  S.settings = S.settings || {};
  S.settings.gh = { token, gistId, user, lastPush: 0, lastPull: 0 };
  save();
  return user;
}

export function disconnect() { delete S.settings.gh; save(); }

let pushing = false;
export async function push() {
  if (!cloudReady() || pushing) return false;
  pushing = true;
  try {
    await saveNow();
    const body = JSON.stringify({
      files: { [FILE]: { content: JSON.stringify({ app: 'jsp-os', ts: S._ts || Date.now(), state: JSON.parse(JSON.stringify(S)) }) } },
    });
    const r = await fetch(`${API}/gists/${gh().gistId}`, { method: 'PATCH', headers: headers(gh().token), body });
    if (!r.ok) throw new Error('Push failed.');
    gh().lastPush = Date.now();
    lastPushedTs = S._ts || 0;
    save();
    return true;
  } finally { pushing = false; }
}

export async function pull() {
  if (!cloudReady()) return null;
  const r = await fetch(`${API}/gists/${gh().gistId}?t=${Date.now()}`, { headers: headers(gh().token) });
  if (!r.ok) return null;
  const g = await r.json();
  let content = g.files[FILE]?.content;
  if (g.files[FILE]?.truncated) {
    content = await (await fetch(g.files[FILE].raw_url)).text();
  }
  try {
    const data = JSON.parse(content);
    if (data && data.app === 'jsp-os' && data.state) return data;
  } catch {}
  return null;
}

export async function pullIfNewer() {
  try {
    const remote = await pull();
    if (!remote || !remote.state) return false;
    const localTs = S._ts || 0;
    if ((remote.state._ts || remote.ts || 0) > localTs) {
      const keepKey = S.settings.gh;
      Object.keys(S).forEach(k => delete S[k]);
      Object.assign(S, remote.state);
      S.settings = S.settings || {};
      S.settings.gh = Object.assign({}, S.settings.gh, keepKey, { lastPull: Date.now() });
      await saveNow();
      return true;
    }
    gh().lastPull = Date.now(); save();
  } catch {}
  return false;
}

let lastPushedTs = 0;
export function startEngine() {
  if (!cloudReady()) return;
  lastPushedTs = S._ts || 0;
  setInterval(() => {
    if (cloudReady() && (S._ts || 0) > lastPushedTs) push().catch(() => {});
  }, 25000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && cloudReady() && (S._ts || 0) > lastPushedTs) push().catch(() => {});
  });
}
