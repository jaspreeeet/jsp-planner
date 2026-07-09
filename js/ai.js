/* ═══════════ JSP·OS ✕ Claude — tiny, cheap, delightful ═══════════
   Calls the Anthropic API directly from the browser (their CORS opt-in
   header makes this legit for personal apps). Model: Haiku 4.5 — the
   low-cost tier; a fun fact costs a fraction of a cent. */
import { S, save } from './core.js';

const MODEL = 'claude-haiku-4-5';
const PERSONA = `You live inside JSP·OS, a cosy retro pixel-art planner used by one person with ADHD.
Voice: warm, playful, lowercase-casual, zero corporate speak. Like a clever friend, not an assistant.
Keep answers SHORT (2-5 sentences unless asked for a list). Never lecture, never guilt-trip.
Plain text only — no markdown headers, no asterisks. Emoji welcome but max 2.`;

export function aiReady() { return !!(S.settings.aiKey || '').trim(); }

export async function ask(prompt, { system = '', maxTokens = 300 } = {}) {
  if (!aiReady()) throw new Error('no-key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': S.settings.aiKey.trim(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: PERSONA + (system ? '\n\n' + system : ''),
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    let msg = 'api error ' + res.status;
    try { msg = (await res.json()).error?.message || msg; } catch {}
    if (res.status === 401) msg = 'that API key isn\'t working — check it in Sync';
    if (res.status === 429) msg = 'rate limited — give it a minute';
    throw new Error(msg);
  }
  const data = await res.json();
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}

/* context snapshot so the oracle knows your day */
export function dayContext() {
  const tk = new Date().toISOString().slice(0, 10);
  const tasks = S.tasks.filter(t => t.dateKey === tk && !t.done).map(t => t.text);
  const done = S.tasks.filter(t => t.dateKey === tk && t.done).length;
  const meds = S.meds.map(m => m.name);
  const mood = (S.trackers.find(t => /mood/i.test(t.name)) || { log: {} }).log[tk];
  const habits = (S.habits || []).map(h => h.name);
  const ev = S.events.map(e => `${e.name} on ${e.date}`).slice(0, 3);
  return `Today's open tasks: ${tasks.join('; ') || 'none'}. Completed today: ${done}.
Meds/supplements tracked: ${meds.join(', ') || 'none'}. Mood today (1-5): ${mood ?? 'not logged'}.
Daily habits: ${habits.join(', ') || 'none'}. Upcoming: ${ev.join('; ') || 'nothing'}.`;
}

/* one-tap helpers */
export const medFact = med =>
  ask(`Give one genuinely interesting fun fact about ${med.name}${med.dose ? ' (' + med.dose + ')' : ''} and one sentence on why taking it consistently pays off. If it's not a real supplement/medication, be honest but kind.`);

export const taskSplit = task =>
  ask(`Break this task into 3-5 tiny, concrete, 5-15 minute steps. One per line, no numbering, each starting with a verb. Task: "${task}"`, { maxTokens: 250 });
