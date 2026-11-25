import { notFound } from 'next/navigation';
import { load } from '@/lib/store';
import { bracket, teamMap, win, played, KO, LBL } from '@/lib/logic';
import { Logo } from '@/components/Logo';
import { Page, fmt } from '@/components/Perfil';
import { OBJ, totals, kda, mvp, report, hasStats } from '@/lib/games';
import { slug } from '@/lib/players';
export const dynamic = 'force-dynamic';

async function find(id) {
  const d = await load(), B = bracket(d);
  const m = d.matches.find((x) => x.id === id) && B.M[id] ? B.M[id] : d.matches.find((x) => x.id === id);
  return { d, B, m };
}
export async function generateMetadata({ params }) {
  const { d, m } = await find(params.id), T = teamMap(d);
  return { title: m && T[m.a] && T[m.b] ? `${T[m.a].name} x ${T[m.b].name} — Copa Nexus` : 'Partida — Copa Nexus' };
}
export default async function Partida({ params, searchParams }) {
  const { d, B, m } = await find(decodeURIComponent(params.id));
  if (!m) notFound();
  const T = teamMap(d), games = d.games?.[m.id] || [];
  const gi = Math.min(Math.max(parseInt(searchParams?.g) || 1, 1), Math.max(games.length, 1)) - 1;
  const g = games[gi];
  const label = m.phase === 'k' ? KO[m.id] : `Rodada ${m.round}`;
  const name = { a: T[m.a]?.name || LBL[m.id]?.[0] || 'A definir', b: T[m.b]?.name || LBL[m.id]?.[1] || 'A definir' };
  const done = played(m), w = m.phase === 'k' ? win(m) : done ? (m.sa > m.sb ? m.a : m.sa < m.sb ? m.b : null) : null;
  const winSide = (gm) => (gm.winner ? name[gm.winner] : null);
  const mv = g && mvp(g);
  const row = (label, a, b, higher = true) => { const lead = a === b ? 0 : (a > b) === higher ? 1 : 2; return <tr key={label}><td className={lead === 1 ? 'lead' : ''}><b>{a}</b></td><td>{label}</td><td className={lead === 2 ? 'lead' : ''}><b>{b}</b></td></tr>; };
  const nf = (v) => v.toLocaleString('pt-BR');
  return (
    <Page>
      <section className="panel">
        <p className="kicker">{label} · MD{m.bo}</p>
        <div className="mrow" style={{ borderBottom: 0, gridTemplateColumns: '1fr auto 1fr' }}>
          <div className={'side' + (w && w === m.a ? ' w' : '')} style={{ fontSize: 20 }}><span>{name.a}</span><Logo t={T[m.a]} s={44} /></div>
          <div className="score">{done ? <><b style={{ fontSize: 44 }}>{m.sa}</b><i>x</i><b style={{ fontSize: 44 }}>{m.sb}</b></> : <i>vs</i>}</div>
          <div className={'side r' + (w && w === m.b ? ' w' : '')} style={{ fontSize: 20 }}><Logo t={T[m.b]} s={44} /><span>{name.b}</span></div>
        </div>
        <p className="note">{fmt(m.time)}{!done && ' · partida ainda não disputada'}</p>
      </section>

      {!games.length && <section className="panel"><p className="note">As estatísticas desta partida ainda não foram registradas.</p></section>}

      {games.length > 0 && <section className="panel">
        <div className="ph"><h2>Jogos da série</h2></div>
        <div className="gtabs">{games.map((x, i) => <a key={i} href={`?g=${i + 1}`} className={i === gi ? 'on' : ''}>Jogo {i + 1}<small>{winSide(x) ? `Vitória ${winSide(x)}` : 'sem vencedor'}{x.dur ? ` · ${x.dur}` : ''}</small></a>)}</div>
        {g.winner && <p className="report">{report(g, name, gi + 1)}</p>}
      </section>}

      {g && hasStats(g) && (() => {
        const A = totals(g, 'a'), Bt = totals(g, 'b');
        return <>
          <section className="panel"><div className="ph"><h2>Comparação entre equipes</h2></div>
            <table className="cmp"><thead><tr><td><b style={{ fontSize: 18 }}>{name.a}</b></td><td /><td><b style={{ fontSize: 18 }}>{name.b}</b></td></tr></thead><tbody>
              {row('Abates', A.k, Bt.k)}{row('Mortes', A.d, Bt.d, false)}{row('Assistências', A.a, Bt.a)}
              {(A.gold || Bt.gold) ? row('Ouro', nf(A.gold), nf(Bt.gold)) : null}
              {(A.dmg || Bt.dmg) ? row('Dano causado', nf(A.dmg), nf(Bt.dmg)) : null}
              {(A.cs || Bt.cs) ? row('CS', A.cs, Bt.cs) : null}
              {(A.vision || Bt.vision) ? row('Pontuação de visão', A.vision, Bt.vision) : null}
              {OBJ.filter(([k]) => g.obj.a[k] || g.obj.b[k]).map(([k, l]) => row(l, g.obj.a[k], g.obj.b[k]))}
              {['blood', 'tower', 'dragon'].filter((k) => g.first[k]).map((k) => <tr key={k}><td>{g.first[k] === 'a' ? '✓' : ''}</td><td>{{ blood: 'Primeiro abate', tower: 'Primeira torre', dragon: 'Primeiro dragão' }[k]}</td><td>{g.first[k] === 'b' ? '✓' : ''}</td></tr>)}
            </tbody></table>
          </section>
          {(g.bans?.a?.some(Boolean) || g.bans?.b?.some(Boolean)) && <section className="panel"><div className="ph"><h2>Bans</h2></div>{['a', 'b'].map((sd) => <p key={sd} className="note" style={{ marginTop: 4 }}><b style={{ color: 'var(--gold2)' }}>{name[sd]}:</b> {g.bans[sd].filter(Boolean).join(', ') || '—'}</p>)}</section>}
          {['a', 'b'].map((sd) => { const tk = totals(g, sd).k; return <section className="panel" key={sd}><div className="ph"><h2>{name[sd]}</h2></div>
            <div className="tscroll"><table className="pt"><thead><tr><th>Jogador</th><th>Pick</th><th>K/D/A</th><th>KDA</th><th>CS</th><th>Ouro</th><th>Dano</th><th>KP</th><th>Visão</th><th>Sent.</th></tr></thead><tbody>
              {g.players[sd].map((p, i) => <tr key={i}>
                <td className={mv && mv.nick === p.nick && mv.side === sd ? 'mv' : ''}><b>{T[m[sd]] && p.nick ? <a className="tlink" href={`/jogador/${slug(m[sd])}/${slug(p.nick)}`}>{p.nick}</a> : p.nick || '—'}</b><small>{p.champ}</small></td>
                <td>{p.pick || '–'}</td><td>{p.k}/{p.d}/{p.a}</td><td>{kda(p).toFixed(2)}</td><td>{p.cs}</td><td>{nf(p.gold)}</td><td>{nf(p.dmg)}</td><td>{tk ? Math.round(((p.k + p.a) / tk) * 100) + '%' : '–'}</td><td>{p.vision}</td><td>{p.wards}</td></tr>)}
            </tbody></table></div></section>; })}
        </>;
      })()}
      <p className="note">KDA = (abates + assistências) ÷ mortes (mínimo 1). KP = (abates + assistências) ÷ abates da equipe. {mv?.auto && 'MVP calculado automaticamente pelo melhor KDA do time vencedor.'}</p>
    </Page>
  );
}
