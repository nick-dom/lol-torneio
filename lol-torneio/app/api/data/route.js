import { cookies } from 'next/headers';
import { load, save, persistent } from '@/lib/store';
import { valid } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json({ ...(await load()), _persistent: persistent }); }
export async function PUT(req) {
  if (!valid(cookies().get('adm')?.value)) return new Response('Não autorizado', { status: 401 });
  const raw = await req.text();
  if (raw.length > 3e6) return new Response('Dados grandes demais (máx. 3 MB). Reduza as imagens enviadas.', { status: 413 });
  let d; try { d = JSON.parse(raw); } catch { return new Response('JSON inválido', { status: 400 }); }
  if (!d || !Array.isArray(d.teams) || !Array.isArray(d.matches) || !d.config) return new Response('Dados inválidos', { status: 400 });
  delete d._persistent;
  await save(d);
  return Response.json({ ok: true });
}
