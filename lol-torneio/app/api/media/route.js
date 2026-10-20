import { cookies } from 'next/headers';
import { valid } from '@/lib/auth';
import { putImg } from '@/lib/store';
import { MAX_IMG } from '@/lib/media';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

// Detecta o tipo real pelo conteúdo (não confia no que o navegador diz). SVG é recusado de propósito (risco de script).
function kind(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.slice(0, 4).toString() === 'GIF8') return 'image/gif';
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
export async function POST(req) {
  if (!valid(cookies().get('adm')?.value)) return new Response('Não autorizado', { status: 401 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return new Response('Arquivo vazio', { status: 400 });
  if (buf.length > MAX_IMG) return new Response(`Imagem acima de 400 KB (${Math.round(buf.length / 1024)} KB).`, { status: 413 });
  const type = kind(buf);
  if (!type) return new Response('Formato não aceito. Use JPG, PNG, WEBP ou GIF.', { status: 415 });
  const id = crypto.randomBytes(8).toString('hex');
  try { await putImg(id, type, buf.toString('base64')); } catch (e) { console.error('[api/media]', e); return new Response('Falha ao gravar no banco: ' + e.message, { status: 500 }); }
  return Response.json({ id });
}
