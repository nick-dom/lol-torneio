import { Page } from '@/components/Perfil';
import { Logo } from '@/components/Logo';
import { buildHall } from '@/lib/hall';
import { load } from '@/lib/store';
import { listSeasons } from '@/lib/seasons';
import { dayBR, img } from '@/lib/pubview';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hall da Fama — Copa Nexus', description: 'Campeões, recordes, MVPs e premiações de todas as temporadas.' };
export default async function Hall() {
  const live = await load(), H = await buildHall(live), seasons = await listSeasons(live), S = Object.fromEntries(seasons.map((s) => [s.id, s]));
  const T = ({ t }) => (t ? <span className="tm"><Logo t={t} s={26} />{t.name}</span> : <span className="mut">—</span>);
  const mvps = H.awards.filter((a) => /mvp/i.test(a.category));
  return (
    <Page>
      <section className="panel"><div className="ph"><h2>Campeões de cada temporada</h2></div>
        {H.seasons.length ? <div className="tscroll"><table className="tbl"><thead><tr><th>Temporada</th><th>Campeão</th><th>Vice</th><th>3º lugar</th></tr></thead><tbody>
          {H.seasons.map((r) => <tr key={r.season.id}><td><a className="tlink" href={'/temporadas/' + r.season.id}>{r.season.name}</a> <small className="mut">{r.season.year}</small></td><td><T t={r.champion} /></td><td><T t={r.vice} /></td><td><T t={r.third} /></td></tr>)}
        </tbody></table></div> : <p className="note">A primeira temporada ainda não foi encerrada. Os campeões aparecem aqui quando a organização encerrar uma edição.</p>}
      </section>
      {H.teams.length > 0 && <section className="panel"><div className="ph"><h2>Equipes históricas</h2></div><div className="tscroll"><table className="tbl"><thead><tr><th>Equipe</th><th>Títulos</th><th>Vices</th><th>3º lugares</th></tr></thead><tbody>{H.teams.map((t) => <tr key={t.name}><td><span className="tm"><Logo t={t} s={26} />{t.name}</span></td><td className="pts">{t.titulos}</td><td>{t.vices}</td><td>{t.terceiros}</td></tr>)}</tbody></table></div></section>}
      <section className="panel"><div className="ph"><h2>MVPs</h2></div>
        {mvps.length ? <div className="mgrid">{mvps.map((a) => <div key={a.id} className="mcard">{a.image ? <img src={img(a.image)} alt="" loading="lazy" /> : <div className="noimg">★</div>}<b>{a.winnerPlayer || a.winnerLabel || '—'}</b><small className="mut">{a.name} · {S[a.seasonId]?.name}</small></div>)}</div> : <p className="note">Nenhum MVP registrado ainda.</p>}
      </section>
      <section className="panel"><div className="ph"><h2>Premiações</h2></div>
        {H.awards.length ? <div className="mgrid">{H.awards.map((a) => <div key={a.id} className="mcard">{a.image ? <img src={img(a.image)} alt="" loading="lazy" /> : <div className="noimg">🏆</div>}<b>{a.name}</b><small className="mut">{a.category} · {S[a.seasonId]?.name}</small><span>{a.winnerPlayer || a.winnerLabel || '—'}</span>{a.description && <p className="note" style={{ margin: 0 }}>{a.description}</p>}{a.date && <small className="mut">Entregue em {dayBR(a.date)}</small>}</div>)}</div> : <p className="note">Nenhuma premiação cadastrada ainda.</p>}
      </section>
      <section className="panel"><div className="ph"><h2>Jogadores de destaque</h2></div>
        {H.top.length ? <div className="tscroll"><table className="tbl"><thead><tr><th>#</th><th>Jogador</th><th>Equipes</th><th>Jogos</th><th>K/D/A</th><th>KDA</th></tr></thead><tbody>{H.top.map((p, i) => <tr key={p.nick}><td className="pos">{i + 1}º</td><td>{p.nick}</td><td>{p.teams.join(', ')}</td><td>{p.j}</td><td>{p.k}/{p.d}/{p.a}</td><td className="pts">{p.kda.toFixed(2)}</td></tr>)}</tbody></table></div> : <p className="note">As estatísticas aparecem quando os jogos forem registrados.</p>}
        <p className="note">Ranking por KDA, somando todas as temporadas com jogos registrados.</p>
      </section>
      <section className="panel"><div className="ph"><h2>Recordes da competição</h2></div>
        {H.records.length ? <div className="kv">{H.records.map((r) => <div key={r.label}><small>{r.label}</small><b>{r.value}</b><small>{r.nick}{r.team ? ` (${r.team})` : ''} · {r.season}</small></div>)}</div> : <p className="note">Sem recordes ainda: dependem das estatísticas por jogo.</p>}
      </section>
    </Page>
  );
}
