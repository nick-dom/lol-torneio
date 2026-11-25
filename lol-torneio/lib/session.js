import { cookies } from 'next/headers';
import { session } from '@/lib/auth';
import { loadUsers } from '@/lib/store';
// Sessão atual, conferida contra o cadastro: se o usuário foi removido ou mudou de papel, vale o cadastro.
export async function getSession() {
  const s = session(cookies().get('adm')?.value);
  if (!s) return null;
  if (s.u === 'env') return { u: 'env', n: s.n, r: 'super', t: null };
  try {
    const u = (await loadUsers()).find((x) => x.id === s.u);
    return u ? { u: u.id, n: u.name || u.login, r: u.role, t: u.team || null } : null;
  } catch { return null; }
}
