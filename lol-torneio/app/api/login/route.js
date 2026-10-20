import { cookies } from 'next/headers';
import { sign, valid, safeEq } from '@/lib/auth';
export const dynamic = 'force-dynamic';
const opt = 'HttpOnly; Path=/; SameSite=Lax' + (process.env.NODE_ENV === 'production' ? '; Secure' : '');
const tries = globalThis.__tries || (globalThis.__tries = new Map());
export async function GET() { return Response.json({ auth: valid(cookies().get('adm')?.value), configured: !!process.env.ADMIN_PASSWORD }); }
export async function POST(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return new Response('Defina ADMIN_PASSWORD nas variáveis de ambiente.', { status: 500 });
  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
  const t = (tries.get(ip) || []).filter((x) => Date.now() - x < 6e5);
  if (t.length >= 8) return new Response('Muitas tentativas. Aguarde 10 minutos.', { status: 429 });
  const { password } = await req.json().catch(() => ({}));
  await new Promise((r) => setTimeout(r, 400));
  if (!safeEq(password || '', pw)) { tries.set(ip, [...t, Date.now()]); return new Response('Senha incorreta', { status: 401 }); }
  tries.delete(ip);
  return new Response('{"ok":true}', { headers: { 'Set-Cookie': `adm=${sign()}; ${opt}; Max-Age=604800`, 'Content-Type': 'application/json' } });
}
export async function DELETE() { return new Response('{"ok":true}', { headers: { 'Set-Cookie': `adm=; ${opt}; Max-Age=0` } }); }
