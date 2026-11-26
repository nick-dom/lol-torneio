import { body, fail, csrf, ipOf } from '@/lib/guard';
import { create, ownerView, ownerEdit, vagas, getCfg, isOpen } from '@/lib/inscr';
import { hit } from '@/lib/kv';
import { Bad } from '@/lib/cms';
export const dynamic = 'force-dynamic';
// GET sem parâmetros: situação das inscrições (público). Com id+token: a própria inscrição.
export async function GET(req) {
  try {
    const q = new URL(req.url).searchParams;
    if (q.get('id')) {
      if (!(await hit('insc-view:' + ipOf(req), 30, 600))) throw new Bad('Muitas consultas. Aguarde alguns minutos.', 429);
      return Response.json(await ownerView(q.get('id'), q.get('token')));
    }
    return Response.json({ ...(await vagas()), open: await isOpen(), deadline: (await getCfg()).deadline });
  } catch (e) { return fail(e); }
}
export async function POST(req) {
  try {
    csrf(req);
    if (!(await hit('insc:' + ipOf(req), 6, 3600))) throw new Bad('Muitas inscrições deste endereço. Tente novamente mais tarde.', 429);
    return Response.json(await create(await body(req), ipOf(req)));
  } catch (e) { return fail(e); }
}
export async function PUT(req) {
  try {
    csrf(req);
    if (!(await hit('insc-edit:' + ipOf(req), 20, 3600))) throw new Bad('Muitas tentativas. Aguarde.', 429);
    const b = await body(req); return Response.json(await ownerEdit(b.id, b.token, b));
  } catch (e) { return fail(e); }
}
