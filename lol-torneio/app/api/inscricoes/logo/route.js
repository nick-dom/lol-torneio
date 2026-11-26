import { fail, csrf, ipOf } from '@/lib/guard';
import { putImg } from '@/lib/store';
import { hit } from '@/lib/kv';
import { MAX_IMG, sniff } from '@/lib/media';
import { Bad } from '@/lib/cms';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';
// Upload público da logo da equipe: limite de tamanho, tipo conferido pelo conteúdo e limite por IP
export async function POST(req) {
  try {
    csrf(req);
    if (!(await hit('logo:' + ipOf(req), 10, 3600))) throw new Bad('Muitos envios. Tente mais tarde.', 429);
    const buf = Buffer.from(await req.arrayBuffer());
    if (!buf.length) throw new Bad('Arquivo vazio.');
    if (buf.length > MAX_IMG) throw new Bad(`Imagem acima de 400 KB (${Math.round(buf.length / 1024)} KB).`, 413);
    const type = sniff(buf); if (!type) throw new Bad('Formato não aceito. Use JPG, PNG, WEBP ou GIF.', 415);
    const id = crypto.randomBytes(8).toString('hex');
    await putImg(id, type, buf.toString('base64'));
    return Response.json({ id });
  } catch (e) { return fail(e); }
}
