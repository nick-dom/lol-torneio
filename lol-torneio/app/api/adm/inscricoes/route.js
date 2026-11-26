import { need, body, fail, csrf } from '@/lib/guard';
import { listAll, act, getCfg, setCfg, vagas } from '@/lib/inscr';
import { audit } from '@/lib/store';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { await need('inscricoes'); return Response.json({ items: await listAll(), cfg: await getCfg(), vagas: await vagas() }); } catch (e) { return fail(e); }
}
export async function POST(req) {
  try {
    csrf(req); const s = await need('inscricoes'); const b = await body(req);
    const item = await act(b.id, b, s);
    await audit({ u: s.n, r: s.r, a: 'inscrição: ' + b.action, sec: ['inscricoes'], alvo: item.team.name });
    return Response.json({ item, vagas: await vagas() });
  } catch (e) { return fail(e); }
}
export async function PUT(req) {
  try { csrf(req); const s = await need('inscricoes'); const c = await setCfg(await body(req)); await audit({ u: s.n, r: s.r, a: 'config. inscrições', sec: ['inscricoes'] }); return Response.json(c); } catch (e) { return fail(e); }
}
