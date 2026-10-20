import { SEED } from './seed';
const KEY = 'lol-tournament-v1';
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const g = globalThis;
async function cmd(a) {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(a), cache: 'no-store' });
  return (await r.json()).result;
}
// Completa dados antigos/incompletos com os padrões, para o site e o painel nunca quebrarem
export function normalize(d) {
  const base = structuredClone(SEED);
  if (!d || typeof d !== 'object') return base;
  const config = { ...base.config, ...(d.config || {}) };
  if (!Array.isArray(config.news)) config.news = [];
  const teams = (Array.isArray(d.teams) ? d.teams : base.teams).filter(Boolean).map((t, i) => ({
    id: String(t.id ?? 't' + i), name: '', tag: '', color: '#8a9bb4', logo: '', captain: '', players: [], tb: i + 1, ...t,
    logo: typeof t.logo === 'string' ? t.logo : '', players: Array.isArray(t.players) ? t.players : [],
  }));
  const have = Array.isArray(d.matches) ? d.matches.filter(Boolean) : [];
  const matches = base.matches.map((m) => ({ ...m, ...(have.find((x) => x.id === m.id) || {}) }));
  return { config, teams, matches };
}
export async function load() {
  try {
    if (url) { const v = await cmd(['GET', KEY]); if (v) return normalize(typeof v === 'string' ? JSON.parse(v) : v); }
    else if (g.__lol) return normalize(g.__lol);
  } catch (e) { console.error(e); }
  return structuredClone(SEED);
}
export async function save(d) { if (url) await cmd(['SET', KEY, JSON.stringify(d)]); else g.__lol = d; }
export const persistent = !!url;
