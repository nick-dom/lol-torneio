import { notFound, redirect } from 'next/navigation';
import { Page, MatchList } from '@/components/Perfil';
import { Logo } from '@/components/Logo';
import { getMeta, getSeasonData } from '@/lib/seasons';
import { load } from '@/lib/store';
import { list } from '@/lib/cms';
import { bracket, teamMap, groups, KO } from '@/lib/logic';
import { collect, rank, METRICS } from '@/lib/rank';
import { dayBR, img } from '@/lib/pubview';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }) { const m = await getMeta(params.id); return { title: m ? `${m.name} — Copa Nexus` : 'Temporada não encontrada' }; }
export default async function Temporada({ params }) {
  const meta = await getMeta(params.id); if (!meta) notFound();
  const live = await load(); if (meta.id === live.config.seasonId) redirect('/');
  const d = await getSeasonData(meta.id, live); if (!d) notFound();
  const B = bracket(d), T = teamMap(d), C = collect(d, B), awards = (await list('premiacoes')).filter((a) => a.seasonId === meta.id);
  const mt = (m) => ({ ...m, _n: m.phase === 'k' ? KO[m.id] : `Rodada ${m.round}` });
  const rows = [...groups(d).map(mt), ...['sf1', 'sf2', 'third', 'final'].map((k) => mt(B.M[k]))];
  const res = meta.result || {}, ch = T[res.champion], vi = T[res.vice], th = T[res.third];
  const top = (m) => rank(C.players, m, 1).slice(0, 5);
  const photos = d.media?.players || {};
  return (
    <Page>
      <section className="panel"><p className="kicker">Temporada {meta.number} · {meta.year}{meta.status === 'arquivada' ? ' · arquivada' : ''}</p>
        <h1 style={{ fontSize: 38 }}>{meta.name}</h1><p className="note">{[meta.startDate && dayBR(meta.startDate), meta.endDate && 'até ' + dayBR(meta.endDate)].filter(Boolean).join(' ')}</p>
        <div className="kv"><div><small>Campeão</small><b>{ch?.name || '—'}</b></div><div><small>Vice</small><b>{vi?.name || '—'}</b></div><div><small>3º lugar</small><b>{th?.name || '—'}</b></div><div><small>Equipes</small><b>{d.teams.filter((t) => t.players.length).length || d.teams.length}</b></div></div>
        {(meta.corrections || []).length > 0 && <p className="note">Resultados corrigidos administrativamente após o encerramento: {meta.corrections.length} registro(s).</p>}
      </section>
      <section className="panel"><div className="ph"><h2>Classificação final</h2></div><div className="tscroll"><table className="tbl"><thead><tr><th>#</th><th>Time</th><th>J</th><th>V</th><th>D</th><th>Saldo</th><th>Pts</th></tr></thead><tbody>
        {(res.standings || B.st).map((r, i) => <tr key={r.id} className={i < 4 ? 'q' : ''}><td className="pos">{i + 1}º</td><td><span className="tm"><Logo t={T[r.id]} s={28} />{T[r.id]?.name}</span></td><td>{r.j}</td><td>{r.w}</td><td>{r.l}</td><td>{r.diff > 0 ? '+' : ''}{r.diff}</td><td className="pts">{r.p}</td></tr>)}
      </tbody></table></div></section>
      <section className="panel"><div className="ph"><h2>Resultados e partidas</h2></div><MatchList ms={rows} T={T} /><p className="note">Os detalhes por partida estão disponíveis apenas para a temporada atual.</p></section>
      <section className="panel"><div className="ph"><h2>Equipes e jogadores</h2></div>
        {d.teams.filter((t) => t.players.length || t.reserves.length).map((t) => <div key={t.id} style={{ marginBottom: 14 }}><h3 className="sh" style={{ color: t.color }}>{t.name}</h3><div className="plist">{[...t.players, ...t.reserves].map((n) => { const ph = photos[`${t.id}::${n}`]; return <div key={n} className="pcard" style={{ '--c': t.color }}>{ph ? <img src={img(ph)} alt="" loading="lazy" /> : <span className="noimg" style={{ background: t.color }}>{n.slice(0, 1).toUpperCase()}</span>}<b>{n}</b><small>{[t.profiles?.[n]?.lane, t.reserves.includes(n) ? 'Reserva' : 'Titular'].filter(Boolean).join(' · ')}</small></div>; })}</div></div>)}
        {!d.teams.some((t) => t.players.length || t.reserves.length) && <p className="note">Jogadores não cadastrados nesta temporada.</p>}
      </section>
      <section className="panel"><div className="ph"><h2>Estatísticas e rankings</h2></div>
        {C.jogos ? <div className="g2">{['kda', 'abates', 'dano', 'assistencias'].map((m) => <div key={m}><h3 className="sh">{METRICS[m].label} <small className="mut">{METRICS[m].unit}</small></h3>{top(m).map((p, i) => <p key={p.team + p.nick} className="news"><b>{i + 1}º</b> {p.nick} <span className="mut">({p.teamName})</span> — {METRICS[m].fmt(p.v)}</p>)}</div>)}</div> : <p className="note">Sem estatísticas por jogo registradas nesta temporada.</p>}
      </section>
      <section className="panel"><div className="ph"><h2>Premiações</h2></div>
        {awards.length ? <div className="mgrid">{awards.map((a) => <div key={a.id} className="mcard">{a.image ? <img src={img(a.image)} alt="" loading="lazy" /> : <div className="noimg">🏆</div>}<b>{a.name}</b><small className="mut">{a.category}</small><span>{a.winnerPlayer || a.winnerLabel || T[a.winnerTeam]?.name || '—'}</span></div>)}</div> : <p className="note">Sem premiações cadastradas para esta temporada.</p>}
      </section>
      <p><a className="btn" href="/temporadas">← Todas as temporadas</a> <a className="btn" href="/hall-da-fama">Hall da Fama</a></p>
    </Page>
  );
}
