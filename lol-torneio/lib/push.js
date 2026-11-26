// Notificações push (Web Push + VAPID). Só funciona com as chaves configuradas; sem elas, nada é simulado.
import crypto from 'crypto';
import { hall, hget, hset, hdel } from './kv';
import { Bad, nowIso } from './cms';

const KEY = 'lol-push';
export const TYPES = { partidas: 'Nova partida agendada', horarios: 'Alteração de horário', lembretes: 'Partida prestes a começar', resultados: 'Resultado publicado', noticias: 'Nova notícia', votacao: 'Início e encerramento de votação', avisos: 'Atualizações importantes do campeonato' };
export const vapid = () => ({ pub: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '', priv: process.env.VAPID_PRIVATE_KEY || '', subject: process.env.VAPID_SUBJECT || '' });
export const configured = () => { const v = vapid(); return !!(v.pub && v.priv && /^(mailto:|https:)/.test(v.subject)); };
const idOf = (endpoint) => crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
const prefsOf = (p) => (Array.isArray(p) ? [...new Set(p.filter((x) => TYPES[x]))] : Object.keys(TYPES));

export async function subscribe(sub, prefs) {
  const e = String(sub?.endpoint || ''), k = sub?.keys || {};
  if (!/^https:\/\//.test(e) || e.length > 700 || typeof k.p256dh !== 'string' || typeof k.auth !== 'string' || k.p256dh.length > 200 || k.auth.length > 100) throw new Bad('Inscrição de notificação inválida.');
  const id = idOf(e), old = await hget(KEY, id);
  await hset(KEY, id, { id, endpoint: e, keys: { p256dh: k.p256dh, auth: k.auth }, prefs: prefsOf(prefs ?? old?.prefs), createdAt: old?.createdAt || nowIso(), updatedAt: nowIso() });
  return { id };
}
export async function updatePrefs(endpoint, prefs) {
  const id = idOf(String(endpoint || '')), old = await hget(KEY, id); if (!old) throw new Bad('Inscrição não encontrada. Ative as notificações de novo.', 404);
  old.prefs = prefsOf(prefs); old.updatedAt = nowIso(); await hset(KEY, id, old); return { prefs: old.prefs };
}
export async function getPrefs(endpoint) { const o = await hget(KEY, idOf(String(endpoint || ''))); return o ? { subscribed: true, prefs: o.prefs } : { subscribed: false, prefs: [] }; }
export async function unsubscribe(endpoint) { await hdel(KEY, idOf(String(endpoint || ''))); }
export async function stats() { const a = await hall(KEY); const by = {}; for (const t of Object.keys(TYPES)) by[t] = a.filter((x) => x.prefs.includes(t)).length; return { total: a.length, by, configured: configured() }; }

// Envia para quem aceitou o tipo. Assinaturas expiradas (404/410) são removidas. Nunca lança: devolve o resumo.
export async function sendPush(type, { title, body = '', url = '/' }) {
  if (!TYPES[type]) return { ok: false, error: 'tipo inválido' };
  if (!configured()) return { ok: false, configured: false, sent: 0, removed: 0, failed: 0 };
  let wp;
  try { wp = (await import('web-push')).default; } catch { return { ok: false, configured: true, error: 'Pacote web-push não instalado (npm install).', sent: 0, removed: 0, failed: 0 }; }
  const v = vapid(); wp.setVapidDetails(v.subject, v.pub, v.priv);
  const subs = (await hall(KEY)).filter((s) => s.prefs.includes(type));
  const payload = JSON.stringify({ title: String(title).slice(0, 90), body: String(body).slice(0, 180), url: String(url).startsWith('/') ? url : '/', tag: type });
  let sent = 0, removed = 0, failed = 0;
  await Promise.all(subs.map(async (s) => {
    try { await wp.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 3600 }); sent++; }
    catch (e) { if (e?.statusCode === 404 || e?.statusCode === 410) { await hdel(KEY, s.id).catch(() => {}); removed++; } else { failed++; console.error('[push]', e?.statusCode || e?.message); } }
  }));
  return { ok: true, configured: true, sent, removed, failed, total: subs.length };
}
// Disparo "sem bloquear": falha de push nunca derruba a ação do administrador
export const notify = (type, p) => sendPush(type, p).catch((e) => { console.error('[notify]', e); return { ok: false }; });
