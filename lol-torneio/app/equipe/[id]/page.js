import { notFound } from 'next/navigation';
import { load } from '@/lib/store';
import { bracket, teamMap } from '@/lib/logic';
import { Logo } from '@/components/Logo';
import { Page, MatchList, teamMatches } from '@/components/Perfil';
import { slug } from '@/lib/players';
export const dynamic = 'force-dynamic';
const find = async (p) => { const d = await load(); const id = decodeURIComponent(p.id); return { d, t: d.teams.find((x) => x.id === id) }; };
export async function generateMetadata({ params }) { const { t } = await find(params); return { title: t ? `${t.name} — Copa Nexus` : 'Equipe não encontrada' }; }
export default async function Equipe({ params }) {
  const { d, t } = await find(params);
  if (!t) notFound();
  const B = bracket(d), T = teamMap(d), pos = B.st.findIndex((r) => r.id === t.id), s = B.st[pos];
  const ms = teamMatches(d, B, t.id);
  const photos = d.media?.players || {};
  const card = (n, res) => { const pr = t.profiles?.[n] || {}, ph = photos[`${t.id}::${n}`]; return (
    <a key={n} className="pcard" href={`/jogador/${slug(t.id)}/${slug(n)}`} style={{ '--c': t.color }}>
      {ph ? <img src={`/api/img/${ph}`} alt="" loading="lazy" /> : <span className="noimg" style={{ background: t.color }}>{n.slice(0, 1).toUpperCase()}</span>}
      <b>{n}</b><small>{[pr.lane, pr.elo].filter(Boolean).join(' · ') || (res ? 'Reserva' : 'Titular')}</small></a>); };
  return (
    <Page>
      <section className="panel" style={{ '--c': t.color }}>
        <div className="pfhead"><Logo t={t} s={96} /><div><p className="kicker">Equipe</p><h1>{t.name}</h1></div></div>
        <div className="kv">
          <div><small>Posição</small><b>{pos + 1}º</b></div><div><small>Vitórias</small><b>{s.w}</b></div><div><small>Derrotas</small><b>{s.l}</b></div>
          <div><small>Pontos</small><b>{s.p}</b></div><div><small>Saldo</small><b>{s.diff > 0 ? '+' : ''}{s.diff}</b></div><div><small>Aproveitamento</small><b>{s.j ? Math.round((s.w / s.j) * 100) + '%' : '–'}</b></div>
          <div><small>Capitão</small><b>{t.captain || 'a definir'}</b></div><div><small>Representante</small><b>{t.rep || 'a definir'}</b></div>
        </div>
      </section>
      {(() => { const ids = [...t.players, ...t.reserves].map((n) => t.profiles?.[n]?.riotId).filter(Boolean); return ids.length > 1 && <p style={{ margin: '0 0 12px' }}><a className="btn" href={'https://www.op.gg/multisearch/br?summoners=' + encodeURIComponent(ids.join(','))} target="_blank" rel="noopener noreferrer">Ver equipe no OP.GG ↗</a></p>; })()}
      <section className="panel"><div className="ph"><h2>Titulares</h2></div>{t.players.length ? <div className="plist">{t.players.map((n) => card(n, false))}</div> : <p className="note">Titulares a divulgar.</p>}</section>
      {t.reserves.length > 0 && <section className="panel"><div className="ph"><h2>Reservas</h2></div><div className="plist">{t.reserves.map((n) => card(n, true))}</div></section>}
      <section className="panel"><div className="ph"><h2>Partidas</h2></div><MatchList ms={ms} T={T} /></section>
    </Page>
  );
}
