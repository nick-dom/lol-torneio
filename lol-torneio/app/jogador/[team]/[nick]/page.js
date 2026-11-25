import { notFound } from 'next/navigation';
import { load } from '@/lib/store';
import { bracket, teamMap } from '@/lib/logic';
import { Logo } from '@/components/Logo';
import { Page, MatchList, teamMatches } from '@/components/Perfil';
import { opggUrl, slug } from '@/lib/players';
import { playerAgg, kda } from '@/lib/games';
export const dynamic = 'force-dynamic';
const find = async (p) => {
  const d = await load(), id = decodeURIComponent(p.team), nick = decodeURIComponent(p.nick);
  const t = d.teams.find((x) => x.id === id);
  const ok = t && [...t.players, ...t.reserves].includes(nick);
  return { d, t, nick, ok };
};
export async function generateMetadata({ params }) { const { ok, nick, t } = await find(params); return { title: ok ? `${nick} (${t.name}) — Copa Nexus` : 'Jogador não encontrado' }; }
export default async function Jogador({ params }) {
  const { d, t, nick, ok } = await find(params);
  if (!ok) notFound();
  const pr = t.profiles?.[nick] || {}, res = t.reserves.includes(nick), ph = d.media?.players?.[`${t.id}::${nick}`], op = opggUrl(pr);
  const B = bracket(d), T = teamMap(d), ms = teamMatches(d, B, t.id);
  const ag = playerAgg(d, Object.values(B.M).concat(d.matches.filter((m) => m.phase === 'g')), t.id, nick);
  const lanes = [pr.lane, pr.lane2].filter(Boolean).join(' / ');
  return (
    <Page>
      <section className="panel" style={{ '--c': t.color }}>
        <div className="pfhead">
          {ph ? <img className="av" src={`/api/img/${ph}`} alt={'Foto de ' + nick} /> : <span className="noimg" style={{ background: t.color }}>{nick.slice(0, 1).toUpperCase()}</span>}
          <div><p className="kicker">{res ? 'Reserva' : 'Titular'}</p><h1>{nick}</h1>
            <a className="tm tlink" href={'/equipe/' + slug(t.id)}><Logo t={t} s={26} />{t.name}</a></div>
        </div>
        <div className="kv">
          <div><small>Riot ID</small><b>{pr.riotId || '—'}</b></div><div><small>Rota</small><b>{lanes || '—'}</b></div><div><small>Elo atual</small><b>{pr.elo || '—'}</b></div>
          {pr.ranked && (pr.ranked.wins + pr.ranked.losses) > 0 && <div><small>Ranqueada solo</small><b>{pr.ranked.wins}V {pr.ranked.losses}D · {Math.round((pr.ranked.wins / (pr.ranked.wins + pr.ranked.losses)) * 100)}%</b></div>}
        </div>
        {op && <p style={{ marginTop: 14 }}><a className="btn" href={op} target="_blank" rel="noopener noreferrer">Ver no OP.GG ↗</a></p>}
        <p className="note">Elo e Riot ID são informados pela organização{pr.ranked?.at ? ` (elo consultado na Riot em ${new Date(pr.ranked.at).toLocaleDateString('pt-BR')}, com autorização do jogador)` : ''} e podem estar desatualizados.</p>
      </section>
      <section className="panel"><div className="ph"><h2>Estatísticas no torneio</h2></div>
        {ag.jogos ? <>
          <div className="kv">
            <div><small>Jogos</small><b>{ag.jogos}</b></div><div><small>Vitórias</small><b>{ag.wins} ({Math.round((ag.wins / ag.jogos) * 100)}%)</b></div>
            <div><small>K / D / A</small><b>{ag.k} / {ag.d} / {ag.a}</b></div><div><small>KDA</small><b>{kda(ag).toFixed(2)}</b></div>
            <div><small>Participação em abates</small><b>{ag.kpDen ? Math.round((ag.kpNum / ag.kpDen) * 100) + '%' : '–'}</b></div>
            <div><small>CS por jogo</small><b>{Math.round(ag.cs / ag.jogos)}</b></div><div><small>Dano por jogo</small><b>{Math.round(ag.dmg / ag.jogos).toLocaleString('pt-BR')}</b></div><div><small>Visão por jogo</small><b>{(ag.vision / ag.jogos).toFixed(1)}</b></div>
          </div>
          {Object.keys(ag.champs).length > 0 && <p className="note">Campeões: {Object.entries(ag.champs).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(', ')}</p>}
        </> : <p className="note">Nenhum jogo registrado para este jogador ainda.</p>}
      </section>
      <section className="panel"><div className="ph"><h2>Partidas da equipe</h2></div><MatchList ms={ms} T={T} /></section>
    </Page>
  );
}
