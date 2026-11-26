import { need, body, fail, csrf } from '@/lib/guard';
import { listPolls, counts, savePoll, control, deletePoll, effective } from '@/lib/vote';
import { audit, load } from '@/lib/store';
import { notify } from '@/lib/push';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await need('votacao'); const live = await load(), out = [];
    for (const p of await listPolls()) { const c = await counts(p.id); out.push({ ...p, effective: effective(p), counts: c, total: Object.values(c).reduce((a, b) => a + b, 0) }); }
    const players = live.teams.flatMap((t) => [...t.players, ...t.reserves].map((n) => ({ id: t.id + '::' + n, nick: n, team: t.name })));
    return Response.json({ polls: out, players });
  } catch (e) { return fail(e); }
}
export async function POST(req) {
  try { csrf(req); const s = await need('votacao'); const p = await savePoll(await body(req), s); await audit({ u: s.n, r: s.r, a: 'salvou votação', sec: ['votacao'], alvo: p.title }); return Response.json(p); } catch (e) { return fail(e); }
}
export async function PATCH(req) {
  try {
    csrf(req); const s = await need('votacao'); const b = await body(req);
    const p = await control(b.id, b.action, s);
    await audit({ u: s.n, r: s.r, a: 'votação: ' + b.action, sec: ['votacao'], alvo: p.title });
    let push = null;
    if (b.action === 'iniciar') push = await notify('votacao', { title: 'Votação de MVP aberta!', body: p.title, url: '/votacao' });
    if (b.action === 'encerrar') push = await notify('votacao', { title: 'Votação encerrada', body: p.title, url: '/votacao' });
    if (b.action === 'publicar') push = await notify('votacao', { title: 'Resultado da votação publicado', body: p.title, url: '/votacao' });
    return Response.json({ item: p, push });
  } catch (e) { return fail(e); }
}
export async function DELETE(req) {
  try { csrf(req); const s = await need('votacao'); await deletePoll(new URL(req.url).searchParams.get('id')); await audit({ u: s.n, r: s.r, a: 'excluiu votação', sec: ['votacao'] }); return Response.json({ ok: true }); } catch (e) { return fail(e); }
}
