import { need, body, fail, csrf } from '@/lib/guard';
import { COLS, list, save, remove, nowIso } from '@/lib/cms';
import { audit } from '@/lib/store';
import { notify } from '@/lib/push';
import { fmtLocal } from '@/lib/tz';
export const dynamic = 'force-dynamic';
const sec = (col) => COLS[col]?.sec;
const visible = (n) => n && n.status === 'published' && n.publishedAt && Date.parse(n.publishedAt) <= Date.now();

async function hooks(col, item, old) {
  if (col === 'noticias' && visible(item) && !visible(old)) return notify('noticias', { title: 'Nova notícia', body: item.title, url: '/noticias/' + item.slug });
  if (col === 'transmissoes') {
    if (!old) return notify('partidas', { title: 'Nova transmissão agendada', body: `${item.title} — ${fmtLocal(item.date)}`, url: '/transmissao/' + item.id });
    if (old.date !== item.date) return notify('horarios', { title: 'Horário alterado', body: `${item.title}: agora ${fmtLocal(item.date)}`, url: '/transmissao/' + item.id });
    if (old.status !== item.status && item.status === 'ao_vivo') return notify('partidas', { title: 'Ao vivo agora', body: item.title, url: '/transmissao/' + item.id });
    if (old.status !== item.status && item.status === 'cancelada') return notify('avisos', { title: 'Transmissão cancelada', body: item.title, url: '/transmissoes' });
  }
}
export async function GET(_req, { params }) {
  try { await need(sec(params.col) || 'nenhuma'); return Response.json(await list(params.col)); } catch (e) { return fail(e); }
}
export async function POST(req, { params }) {
  try {
    csrf(req); const s = await need(sec(params.col) || 'nenhuma');
    const { item, old } = await save(params.col, await body(req), s);
    await audit({ u: s.n, r: s.r, a: old ? 'editou' : 'criou', sec: [params.col], alvo: item.title || item.name });
    const push = await hooks(params.col, item, old);
    return Response.json({ item, push: push || null });
  } catch (e) { return fail(e); }
}
export async function DELETE(req, { params }) {
  try {
    csrf(req); const s = await need(sec(params.col) || 'nenhuma');
    const old = await remove(params.col, new URL(req.url).searchParams.get('id'));
    await audit({ u: s.n, r: s.r, a: 'excluiu', sec: [params.col], alvo: old.title || old.name });
    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
