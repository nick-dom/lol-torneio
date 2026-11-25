import crypto from 'crypto';
import { getSession } from '@/lib/session';
import { hashPw } from '@/lib/auth';
import { ROLES } from '@/lib/perm';
import { loadUsers, saveUsers, load, audit } from '@/lib/store';
export const dynamic = 'force-dynamic';
const pub = (u) => ({ id: u.id, login: u.login, name: u.name, role: u.role, team: u.team || '' });
async function guard() { const s = await getSession(); return s && s.r === 'super' ? s : null; }
const bad = (m, c = 400) => new Response(m, { status: c });

export async function GET() {
  if (!(await guard())) return bad('Não autorizado', 401);
  return Response.json((await loadUsers()).map(pub));
}
export async function POST(req) {
  const s = await guard(); if (!s) return bad('Não autorizado', 401);
  const b = await req.json().catch(() => ({}));
  const login = String(b.login || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(login) || login === 'admin') return bad('Login inválido: 3 a 30 caracteres (letras, números, ponto, hífen, sublinhado). "admin" é reservado.');
  if (String(b.password || '').length < 8) return bad('A senha precisa ter pelo menos 8 caracteres.');
  if (!ROLES[b.role]) return bad('Papel inválido.');
  let team = '';
  if (b.role === 'representante') {
    team = String(b.team || '');
    if (!(await load()).teams.some((t) => t.id === team)) return bad('Escolha a equipe do representante.');
  }
  const users = await loadUsers();
  if (users.some((u) => u.login === login)) return bad('Já existe um usuário com este login.', 409);
  const u = { id: crypto.randomBytes(6).toString('hex'), login, name: String(b.name || login).trim().slice(0, 60), role: b.role, team, pass: hashPw(b.password) };
  await saveUsers([...users, u]);
  await audit({ u: s.n, r: s.r, a: 'criou usuário', alvo: login + ' (' + ROLES[u.role] + ')' });
  return Response.json(pub(u));
}
export async function PATCH(req) {
  const s = await guard(); if (!s) return bad('Não autorizado', 401);
  const b = await req.json().catch(() => ({}));
  const users = await loadUsers(), u = users.find((x) => x.id === b.id);
  if (!u) return bad('Usuário não encontrado.', 404);
  if (b.password !== undefined) { if (String(b.password).length < 8) return bad('A senha precisa ter pelo menos 8 caracteres.'); u.pass = hashPw(b.password); }
  if (b.role !== undefined) { if (!ROLES[b.role]) return bad('Papel inválido.'); u.role = b.role; if (b.role !== 'representante') u.team = ''; }
  if (b.team !== undefined && u.role === 'representante') u.team = String(b.team);
  await saveUsers(users);
  await audit({ u: s.n, r: s.r, a: 'alterou usuário', alvo: u.login });
  return Response.json(pub(u));
}
export async function DELETE(req) {
  const s = await guard(); if (!s) return bad('Não autorizado', 401);
  const id = new URL(req.url).searchParams.get('id');
  const users = await loadUsers(), u = users.find((x) => x.id === id);
  if (!u) return bad('Usuário não encontrado.', 404);
  await saveUsers(users.filter((x) => x.id !== id));
  await audit({ u: s.n, r: s.r, a: 'removeu usuário', alvo: u.login });
  return Response.json({ ok: true });
}
