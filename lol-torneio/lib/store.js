import { SEED } from './seed';
import { cleanMedia } from './media';
const KEY = 'lol-tournament-v1';
const g = globalThis;

// Procura as credenciais do Upstash/Vercel KV em qualquer nome de variável comum,
// inclusive com prefixo personalizado (ex.: STORAGE_KV_REST_API_URL, STORAGE_UPSTASH_REDIS_REST_URL).
function creds() {
  const e = process.env;
  const fixed = [
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
  ];
  for (const [u, t] of fixed) if (e[u] && e[t]) return { url: e[u], token: e[t] };
  for (const k of Object.keys(e)) {
    const m = k.match(/^(.*)(KV_REST_API|UPSTASH_REDIS_REST|REST_API)_URL$/);
    if (!m || !/^https?:\/\//.test(e[k] || '')) continue;
    const tk = k.replace(/_URL$/, '_TOKEN');
    if (e[tk]) return { url: e[k], token: e[tk] };
  }
  return null;
}
export const isPersistent = () => !!creds();
export const persistent = isPersistent();

async function cmd(a) {
  const c = creds();
  const r = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.token}` }, body: JSON.stringify(a), cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Upstash: ' + (j.error || r.status));
  return j.result;
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
  // 'media' é novo: dados antigos (sem esse campo) continuam válidos e ganham mídia vazia
  return { config, teams, matches, media: cleanMedia(d.media) };
}
// strict=true (usado pelo painel): se o banco falhar, lança erro em vez de devolver os dados padrão,
// assim o painel nunca mostra dados "zerados" que depois sobrescreveriam os seus ao salvar.
export async function load(strict = false) {
  try {
    if (isPersistent()) { const v = await cmd(['GET', KEY]); if (v) return normalize(typeof v === 'string' ? JSON.parse(v) : v); }
    else if (g.__lol) return normalize(g.__lol);
  } catch (e) { console.error('[store.load]', e); if (strict) throw e; }
  return structuredClone(SEED);
}
// Lança erro se o Redis falhar (antes o erro era silencioso)
export async function save(d) { if (isPersistent()) await cmd(['SET', KEY, JSON.stringify(d)]); else g.__lol = d; }

// ---- Imagens da área de mídia: cada uma em sua própria chave (não pesa no JSON principal) ----
const IMG = 'lol-img:';
export async function putImg(id, type, b64) { if (isPersistent()) await cmd(['SET', IMG + id, type + ';' + b64]); else (g.__lolImg ||= new Map()).set(id, type + ';' + b64); }
export async function getImg(id) {
  const v = isPersistent() ? await cmd(['GET', IMG + id]) : g.__lolImg?.get(id);
  if (!v) return null;
  const i = v.indexOf(';');
  return { type: v.slice(0, i), buf: Buffer.from(v.slice(i + 1), 'base64') };
}
export async function delImg(id) { try { if (isPersistent()) await cmd(['DEL', IMG + id]); else g.__lolImg?.delete(id); } catch (e) { console.error('[store.delImg]', e); } }
