'use client';
import { useEffect, useState } from 'react';

const dt = (s) => (s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
const ST = { open: 'Aberta', paused: 'Pausada', closed: 'Encerrada', scheduled: 'Agendada' };

function Poll({ p, reload }) {
  const [sel, setSel] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState(null);
  const canVote = p.status === 'open' && !p.voted;
  async function vote() {
    if (!sel) return; setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/votos', { method: 'POST', body: JSON.stringify({ poll: p.id, cand: sel }) });
      if (!r.ok) throw new Error(await r.text());
      setMsg({ ok: true, t: 'Voto registrado. Obrigado por participar!' }); await reload();
    } catch (e) { setMsg({ ok: false, t: e.message || 'Não foi possível registrar o voto.' }); await reload(); } finally { setBusy(false); }
  }
  const max = Math.max(1, ...p.candidates.map((c) => c.votes || 0));
  return (
    <section className="panel">
      <div className="ph"><h2>{p.title}</h2><span className={'st ' + (p.status === 'open' ? 'ao_vivo' : 'finalizada')}>{ST[p.status]}</span></div>
      {p.description && <p>{p.description}</p>}
      <p className="note">{p.opensAt && `Abertura: ${dt(p.opensAt)}. `}{p.closesAt && `Encerramento: ${dt(p.closesAt)}. `}{p.totalVotes} voto(s) até agora.</p>
      {p.voted && p.status === 'open' && <p className="okmsg">Você já votou nesta votação.</p>}
      <div className="vcands" role={canVote ? 'radiogroup' : undefined} aria-label="Candidatos">
        {p.candidates.map((c) => (
          <label key={c.id} className={'vc' + (sel === c.id ? ' on' : '')} style={{ '--c': c.teamColor || '#c8aa6e' }}>
            {canVote && <input type="radio" name={'p' + p.id} checked={sel === c.id} onChange={() => setSel(c.id)} />}
            {c.photo ? <img src={'/api/img/' + c.photo} alt="" loading="lazy" /> : <span className="noimg">{c.nick.slice(0, 1).toUpperCase()}</span>}
            <b>{c.nick}</b><small>{[c.teamName, c.lane].filter(Boolean).join(' · ')}</small>
            {c.stats ? <small className="mut">{c.stats.j} jogo(s) · {c.stats.k}/{c.stats.d}/{c.stats.a} · KDA {c.stats.kda}</small> : <small className="mut">Sem estatísticas registradas</small>}
            {p.resultPublished && <div className="bar"><i style={{ width: (c.votes / max) * 100 + '%' }} /><span>{c.votes} voto(s)</span></div>}
          </label>
        ))}
      </div>
      {canVote && <div className="row" style={{ marginTop: 14, alignItems: 'center' }}><button className="btn gold" disabled={!sel || busy} onClick={vote}>{busy ? 'Enviando…' : 'Confirmar voto'}</button></div>}
      {msg && <p className={msg.ok ? 'okmsg' : 'err'} role="status">{msg.t}</p>}
      {p.status === 'closed' && !p.resultPublished && <p className="note">Votação encerrada. O resultado será divulgado pela organização.</p>}
      {p.status === 'paused' && <p className="note">A votação está pausada pela organização.</p>}
      {p.status === 'scheduled' && <p className="note">A votação ainda não começou.</p>}
    </section>
  );
}

export default function Votacao() {
  const [d, setD] = useState(null), [err, setErr] = useState('');
  const reload = () => fetch('/api/votos', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error('Falha ao carregar (' + r.status + ')'); return r.json(); }).then(setD).catch((e) => setErr(e.message || 'Sem conexão.'));
  useEffect(() => { reload(); }, []);
  if (err && !d) return <section className="panel"><p className="err">{err}</p><button className="btn" onClick={() => { setErr(''); reload(); }}>Tentar novamente</button></section>;
  if (!d) return <section className="panel"><p className="mut"><span className="spin" aria-hidden /> Carregando…</p></section>;
  return (
    <>
      {d.polls.length ? d.polls.map((p) => <Poll key={p.id} p={p} reload={reload} />) : <section className="panel"><div className="ph"><h2>Votação de MVP</h2></div><p className="note">Nenhuma votação aberta no momento.</p></section>}
      <section className="panel"><div className="ph"><h2>MVP estatístico</h2></div>
        {d.mvpEstatistico.length ? <div className="tscroll"><table className="tbl"><thead><tr><th>#</th><th>Jogador</th><th>Equipe</th><th>Jogos</th><th>K/D/A</th><th>KDA</th></tr></thead><tbody>{d.mvpEstatistico.map((p, i) => <tr key={p.nick + p.teamName}><td className="pos">{i + 1}º</td><td>{p.nick}</td><td>{p.teamName}</td><td>{p.j}</td><td>{p.k}/{p.d}/{p.a}</td><td className="pts">{p.kda}</td></tr>)}</tbody></table></div> : <p className="note">Ainda não há jogos suficientes registrados.</p>}
        <p className="note">Calculado automaticamente pelo KDA, com no mínimo 2 jogos registrados. É independente da votação popular acima.</p>
      </section>
    </>
  );
}
