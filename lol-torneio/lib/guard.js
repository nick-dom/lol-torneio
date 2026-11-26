import { getSession } from './session';
import { can } from './perm';
import { Bad } from './cms';
// Resposta padrão de erro: mensagens do nosso Bad vão ao usuário; qualquer outro erro vira 500 sem detalhes internos
export const fail = (e) => { if (e instanceof Bad) return new Response(e.message, { status: e.code }); console.error('[api]', e); return new Response('Erro interno. Tente novamente.', { status: 500 }); };
export async function need(sec) {
  const s = await getSession();
  if (!s) throw new Bad('Não autorizado', 401);
  if (!can(s.r, sec)) throw new Bad('Seu papel não tem permissão para esta ação.', 403);
  return s;
}
export const body = async (req, max = 200000) => { const t = await req.text(); if (t.length > max) throw new Bad('Dados grandes demais.', 413); try { return JSON.parse(t || '{}'); } catch { throw new Bad('JSON inválido.'); } };
export const ipOf = (req) => (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'x').split(',')[0].trim();
// Proteção CSRF para POST/PUT/DELETE com cookie: a origem precisa ser o próprio site
export function sameOrigin(req) {
  const o = req.headers.get('origin'); if (!o) return true;
  try { return new URL(o).host === (req.headers.get('x-forwarded-host') || req.headers.get('host')); } catch { return false; }
}
export function csrf(req) { if (!sameOrigin(req)) throw new Bad('Origem não permitida.', 403); }
