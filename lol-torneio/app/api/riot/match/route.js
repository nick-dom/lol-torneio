import { getSession } from '@/lib/session';
import { can } from '@/lib/perm';
import { load } from '@/lib/store';
import { fetchMatch, champNames } from '@/lib/riot';
import { mapMatch } from '@/lib/riotmap';
export const dynamic = 'force-dynamic';
// Importa um jogo pelo ID da partida (BR1_...). Não grava: devolve o jogo mapeado e avisos de validação.
export async function POST(req) {
  const s = await getSession();
  if (!s || !can(s.r, 'estatisticas')) return new Response('Não autorizado', { status: 401 });
  const { id, a, b } = await req.json().catch(() => ({}));
  const d = await load();
  const ros = (tid) => { const t = d.teams.find((x) => x.id === tid); return [...(t?.players || []), ...(t?.reserves || [])].map((nick) => ({ nick, riotId: t.profiles?.[nick]?.riotId || '' })); };
  try {
    const [json, names] = await Promise.all([fetchMatch(String(id || '').trim().toUpperCase()), champNames().catch(() => ({}))]);
    const out = mapMatch(json, { a: ros(a), b: ros(b) }, names);
    if (!Object.keys(names).length) out.warnings.push('Nomes de campeões indisponíveis (Data Dragon): bans podem faltar e nomes ficam no formato interno.');
    return Response.json(out);
  } catch (e) { return new Response(e.message, { status: 502 }); }
}
