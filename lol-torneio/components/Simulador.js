'use client';
import { useEffect, useMemo, useState } from 'react';
import { bracket, groups, played, win, KO, LBL, teamMap, rounds } from '@/lib/logic';
import { Logo } from '@/components/Logo';

// Estado compacto na URL: "g3:1-0,sf1:2-1"
const ser = (s) => Object.entries(s).map(([k, [a, b]]) => `${k}:${a}-${b}`).join(',');
const parse = (q, valid) => { const o = {}; for (const p of String(q || '').split(',')) { const m = p.match(/^([a-z0-9]+):(\d)-(\d)$/); if (m && valid.has(m[1])) o[m[1]] = [+m[2], +m[3]]; } return o; };
const scores = (bo) => { const n = Math.ceil(bo / 2), out = []; for (let i = n - 1; i >= 0; i--) out.push([n, i]); for (let i = 0; i < n; i++) out.push([i, n]); return out; };

export default function Simulador({ d }) {
  const T = useMemo(() => teamMap(d), [d]);
  const free = useMemo(() => new Set(d.matches.filter((m) => !played(m)).map((m) => m.id)), [d]);
  const [sim, setSim] = useState({});
  useEffect(() => { setSim(parse(new URLSearchParams(location.search).get('s'), free)); }, [free]);
  const put = (n) => { setSim(n); const q = ser(n); history.replaceState(null, '', q ? '?s=' + q : location.pathname); };
  const set = (id, v) => { const n = { ...sim }; if (v) n[id] = v; else delete n[id]; put(n); };

  // Projeção: resultados reais + escolhas da simulação (só em partidas ainda não disputadas)
  const dd = useMemo(() => ({ ...d, matches: d.matches.map((m) => (sim[m.id] && !played(m) ? { ...m, sa: sim[m.id][0], sb: sim[m.id][1] } : m)) }), [d, sim]);
  // KO só aceita placar se a equipe já está definida na projeção
  const B = bracket(dd);
  const nm = (id, m, i) => T[id]?.name || LBL[m]?.[i] || 'A definir';
  const n = Object.keys(sim).length;
  const [copied, setCopied] = useState(false);
  const share = async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };

  const Btn = ({ on, children, ...p }) => <button type="button" className={'sbtn' + (on ? ' on' : '')} {...p}>{children}</button>;
  const pending = groups(d).filter((m) => !played(m));

  return <>
    <section className="panel">
      <div className="ph"><h2>Simulador</h2></div>
      <p className="note" style={{ marginTop: 0 }}>Escolha resultados hipotéticos das partidas que ainda não foram disputadas e veja a classificação e o chaveamento resultantes. Nada disto é salvo no torneio: é só uma projeção sua. Resultados reais não podem ser alterados.</p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="btn" onClick={() => put({})} disabled={!n}>Limpar simulação</button>
        <button className="btn" onClick={share} disabled={!n}>{copied ? 'Link copiado' : 'Copiar link da simulação'}</button>
      </div>
    </section>

    <section className="panel">
      <div className="ph"><h2>Fase classificatória</h2><small className="mut">{pending.length ? `${pending.length} partida(s) em aberto` : 'encerrada'}</small></div>
      {rounds(d).map((r) => <div key={r}><h4 className="rd">Rodada {r}</h4>
        {groups(d).filter((m) => m.round === r).map((m) => {
          const real = played(m), v = real ? [m.sa, m.sb] : sim[m.id];
          return <div className="srowm" key={m.id}>
            <span className="tm"><Logo t={T[m.a]} s={24} />{nm(m.a)}</span>
            {real ? <b className="fixed">{m.sa} x {m.sb} <small>resultado real</small></b> : <span className="sbtns">
              <Btn on={v?.[0] === 1} onClick={() => set(m.id, [1, 0])}>Vitória {T[m.a]?.tag || 'A'}</Btn>
              <Btn on={v?.[1] === 1} onClick={() => set(m.id, [0, 1])}>Vitória {T[m.b]?.tag || 'B'}</Btn>
              {v && <Btn onClick={() => set(m.id, null)}>Limpar</Btn>}
            </span>}
            <span className="tm r">{nm(m.b)}<Logo t={T[m.b]} s={24} /></span>
          </div>;
        })}</div>)}
    </section>

    <section className="panel">
      <div className="ph"><h2>Classificação projetada</h2></div>
      <div className="tscroll"><table className="pt rk"><thead><tr><th>#</th><th>Equipe</th><th>J</th><th>V</th><th>D</th><th>Pts</th></tr></thead><tbody>
        {B.st.map((r, i) => <tr key={r.id} style={i < 4 ? { boxShadow: 'inset 3px 0 var(--grn)' } : undefined}><td>{i + 1}º</td><td><b>{T[r.id]?.name}</b></td><td>{r.j}</td><td>{r.w}</td><td>{r.l}</td><td><b>{r.p}</b></td></tr>)}
      </tbody></table></div>
      <p className="note">Os 4 primeiros avançam. Desempates seguem o regulamento; um empate total depende de partida extra e de prioridade definida pela organização.</p>
    </section>

    <section className="panel">
      <div className="ph"><h2>Playoffs projetados</h2></div>
      {!B.done && <p className="note" style={{ marginTop: 0 }}>Defina todas as partidas da fase classificatória para liberar o mata-mata.</p>}
      {['sf1', 'sf2', 'final', 'third'].map((id) => {
        const m = B.M[id], real = played(d.matches.find((x) => x.id === id)), ready = m.a && m.b, v = real ? [m.sa, m.sb] : sim[id], w = win(m);
        return <div className="srowm" key={id}>
          <b className="kl">{KO[id]} · MD{m.bo}</b>
          <span className={'tm' + (w === m.a ? ' win' : '')}><Logo t={T[m.a]} s={24} />{nm(m.a, id, 0)}</span>
          {real ? <b className="fixed">{m.sa} x {m.sb} <small>resultado real</small></b> : ready ? <span className="sbtns">{scores(m.bo).map(([a, b]) => <Btn key={a + '-' + b} on={v?.[0] === a && v?.[1] === b} onClick={() => set(id, [a, b])}>{a} x {b}</Btn>)}{v && <Btn onClick={() => set(id, null)}>Limpar</Btn>}</span> : <span className="mut">aguardando</span>}
          <span className={'tm r' + (w === m.b ? ' win' : '')}>{nm(m.b, id, 1)}<Logo t={T[m.b]} s={24} /></span>
        </div>;
      })}
      {B.champion && <div className="champ"><small>Campeão projetado</small><b><Logo t={T[B.champion]} s={40} /> {T[B.champion]?.name}</b>{B.vice && <span className="mut">Vice: {T[B.vice]?.name}{B.third ? ` · 3º lugar: ${T[B.third]?.name}` : ''}</span>}</div>}
    </section>
  </>;
}
