import { load } from '@/lib/store';
import { bracket, teamMap } from '@/lib/logic';
import { Page } from '@/components/Perfil';
import { draftStats, draftHistory } from '@/lib/draft';
import { kda } from '@/lib/games';
import { slug } from '@/lib/players';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Draft — Copa Nexus', description: 'Picks, bans, taxa de vitória e sinergias dos campeões.' };

const ORD = { picks: 'Mais escolhidos', bans: 'Mais banidos', wr: 'Taxa de vitória', pres: 'Presença' };
export default async function Draft({ searchParams: sp }) {
  const d = await load(), B = bracket(d), T = teamMap(d);
  const o = ORD[sp?.o] ? sp.o : 'pres';
  const equipe = d.teams.some((t) => t.id === sp?.equipe) ? sp.equipe : '';
  const min = [1, 2, 3].includes(+sp?.min) ? +sp.min : 1;
  const cur = { o, equipe, min };
  const href = (patch) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries({ ...cur, ...patch })) if (v) q.set(k, v); return '?' + q.toString(); };
  const chips = (key, opts) => <div className="chips">{opts.map(([v, l]) => <a key={v} href={href({ [key]: v })} className={'chip' + (String(cur[key]) === String(v) ? ' on' : '')}>{l}</a>)}</div>;
  const { jogos, champs, pairs, pc } = draftStats(d, B, { equipe });
  const wr = (c) => (c.picks ? c.w / c.picks : -1);
  const sortC = { picks: (a, b) => b.picks - a.picks, bans: (a, b) => b.bans - a.bans, wr: (a, b) => wr(b) - wr(a) || b.picks - a.picks, pres: (a, b) => b.picks + b.bans - (a.picks + a.bans) }[o];
  const CL = [...champs].filter((c) => (o === 'wr' ? c.picks >= min : true)).sort(sortC);
  const slots = jogos; // um campeão aparece no máximo uma vez por jogo (pick ou ban)
  const P = pairs.filter((x) => x.j >= Math.max(min, 1)).sort((a, b) => b.j - a.j || b.w / b.j - a.w / a.j).slice(0, 15);
  const PC = pc.filter((x) => x.j >= min).sort((a, b) => b.j - a.j || kda(b) - kda(a)).slice(0, 25);
  const hist = equipe ? draftHistory(d, B, equipe) : [];
  return (
    <Page>
      <section className="panel">
        <div className="ph"><h2>Draft</h2></div>
        <p className="note" style={{ marginTop: 0 }}>{jogos ? `Baseado em ${jogos} jogo(s) registrado(s) pela organização.` : 'Nenhum jogo registrado ainda. O draft aparece quando a organização lançar picks e bans das partidas.'}</p>
        <div className="fgrid">
          <div><small className="mut">Ordenar campeões por</small>{chips('o', Object.entries(ORD))}</div>
          <div><small className="mut">Equipe (mostra o histórico de drafts)</small>{chips('equipe', [['', 'Todas'], ...d.teams.map((t) => [t.id, t.name])])}</div>
          <div><small className="mut">Mínimo de jogos (taxa de vitória, duplas, jogador × campeão)</small>{chips('min', [1, 2, 3].map((n) => [n, String(n)]))}</div>
        </div>
      </section>

      <section className="panel"><div className="ph"><h2>Campeões</h2><small className="mut">{ORD[o]}</small></div>
        {CL.length ? <div className="tscroll"><table className="pt rk"><thead><tr><th>#</th><th>Campeão</th><th>Picks</th><th>Bans</th><th>Presença</th><th>Vitórias</th><th>Taxa de vitória</th><th>KDA</th></tr></thead><tbody>
          {CL.map((c, i) => <tr key={c.name}><td>{i + 1}</td><td><b>{c.name}</b></td><td>{c.picks}</td><td>{c.bans}</td><td>{slots ? Math.round(((c.picks + c.bans) / slots) * 100) + '%' : '–'}</td><td>{c.w}</td><td>{c.picks ? Math.round((c.w / c.picks) * 100) + '%' : '–'}</td><td>{c.picks ? kda(c).toFixed(2) : '–'}</td></tr>)}
        </tbody></table></div> : <p className="note">Sem campeões registrados.</p>}
        <p className="note">Presença = (picks + bans) ÷ jogos considerados. Bans só aparecem se a organização os registrou.</p>
      </section>

      <section className="panel"><div className="ph"><h2>Sinergias</h2><small className="mut">duplas na mesma equipe</small></div>
        {P.length ? <div className="tscroll"><table className="pt"><thead><tr><th>Dupla</th><th>Jogos</th><th>Vitórias</th><th>Taxa de vitória</th></tr></thead><tbody>
          {P.map((x) => <tr key={x.pair}><td><b>{x.pair}</b></td><td>{x.j}</td><td>{x.w}</td><td>{Math.round((x.w / x.j) * 100)}%</td></tr>)}
        </tbody></table></div> : <p className="note">Nenhuma dupla com {min} jogo(s) ou mais.</p>}
        <p className="note">Com poucos jogos, a taxa de vitória é só indicativa.</p>
      </section>

      <section className="panel"><div className="ph"><h2>Jogador × campeão</h2></div>
        {PC.length ? <div className="tscroll"><table className="pt"><thead><tr><th>Jogador</th><th>Equipe</th><th>Campeão</th><th>Jogos</th><th>Vitórias</th><th>KDA</th></tr></thead><tbody>
          {PC.map((x) => <tr key={x.team + x.nick + x.champ}><td><b><a className="tlink" href={`/jogador/${slug(x.team)}/${slug(x.nick)}`}>{x.nick}</a></b></td><td>{T[x.team]?.name}</td><td>{x.champ}</td><td>{x.j}</td><td>{x.w}</td><td>{kda(x).toFixed(2)}</td></tr>)}
        </tbody></table></div> : <p className="note">Sem dados.</p>}
      </section>

      {equipe && <section className="panel"><div className="ph"><h2>Histórico de drafts — {T[equipe]?.name}</h2></div>
        {hist.length ? hist.map((h, i) => <div className="mrow" key={i} style={{ display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <b><a className="tlink" href={'/partida/' + h.m.id}>{h.m.phase === 'k' ? 'Mata-mata' : 'Rodada ' + h.m.round} · Jogo {h.n}</a> vs {T[h.vs]?.name}</b>
            <span style={{ color: h.hasWinner ? (h.won ? 'var(--grn)' : 'var(--red)') : 'var(--mut)' }}>{h.hasWinner ? (h.won ? 'Vitória' : 'Derrota') : 'Sem vencedor'}</span>
          </div>
          <p className="note" style={{ margin: '4px 0' }}><b>Picks:</b> {h.picks.map((p) => `${p.pick ? p.pick + 'º ' : ''}${p.champ} (${p.nick})`).join(' · ') || '—'}</p>
          <p className="note" style={{ margin: 0 }}><b>Bans da equipe:</b> {h.bans.join(', ') || '—'} · <b>Bans do adversário:</b> {h.bansAgainst.join(', ') || '—'}</p>
        </div>) : <p className="note">Nenhum draft registrado para esta equipe.</p>}
      </section>}
    </Page>
  );
}
