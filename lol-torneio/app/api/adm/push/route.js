import { need, body, fail, csrf } from '@/lib/guard';
import { stats, sendPush, TYPES } from '@/lib/push';
import { audit } from '@/lib/store';
import { Bad } from '@/lib/cms';
export const dynamic = 'force-dynamic';
export async function GET() { try { await need('push'); return Response.json({ ...(await stats()), types: TYPES }); } catch (e) { return fail(e); } }
export async function POST(req) {
  try {
    csrf(req); const s = await need('push'), b = await body(req, 5000);
    const title = String(b.title || '').trim(), text = String(b.body || '').trim();
    if (!title) throw new Bad('Informe o título da notificação.');
    const url = String(b.url || '/').trim(); if (!/^\/[\w\-./?=&#]*$/.test(url)) throw new Bad('O link deve ser um caminho do site, como /noticias.');
    const r = await sendPush(TYPES[b.type] ? b.type : 'avisos', { title, body: text, url });
    if (r.configured === false) throw new Bad('Notificações não configuradas (faltam as chaves VAPID). Veja o README.', 503);
    if (r.error) throw new Bad(r.error, 500);
    await audit({ u: s.n, r: s.r, a: 'enviou notificação', sec: ['push'], alvo: title });
    return Response.json(r);
  } catch (e) { return fail(e); }
}
