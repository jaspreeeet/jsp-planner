/* ═══════════ CLOUD SYNC — Supabase Database & Auth ═══════════ */
import { S, save, saveNow } from './core.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

export function cloudReady() { return !!currentUser; }
export function getCurrentUser() { return currentUser; }

/**
 * Sign up with password
 */
export async function signUpWithPassword(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  currentUser = data.user;
  return data.user?.email;
}

/**
 * Sign in with password
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentUser = data.user;
  return data.user?.email;
}

/**
 * Sign out
 */
export async function disconnect() {
  await supabase.auth.signOut();
  currentUser = null;
  save();
}

/**
 * Initialize auth state on boot
 */
export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
  });
  
  return currentUser;
}

let pushing = false;
export async function push() {
  if (!cloudReady() || pushing) return false;
  pushing = true;
  try {
    await saveNow();

    const safeState = JSON.parse(JSON.stringify(S));

    const { error } = await supabase
      .from('sync_state')
      .upsert({ 
        user_id: currentUser.id, 
        data: safeState,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;
    
    // Update local last push
    S.settings = S.settings || {};
    S.settings.cloud = S.settings.cloud || {};
    S.settings.cloud.lastPush = Date.now();
    lastPushedTs = S._ts || 0;
    save();
    return true;
  } finally { pushing = false; }
}

export async function pull() {
  if (!cloudReady()) return null;
  const { data, error } = await supabase
    .from('sync_state')
    .select('data')
    .eq('user_id', currentUser.id)
    .single();
    
  if (error) return null;
  return data?.data || null;
}

export async function pullIfNewer() {
  try {
    const remoteState = await pull();
    if (!remoteState) return false;
    
    const localTs = S._ts || 0;
    const remoteTs = remoteState._ts || 0;
    
    if (remoteTs > localTs) {
      const keepCloud = S.settings?.cloud;
      Object.keys(S).forEach(k => delete S[k]);
      Object.assign(S, remoteState);
      S.settings = S.settings || {};
      S.settings.cloud = Object.assign({}, keepCloud, { lastPull: Date.now() });
      await saveNow();
      return true;
    }
    
    S.settings = S.settings || {};
    S.settings.cloud = S.settings.cloud || {};
    S.settings.cloud.lastPull = Date.now(); 
    save();
  } catch (e) { console.error('Pull failed', e); }
  return false;
}

let lastPushedTs = 0;
export function startEngine() {
  lastPushedTs = S._ts || 0;
  setInterval(() => {
    if (cloudReady() && (S._ts || 0) > lastPushedTs) push().catch(() => {});
  }, 25000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && cloudReady() && (S._ts || 0) > lastPushedTs) push().catch(() => {});
  });
}
