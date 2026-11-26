import { need, body, fail, csrf } from '@/lib/guard';
import { listSeasons, closeSeason, newSeason, editMeta, correctMatch, getSeasonData } from '@/lib/seasons';
import { audit } from '@/lib/store';
import { notify } from '@/lib/push';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  try {
    const q = new URL(req.url).searchParams.get('teams');
    // Equipes/jogadores de uma temporada (usado para escolher o vencedor de uma premiação)
    if (q) { await need('premiacoes'); const d = await getSeasonData(q); if (!d) return new Response('Temporada não encontrada', { status: 404 }); return Response.json(d.teams.filter((t) => t.players.length || t.reserves.length || t.reg).map((t) => ({ id: t.id, name: t.name, players: [...t.players, ...t.reserves] }))); }
    await need('temporadas'); return Response.json(await listSeasons());
  } catch (e) { return fail(e); }
}
export async function POST(req) {
  try {
    csrf(req); const s = await need('temporadas'), b = await body(req, 60000);
    let r;
    if (b.action === 'encerrar') r = await closeSeason(s, { force: b.force === true });
    else if (b.action === 'nova') r = await newSeason(s, b);
    else if (b.action === 'editar') r = await editMeta(b.id, b);
    else if (b.action === 'corrigir') r = await correctMatch(b.id, b, s);
    else return new Response('Ação inválida.', { status: 400 });
    await audit({ u: s.n, r: s.r, a: 'temporada: ' + b.action, sec: ['temporadas'], alvo: r.name });
    if (b.action === 'nova') await notify('avisos', { title: 'Nova temporada: ' + r.name, body: 'Acompanhe as inscrições e a tabela.', url: '/' });
    return Response.json(r);
  } catch (e) { return fail(e); }
}
