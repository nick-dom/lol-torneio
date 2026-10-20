import { getImg } from '@/lib/store';
import { ID_RE } from '@/lib/media';
export const dynamic = 'force-dynamic';
export async function GET(_req, { params }) {
  if (!ID_RE.test(params.id)) return new Response('Não encontrada', { status: 404 });
  const im = await getImg(params.id).catch(() => null);
  if (!im) return new Response('Não encontrada', { status: 404 });
  // O id é único e nunca muda de conteúdo: pode ficar em cache por muito tempo
  return new Response(im.buf, { headers: { 'Content-Type': im.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}
