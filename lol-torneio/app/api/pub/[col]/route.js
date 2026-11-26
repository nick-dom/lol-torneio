import { COLS, listPub } from '@/lib/cms';
import { load } from '@/lib/store';
import { vagas } from '@/lib/inscr';
export const dynamic = 'force-dynamic';
export async function GET(req, { params }) {
  try {
    if (params.col === 'vagas') return Response.json(await vagas());
    if (!COLS[params.col]) return new Response('Não encontrado', { status: 404 });
    let items = await listPub(params.col);
    const q = new URL(req.url).searchParams;
    if (q.get('slug')) items = items.filter((x) => x.slug === q.get('slug'));
    if (q.get('id')) items = items.filter((x) => x.id === q.get('id'));
    return Response.json(items);
  } catch (e) { console.error('[api/pub]', e); return new Response('Falha ao ler os dados.', { status: 500 }); }
}
