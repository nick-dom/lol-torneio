// Chamadas ao servidor do painel ampliado: devolve { ok, data | error }
export async function api(url, method = 'GET', body) {
  try {
    const r = await fetch(url, { method, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
    const t = await r.text(); let j = t; try { j = JSON.parse(t); } catch {}
    return r.ok ? { ok: true, data: j } : { ok: false, status: r.status, error: typeof j === 'string' ? j : 'Erro ' + r.status };
  } catch { return { ok: false, error: 'Sem conexão com o servidor.' }; }
}
export const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
export function setIn(o, path, v) { const ks = path.split('.'); let c = o; for (const k of ks.slice(0, -1)) c = c[k] ||= {}; c[ks.at(-1)] = v; }
export const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '');
export const fmtDT = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };
