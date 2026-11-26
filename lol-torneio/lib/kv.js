// Primitivas de banco para os módulos novos (inscrições, notícias, votos, push, temporadas…).
// Usa o mesmo Upstash Redis do restante do projeto; sem Redis, cai para memória (só desenvolvimento).
// Cada item fica num campo de um hash: duas pessoas editando itens diferentes nunca se sobrescrevem.
import { isPersistent, cmd } from './store';
const g = globalThis;
const M = () => (g.__kv ||= { str: new Map(), hash: new Map(), set: new Map(), exp: new Map() });
function alive(k) {
  const e = M().exp.get(k);
  if (e && e < Date.now()) { M().str.delete(k); M().hash.delete(k); M().set.delete(k); M().exp.delete(k); return false; }
  return true;
}
const P = isPersistent;
const parse = (v) => { if (v == null) return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return null; } };

export async function getJ(key, def = null) {
  if (P()) { const v = parse(await cmd(['GET', key])); return v ?? def; }
  alive(key); const v = M().str.get(key); return v === undefined ? def : structuredClone(v);
}
export async function setJ(key, val) { if (P()) await cmd(['SET', key, JSON.stringify(val)]); else M().str.set(key, structuredClone(val)); }
export async function del(key) { if (P()) await cmd(['DEL', key]); else { M().str.delete(key); M().hash.delete(key); M().set.delete(key); } }

export async function hset(key, id, obj) { if (P()) await cmd(['HSET', key, id, JSON.stringify(obj)]); else { alive(key); (M().hash.get(key) || M().hash.set(key, new Map()).get(key)).set(id, structuredClone(obj)); } }
export async function hget(key, id) {
  if (P()) return parse(await cmd(['HGET', key, id]));
  alive(key); const v = M().hash.get(key)?.get(id); return v ? structuredClone(v) : null;
}
export async function hdel(key, id) { if (P()) await cmd(['HDEL', key, id]); else M().hash.get(key)?.delete(id); }
export async function hall(key) {
  if (P()) {
    const r = (await cmd(['HGETALL', key])) || [], out = [];
    if (Array.isArray(r)) for (let i = 0; i < r.length; i += 2) { const v = parse(r[i + 1]); if (v) out.push(v); }
    else for (const v of Object.values(r)) { const x = parse(v); if (x) out.push(x); }
    return out;
  }
  alive(key); return [...(M().hash.get(key)?.values() || [])].map((v) => structuredClone(v));
}

// Contadores (votos) e conjuntos (eleitores já registrados, chaves de duplicidade)
export async function hincr(key, f, by = 1) {
  if (P()) return Number(await cmd(['HINCRBY', key, f, by]));
  alive(key); const h = M().hash.get(key) || M().hash.set(key, new Map()).get(key); const n = (Number(h.get(f)) || 0) + by; h.set(f, n); return n;
}
export async function hcounts(key) {
  const out = {};
  if (P()) { const r = (await cmd(['HGETALL', key])) || []; if (Array.isArray(r)) for (let i = 0; i < r.length; i += 2) out[r[i]] = Number(r[i + 1]) || 0; else for (const [k, v] of Object.entries(r)) out[k] = Number(v) || 0; return out; }
  alive(key); for (const [k, v] of M().hash.get(key) || []) out[k] = Number(v) || 0; return out;
}
export async function sadd(key, m) {
  if (P()) return Number(await cmd(['SADD', key, m]));
  alive(key); const s = M().set.get(key) || M().set.set(key, new Set()).get(key); if (s.has(m)) return 0; s.add(m); return 1;
}
export async function sismember(key, m) { if (P()) return Number(await cmd(['SISMEMBER', key, m])) === 1; alive(key); return !!M().set.get(key)?.has(m); }
export async function smembers(key) { if (P()) return (await cmd(['SMEMBERS', key])) || []; alive(key); return [...(M().set.get(key) || [])]; }
export async function srem(key, m) { if (P()) await cmd(['SREM', key, m]); else M().set.get(key)?.delete(m); }
export async function scard(key) { if (P()) return Number(await cmd(['SCARD', key])) || 0; alive(key); return M().set.get(key)?.size || 0; }
export async function incr(key, ttlSec) {
  if (P()) { const n = Number(await cmd(['INCR', key])); if (n === 1 && ttlSec) await cmd(['EXPIRE', key, ttlSec]); return n; }
  alive(key); const n = (Number(M().str.get(key)) || 0) + 1; M().str.set(key, n); if (n === 1 && ttlSec) M().exp.set(key, Date.now() + ttlSec * 1000); return n;
}
export async function decr(key) { if (P()) await cmd(['DECR', key]); else M().str.set(key, (Number(M().str.get(key)) || 1) - 1); }
// Limite de tentativas por janela (true = pode continuar)
export async function hit(key, max, sec) { try { return (await incr('rl:' + key, sec)) <= max; } catch { return true; } }
