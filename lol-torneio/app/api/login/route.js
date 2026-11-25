import { cookies } from 'next/headers';
import { sign, session, safeEq, checkPw } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { loadUsers, audit } from '@/lib/store';
export const dynamic = 'force-dynamic';
// Secure só quando a conexão é HTTPS (senão Safari/localhost descartam o cookie e o login "não pega")
const opt = (req) => 'HttpOnly; Path=/; SameSite=Lax' + ((req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '')) === 'https' ? '; Secure' : '');
const tries = globalThis.__tries || (globalThis.__tries = new Map());
export async function GET() {
  const s = await getSession();
  return Response.json({ auth: !!s, configured: !!process.env.ADMIN_PASSWORD, user: s ? { name: s.n, role: s.r, team: s.t } : null });
}
export async function POST(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return new Response('Defina ADMIN_PASSWORD nas variáveis de ambiente.', { status: 500 });
  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
  const t = (tries.get(ip) || []).filter((x) => Date.now() - x < 6e5);
  if (t.length >= 8) return new Response('Muitas tentativas. Aguarde 10 minutos.', { status: 429 });
  const { user = '', password } = await req.json().catch(() => ({}));
  await new Promise((r) => setTimeout(r, 400));
  const login = String(user).trim().toLowerCase();
  let s = null;
  if (!login || login === 'admin') { if (safeEq(password || '', pw)) s = { u: 'env', n: 'Administrador', r: 'super' }; }
  else {
    const u = (await loadUsers().catch(() => [])).find((x) => x.login === login);
    // sempre calcula o hash (mesmo sem usuário) para não revelar quais logins existem pelo tempo de resposta
    const ok = checkPw(password || '', u?.pass || 'x:y');
    if (u && ok) s = { u: u.id, n: u.name || u.login, r: u.role, t: u.team || null };
  }
  if (!s) { tries.set(ip, [...t, Date.now()]); return new Response('Usuário ou senha incorretos', { status: 401 }); }
  tries.delete(ip);
  await audit({ u: s.n, r: s.r, a: 'login' });
  return new Response('{"ok":true}', { headers: { 'Set-Cookie': `adm=${sign(s)}; ${opt(req)}; Max-Age=604800`, 'Content-Type': 'application/json' } });
}
export async function DELETE(req) { return new Response('{"ok":true}', { headers: { 'Set-Cookie': `adm=; ${opt(req)}; Max-Age=0` } }); }
