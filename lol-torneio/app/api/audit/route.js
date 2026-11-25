import { getSession } from '@/lib/session';
import { can } from '@/lib/perm';
import { readAudit } from '@/lib/store';
export const dynamic = 'force-dynamic';
export async function GET() {
  const s = await getSession();
  if (!s || !can(s.r, 'auditoria')) return new Response('Não autorizado', { status: 401 });
  return Response.json(await readAudit());
}
