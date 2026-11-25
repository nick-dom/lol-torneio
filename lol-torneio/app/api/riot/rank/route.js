import { getSession } from '@/lib/session';
import { can } from '@/lib/perm';
import { load } from '@/lib/store';
import { rankByRiotId } from '@/lib/riot';
export const dynamic = 'force-dynamic';
// Consulta o elo de UM jogador, só se ele autorizou (consentimento salvo) e só a pedido de quem tem permissão.
// Não grava nada: devolve os dados e o painel os aplica; vão ao ar quando a pessoa clicar em Salvar.
export async function POST(req) {
  const s = await getSession();
  if (!s || !can(s.r, 'equipes')) return new Response('Não autorizado', { status: 401 });
  const { team, nick } = await req.json().catch(() => ({}));
  if (s.r === 'representante' && s.t !== team) return new Response('Você só pode consultar jogadores da sua equipe.', { status: 403 });
  const t = (await load()).teams.find((x) => x.id === team), p = t?.profiles?.[nick];
  if (!p) return new Response('Jogador não encontrado (salve o cadastro antes de consultar).', { status: 404 });
  if (!p.consent) return new Response('Sem autorização do jogador: marque "Autorizou consulta à Riot" e salve antes.', { status: 403 });
  if (!p.riotId) return new Response('Jogador sem Riot ID salvo.', { status: 400 });
  try { return Response.json(await rankByRiotId(p.riotId)); }
  catch (e) { return new Response(e.message, { status: 502 }); }
}
