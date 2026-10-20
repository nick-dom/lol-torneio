'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { standings, bracket, teamMap, rounds, groups, win, played, KO, LBL } from '@/lib/logic';

const TABS = [['inicio', 'Início'], ['equipes', 'Equipes'], ['resultados', 'Resultados'], ['regras', 'Regras'], ['mata', 'Mata-mata']];
export const fmt = (t) => (t ? `${t.slice(8, 10)}/${t.slice(5, 7)} às ${t.slice(11, 16)}` : 'A definir');

export const Logo = ({ t, s = 34 }) =>
  t ? (t.logo ? <img className="logo" src={t.logo} alt="" style={{ width: s, height: s }} /> : <span className="logo tag" style={{ width: s, height: s, background: t.color, fontSize: s * 0.46 }}>{t.tag}</span>) : <span className="logo ghost" style={{ width: s, height: s }}>?</span>;

function Countdown({ to }) {
  const [n, setN] = useState(null);
  useEffect(() => { setN(Date.now()); const i = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(i); }, []);
  if (!n || !to) return null;
  const d = new Date(to).getTime() - n;
  if (d <= 0) return <div className="cd on"><i />Torneio em andamento</div>;
  const p = (v, l) => <div key={l}><b>{String(v).padStart(2, '0')}</b><small>{l}</small></div>;
  return <div className="cd">{[p(Math.floor(d / 864e5), 'dias'), p(Math.floor(d / 36e5) % 24, 'horas'), p(Math.floor(d / 6e4) % 60, 'min'), p(Math.floor(d / 1e3) % 60, 'seg')]}</div>;
}

function Hero({ c, go }) {
  const champs = (c.featured || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5);
  return (
    <header className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url("${encodeURI(c.bannerImage || '').replace(/"/g, '%22')}")` }} />
      <div className="hero-fade" />
      <div className="hero-in">
        <div className="hero-txt">
          <svg className="crest" viewBox="0 0 64 64"><path d="M32 3 58 18v28L32 61 6 46V18z" fill="none" stroke="#c8aa6e" strokeWidth="2.5" /><path d="M32 12 50 22v20L32 52 14 42V22z" fill="#c8aa6e22" stroke="#0ac8b9" strokeWidth="1.5" /><path d="M24 20h5v18h11v6H24z" fill="#f0e6d2" /></svg>
          <p className="kicker">Campeonato oficial de League of Legends</p>
          <h1>{c.name}</h1>
          <p className="sub">{c.subtitle}</p>
          <Countdown to={c.startDate} />
          <div className="cta"><button className="btn gold" onClick={() => go('mata')}>Ver chaveamento</button><button className="btn" onClick={() => go('regras')}>Ler regulamento</button></div>
        </div>
        <div className="strip" aria-hidden>
          {champs.map((n, i) => <div key={n} className="pane" style={{ '--i': i, backgroundImage: `url(https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${n}_0.jpg)` }} />)}
        </div>
      </div>
    </header>
  );
}

const Panel = ({ title, children, right, cls = '' }) => <section className={'panel ' + cls}><div className="ph"><h2>{title}</h2>{right}</div>{children}</section>;

function Standings({ d, st, done }) {
  const T = teamMap(d);
  return (
    <table className="tbl">
      <thead><tr><th>#</th><th>Time</th><th>J</th><th>V</th><th>D</th><th>Saldo</th><th>Pts</th></tr></thead>
      <tbody>{st.map((r, i) => <tr key={r.id} className={i < 4 ? 'q' : done ? 'out' : ''}>
        <td className="pos">{i + 1}º</td><td><span className="tm"><Logo t={T[r.id]} s={28} />{T[r.id]?.name}</span></td><td>{r.j}</td><td>{r.w}</td><td>{r.l}</td><td>{r.diff > 0 ? '+' : ''}{r.diff}</td><td className="pts">{r.p}</td></tr>)}</tbody>
    </table>
  );
}

function MatchRow({ m, T, name }) {
  const done = played(m), w = m.phase === 'k' ? win(m) : done ? (m.sa > m.sb ? m.a : m.sa < m.sb ? m.b : null) : null;
  const nm = (k, i) => T[m[k]]?.name || (LBL[m.id] ? LBL[m.id][i] : 'A definir');
  return (
    <div className="mrow">
      <div className="mt"><b>{name}</b>{fmt(m.time)}</div>
      <div className={'side' + (w && w === m.a ? ' w' : '')}><span>{nm('a', 0)}</span><Logo t={T[m.a]} s={30} /></div>
      <div className="score">{done ? <><b>{m.sa}</b><i>x</i><b>{m.sb}</b></> : <i>vs</i>}</div>
      <div className={'side r' + (w && w === m.b ? ' w' : '')}><Logo t={T[m.b]} s={30} /><span>{nm('b', 1)}</span></div>
    </div>
  );
}

function Bracket({ B, T }) {
  const card = (id) => {
    const m = B.M[id], w = win(m);
    return <div className={'bm ' + id}><h4>{KO[id]}<em>MD{m.bo}</em></h4>
      {['a', 'b'].map((k, i) => <div key={k} className={'bt' + (w && w === m[k] ? ' w' : '')}><Logo t={T[m[k]]} s={26} /><span>{T[m[k]]?.name || LBL[id][i]}</span><b>{m['s' + k] ?? '–'}</b></div>)}
      <small>{fmt(m.time)}</small></div>;
  };
  const ch = T[B.champion];
  return (
    <div className="bracket">
      <div className="bcol">{card('sf1')}{card('sf2')}</div>
      <div className="bcol mid">{card('final')}<div className="champ"><svg viewBox="0 0 24 24"><path d="M7 3h10v4a5 5 0 0 1-10 0zM5 4H2v2a4 4 0 0 0 4 4M19 4h3v2a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6v4H9z" fill="none" stroke="#c8aa6e" strokeWidth="1.5" /></svg><small>Campeão</small><b>{ch ? ch.name : 'A definir'}</b>{B.vice && <small>Vice: {T[B.vice]?.name}</small>}</div></div>
      <div className="bcol">{card('third')}{B.third && <div className="champ b3"><small>3º lugar</small><b>{T[B.third]?.name}</b></div>}</div>
    </div>
  );
}

function Embed({ url }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let m = (url || '').match(/(?:youtu\.be\/|v=|embed\/|live\/)([\w-]{11})/);
    if (m) return setSrc(`https://www.youtube.com/embed/${m[1]}`);
    m = (url || '').match(/twitch\.tv\/(\w+)/);
    setSrc(m ? `https://player.twitch.tv/?channel=${m[1]}&parent=${location.hostname}` : null);
  }, [url]);
  return src ? <iframe className="player" src={src} allowFullScreen title="Transmissão ao vivo" /> : <div className="player off"><span>Transmissão offline</span><small>O link da live aparece aqui quando a organização publicar.</small></div>;
}

export default function Site({ data: d }) {
  const router = useRouter();
  useEffect(() => { const i = setInterval(() => { if (!document.hidden) router.refresh(); }, 30000); return () => clearInterval(i); }, [router]);
  const [tab, setTab] = useState('inicio');
  const [rd, setRd] = useState(1);
  const go = (t) => { setTab(t); history.replaceState(null, '', '#' + t); scrollTo({ top: 0 }); };
  useEffect(() => { const h = location.hash.slice(1); if (TABS.some((t) => t[0] === h)) setTab(h); }, []);
  const T = teamMap(d), B = bracket(d), st = B.st, c = d.config;
  const all = [...groups(d).map((m) => ({ ...m, _n: `Rodada ${m.round}` })), ...['sf1', 'sf2', 'third', 'final'].map((id) => ({ ...B.M[id], _n: KO[id] }))];
  const next = all.filter((m) => !played(m)).sort((a, b) => (a.time || '9').localeCompare(b.time || '9')).slice(0, 4);
  const rs = rounds(d);
  const rules = (c.rules || '').split(/^## /m).filter(Boolean).map((s) => { const [t, ...b] = s.split('\n'); return [t.trim(), b.filter((x) => x.trim())]; });
  const [open, setOpen] = useState(0);

  return (
    <>
      {c.alert && <div className="alert"><i />{c.alert}</div>}
      <Hero c={c} go={go} />
      <nav className="nav"><div className="nav-in">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}
        <a className="admlink" href="/admin">Painel ADM</a>
      </div></nav>
      <main className="wrap">
        {tab === 'inicio' && <>
          <div className="g2">
            <Panel title="Fase 1 — Classificação"><Standings d={d} st={st} done={B.done} /><p className="note">Os 4 primeiros avançam ao mata-mata. O 5º colocado é eliminado.</p></Panel>
            <Panel title="Transmissão ao vivo"><Embed url={c.stream} /></Panel>
          </div>
          <div className="g2">
            <Panel title="Próximos confrontos">{next.length ? next.map((m) => <MatchRow key={m.id} m={m} T={T} name={m._n} />) : <p className="note">Nenhum confronto pendente.</p>}</Panel>
            <Panel title="Notícias e avisos">{(c.news || []).map((n, i) => <p className="news" key={i}>{n}</p>)}</Panel>
          </div>
          <Panel title="Fase 2 — Mata-mata"><Bracket B={B} T={T} /></Panel>
        </>}
        {tab === 'equipes' && <div className="teams">{d.teams.map((t) => {
          const r = st.findIndex((x) => x.id === t.id), s = st[r];
          return <article key={t.id} className="team" style={{ '--c': t.color }}>
            <div className="th"><Logo t={t} s={64} /><div><h3>{t.name}</h3><small>Capitão: {t.captain || 'a definir'}</small></div></div>
            <div className="ts"><div><b>{r + 1}º</b><small>posição</small></div><div><b>{s.w}</b><small>vitórias</small></div><div><b>{s.l}</b><small>derrotas</small></div><div><b>{s.p}</b><small>pontos</small></div></div>
            <ul>{(t.players || []).length ? t.players.map((p) => <li key={p}>{p}</li>) : <li className="mut">Titulares a divulgar</li>}</ul>
          </article>;
        })}</div>}
        {tab === 'resultados' && <Panel title="Resultados e tabela">
          <div className="chips">{rs.map((r) => <button key={r} className={rd === r ? 'on' : ''} onClick={() => setRd(r)}>Rodada {r}</button>)}</div>
          {groups(d).filter((m) => m.round === rd).map((m) => <MatchRow key={m.id} m={m} T={T} name={`Rodada ${m.round}`} />)}
          {(() => { const rest = d.teams.find((t) => !groups(d).some((m) => m.round === rd && (m.a === t.id || m.b === t.id))); return rest && d.teams.length % 2 ? <p className="note">Folga na rodada {rd}: {rest.name}</p> : null; })()}
          <h3 className="sh">Mata-mata</h3>{['sf1', 'sf2', 'third', 'final'].map((id) => <MatchRow key={id} m={B.M[id]} T={T} name={KO[id]} />)}
          <h3 className="sh">Classificação geral</h3><Standings d={d} st={st} done={B.done} />
        </Panel>}
        {tab === 'regras' && <Panel title="Regulamento oficial">
          <div className="acc">{rules.map(([t, b], i) => <div key={t} className={open === i ? 'it on' : 'it'}>
            <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{t}<span>{open === i ? '−' : '+'}</span></button>
            {open === i && <div className="bd">{b.map((l, j) => l.startsWith('- ') ? <li key={j}>{l.slice(2)}</li> : <p key={j}>{l}</p>)}</div>}
          </div>)}</div>
          <p className="note">Dúvidas ou contestações: o capitão da equipe deve procurar a organização, com evidências, logo após o fato (Art. 10º).</p>
        </Panel>}
        {tab === 'mata' && <><Panel title="Fase 2 — Mata-mata"><Bracket B={B} T={T} /><p className="note">Semifinais: 1º x 4º e 2º x 3º, em MD3. Final em {B.M.final.bo === 5 ? 'MD5' : 'MD3'}; 3º lugar em MD1.</p></Panel>
          <Panel title="Partidas do mata-mata">{['sf1', 'sf2', 'third', 'final'].map((id) => <MatchRow key={id} m={B.M[id]} T={T} name={KO[id]} />)}</Panel></>}
      </main>
      <footer className="foot">Boa sorte a todos! · Projeto de fãs, não afiliado à Riot Games. League of Legends e as artes dos campeões são marcas e propriedade da Riot Games, Inc.</footer>
    </>
  );
}
