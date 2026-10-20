import { SEED } from './seed';
const KEY = 'lol-tournament-v1';
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const g = globalThis;
async function cmd(a) {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(a), cache: 'no-store' });
  return (await r.json()).result;
}
export async function load() {
  try { if (url) { const v = await cmd(['GET', KEY]); if (v) return JSON.parse(v); } else if (g.__lol) return g.__lol; } catch (e) { console.error(e); }
  return structuredClone(SEED);
}
export async function save(d) { if (url) await cmd(['SET', KEY, JSON.stringify(d)]); else g.__lol = d; }
export const persistent = !!url;
