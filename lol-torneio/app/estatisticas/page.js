import { load } from '@/lib/store';
import { bracket } from '@/lib/logic';
import { Page } from '@/components/Perfil';
import { collect, rank, METRICS } from '@/lib/rank';
import { LANES, slug } from '@/lib/players';
import { kda } from '@/lib/games';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Estatísticas — Copa Nexus', description: 'Rankings de jogadores, equipes e campeões do torneio.' };

export default async function Estatisticas({ searchParams: sp }) {
  const d = await load(), B = bracket(d);
  const metric = METRICS[sp?.m] ? sp.m : 'kda';
  const fase = ['g', 'k'].includes(sp?.fase) ? sp.fase : '';
  const rota = LANES.includes(sp?.rota) ? sp.rota : '';
  const equipe = d.teams.some((t) => t.id === sp?.equipe) ? sp.equipe : '';
  const min = [1, 2, 3, 5].includes(+sp?.min) ? +sp.min : 1;
  const cur = { m: metric, fase, rota, equipe, min };
  const href = (patch) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries({ ...cur, ...patch })) if (v && !(k === 'm' && v === 'kda' && false)) q.set(k, v); return '?' + q.toString(); };
  const { players, champs, teams, jogos } = collect(d, B, { fase, rota, equipe });
  const rows = rank(players, metric, min), M = METRICS[metric];
  const chips = (key, opts) => <div className="chips">{opts.map(([v, l]) => <a key={v} href={href({ [key]: v })} className={'chip' + (String(cur[key]) === String(v) ? ' on' : '')}>{l}</a>)}</div>;
  return (
    <Page>
      <section className="panel">
        <div className="ph"><h2>Estatísticas do torneio</h2></div>
        <p className="note" style={{ marginTop: 0 }}>{jogos ? `Baseadas em ${jogos} jogo(s) registrado(s) pela organização.` : collect(d, B).jogos ? 'Nenhum jogo registrado com estes filtros.' : 'Nenhum jogo registrado ainda. Os rankings aparecem quando a organização lançar as estatísticas das partidas.'}</p>
        <h3 className="sh">Ranking</h3>{chips('m', Object.entries(METRICS).map(([k, v]) => [k, v.label]))}
        <div className="fgrid">
          <div><small className="mut">Fase</small>{chips('fase', [['', 'Todas'], ['g', 'Classificatória'], ['k', 'Mata-mata']])}</div>
          <div><small className="mut">Rota</small>{chips('rota', [['', 'Todas'], ...LANES.map((l) => [l, l])])}</div>
          <div><small className="mut">Equipe</small>{chips('equipe', [['', 'Todas'], ...d.teams.map((t) => [t.id, t.name])])}</div>
          <div><small className="mut">Mínimo de jogos</small>{chips('min', [1, 2, 3, 5].map((n) => [n, String(n)]))}</div>
        </div>
      </section>

      <section className="panel">
        <div className="ph"><h2>{M.label}</h2><small className="mut">{M.unit}</small></div>
        {rows.length ? <div className="tscroll"><table className="pt rk"><thead><tr><th>#</th><th>Jogador</th><th>Equipe</th><th>Rota</th><th>Jogos</th><th>{M.label}</th><th>Total</th></tr></thead><tbody>
          {rows.map((r, i) => <tr key={r.team + r.nick}><td>{i + 1}</td><td><b><a className="tlink" href={`/jogador/${slug(r.team)}/${slug(r.nick)}`}>{r.nick}</a></b></td><td>{r.teamName}</td><td>{r.lane || '—'}</td><td>{r.j}</td><td><b>{M.fmt(r.v)}</b></td><td className="mut">{M.total(r)}</td></tr>)}
        </tbody></table></div> : <p className="note">Nenhum jogador atende aos filtros{min > 1 ? ` (mínimo de ${min} jogos)` : ''}.</p>}
      </section>

      <section className="panel">
        <div className="ph"><h2>Equipes</h2></div>
        {teams.length ? <div className="tscroll"><table className="pt"><thead><tr><th>Equipe</th><th>Jogos</th><th>Vitórias</th><th>Aprov.</th><th>Abates/jogo</th><th>Ouro/jogo</th><th>Dano/jogo</th></tr></thead><tbody>
          {[...teams].sort((a, b) => b.w / b.j - a.w / a.j || b.j - a.j).map((t) => <tr key={t.id}><td><b><a className="tlink" href={'/equipe/' + slug(t.id)}>{t.name}</a></b></td><td>{t.j}</td><td>{t.w}</td><td>{Math.round((t.w / t.j) * 100)}%</td><td>{(t.k / t.j).toFixed(1)}</td><td>{t.gold ? Math.round(t.gold / t.j).toLocaleString('pt-BR') : '–'}</td><td>{t.dmg ? Math.round(t.dmg / t.j).toLocaleString('pt-BR') : '–'}</td></tr>)}
        </tbody></table></div> : <p className="note">Sem dados.</p>}
      </section>

      <section className="panel">
        <div className="ph"><h2>Campeões</h2></div>
        {champs.length ? <div className="tscroll"><table className="pt"><thead><tr><th>Campeão</th><th>Jogos</th><th>Vitórias</th><th>Taxa de vitória</th><th>KDA</th></tr></thead><tbody>
          {[...champs].sort((a, b) => b.j - a.j || b.w / b.j - a.w / a.j).map((c) => <tr key={c.name}><td><b>{c.name}</b></td><td>{c.j}</td><td>{c.w}</td><td>{Math.round((c.w / c.j) * 100)}%</td><td>{kda(c).toFixed(2)}</td></tr>)}
        </tbody></table></div> : <p className="note">Sem campeões registrados.</p>}
        <p className="note">Picks, bans, sinergias e histórico de drafts estão em <a className="tlink" href="/draft" style={{ color: 'var(--gold)' }}>Draft</a>.</p>
      </section>
    </Page>
  );
}
