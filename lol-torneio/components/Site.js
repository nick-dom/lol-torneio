'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LivePlayer from '@/components/LivePlayer';
import { Logo } from '@/components/Logo';
import { opggUrl, slug } from '@/lib/players';
import { standings, bracket, teamMap, rounds, groups, win, played, KO, LBL } from '@/lib/logic';

const TABS = [['inicio', 'Início'], ['live', 'Ao vivo'], ['resultados', 'Partidas'], ['classificacao', 'Classificação'], ['mata', 'Playoffs'], ['equipes', 'Equipes'], ['jogadores', 'Jogadores'], ['regras', 'Regulamento']];
// Navegação inferior (celular): as 4 principais + menu Mais
const BOTTOM = [['inicio', 'Início', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'], ['resultados', 'Partidas', 'M4 5h16v14H4zM4 10h16M9 5v14'], ['classificacao', 'Tabela', 'M4 6h16M4 12h16M4 18h16'], ['/estatisticas', 'Estatísticas', 'M5 21V10M12 21V4M19 21v-7']];
export const fmt = (t) => (t ? `${t.slice(8, 10)}/${t.slice(5, 7)} às ${t.slice(11, 16)}` : 'A definir');

// Gera um arquivo .ics (abre no Google Agenda, Apple Calendário, Outlook…). Horário "flutuante" = o mesmo horário local do torneio.
const p2 = (n) => String(n).padStart(2, '0');
const icsStamp = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
function addToCalendar(title, time, mins = 120) {
  const s = new Date(time + ':00'); if (isNaN(s)) return;
  const e = new Date(s.getTime() + mins * 6e4);
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Copa Nexus//PT', 'BEGIN:VEVENT', `UID:${Date.now()}${Math.random().toString(36).slice(2)}@copa-nexus`, `DTSTAMP:${icsStamp(new Date())}`, `DTSTART:${icsStamp(s)}`, `DTEND:${icsStamp(e)}`, `SUMMARY:${title.replace(/[,;\\]/g, ' ')}`, 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Começa em 15 minutos', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' })); a.download = 'partida.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function Share() {
  const [ok, setOk] = useState(false);
  const go = async () => {
    const data = { title: document.title, url: location.origin + '/' };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); setOk(true); setTimeout(() => setOk(false), 2200); } } catch {}
  };
  return <button className="btn" onClick={go} aria-live="polite">{ok ? 'Link copiado ✓' : 'Compartilhar'}</button>;
}

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
          <div className="cta"><button className="btn gold" onClick={() => go('mata')}>Ver chaveamento</button><button className="btn" onClick={() => go('regras')}>Ler regulamento</button><Share /></div>
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
    <div className="tscroll"><table className="tbl">
      <thead><tr><th>#</th><th>Time</th><th>J</th><th>V</th><th>D</th><th>Saldo</th><th>Aprov.</th><th>Pts</th></tr></thead>
      <tbody>{st.map((r, i) => <tr key={r.id} className={i < 4 ? 'q' : done ? 'out' : ''}>
        <td className="pos">{i + 1}º</td><td><a className="tm tlink" href={'/equipe/' + slug(r.id)}><Logo t={T[r.id]} s={28} />{T[r.id]?.name}</a></td><td>{r.j}</td><td>{r.w}</td><td>{r.l}</td><td>{r.diff > 0 ? '+' : ''}{r.diff}</td><td>{r.j ? Math.round((r.w / r.j) * 100) + '%' : '–'}</td><td className="pts">{r.p}</td></tr>)}</tbody>
    </table></div>
  );
}

function MatchRow({ m, T, name }) {
  const done = played(m), w = m.phase === 'k' ? win(m) : done ? (m.sa > m.sb ? m.a : m.sa < m.sb ? m.b : null) : null;
  const nm = (k, i) => T[m[k]]?.name || (LBL[m.id] ? LBL[m.id][i] : 'A definir');
  return (
    <div className="mrow">
      <div className="mt"><b>{name}</b>{fmt(m.time)}{T[m.a] && T[m.b] && <a className="mlink" href={'/partida/' + m.id}>Detalhes</a>}{!done && m.time && T[m.a] && T[m.b] && <button className="cal" onClick={() => addToCalendar(`${T[m.a].name} x ${T[m.b].name} — ${name}`, m.time)}>+ Agenda</button>}</div>
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

export default function Site({ data: d }) {
  const router = useRouter();
  useEffect(() => { const i = setInterval(() => { if (!document.hidden) router.refresh(); }, 30000); return () => clearInterval(i); }, [router]);
  const [tab, setTab] = useState('inicio');
  const [rd, setRd] = useState(1);
  const [tf, setTf] = useState('');
  const go = (t) => { setTab(t); setMore(false); history.replaceState(null, '', '#' + t); scrollTo({ top: 0 }); };
  useEffect(() => { const h = location.hash.slice(1); if (TABS.some((t) => t[0] === h)) setTab(h); }, []);
  const T = teamMap(d), B = bracket(d), st = B.st, c = d.config;
  const all = [...groups(d).map((m) => ({ ...m, _n: `Rodada ${m.round}` })), ...['sf1', 'sf2', 'third', 'final'].map((id) => ({ ...B.M[id], _n: KO[id] }))];
  const next = all.filter((m) => !played(m)).sort((a, b) => (a.time || '9').localeCompare(b.time || '9')).slice(0, 4);
  const rs = rounds(d);
  const rules = (c.rules || '').split(/^## /m).filter(Boolean).map((s) => { const [t, ...b] = s.split('\n'); return [t.trim(), b.filter((x) => x.trim())]; });
  const [open, setOpen] = useState(0);
  const [more, setMore] = useState(false);
  const [theme, setTheme] = useState('dark');
  useEffect(() => { try { setTheme(localStorage.getItem('theme') === 'light' ? 'light' : 'dark'); } catch {} }, []);
  const flip = () => { const n = theme === 'light' ? 'dark' : 'light'; setTheme(n); document.documentElement.dataset.theme = n; try { localStorage.setItem('theme', n); } catch {} };

  return (
    <>
      {c.alert && <div className="alert"><i />{c.alert}</div>}
      <Hero c={c} go={go} />
      <nav className="nav snav" aria-label="Seções"><div className="nav-in" role="tablist">
        {TABS.filter(([k]) => k !== 'live' || c.stream).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>{k === 'live' && <i className="ldot" aria-hidden />}{l}</button>)}
        <a className="tablink" href="/estatisticas">Estatísticas</a><a className="tablink" href="/draft">Draft</a><a className="tablink" href="/simulador">Simulador</a><button className="themebtn" onClick={flip} aria-label="Alternar tema claro/escuro">{theme === 'light' ? 'Tema escuro' : 'Tema claro'}</button><a className="admlink" href="/midia">Mídia</a><a className="admlink" href="/admin" style={{ marginLeft: 8 }}>Painel ADM</a>
      </div></nav>
      <main id="main" className="wrap">
        {tab === 'inicio' && <>
          <div className="g2">
            <Panel title="Fase 1 — Classificação"><Standings d={d} st={st} done={B.done} /><p className="note">Os 4 primeiros avançam ao mata-mata. O 5º colocado é eliminado.</p></Panel>
            <Panel title="Transmissão ao vivo"><LivePlayer url={c.stream} /></Panel>
          </div>
          <div className="g2">
            <Panel title="Próximos confrontos">{next.length ? next.map((m) => <MatchRow key={m.id} m={m} T={T} name={m._n} />) : <p className="note">Nenhum confronto pendente.</p>}</Panel>
            <Panel title="Notícias e avisos">{(c.news || []).map((n, i) => <p className="news" key={i}>{n}</p>)}</Panel>
          </div>
          <Panel title="Fase 2 — Mata-mata"><Bracket B={B} T={T} /></Panel>
        </>}
        {tab === 'live' && <>
          <Panel title="Transmissão ao vivo"><LivePlayer url={c.stream} /></Panel>
          <Panel title="Próximos confrontos">{next.length ? next.map((m) => <MatchRow key={m.id} m={m} T={T} name={m._n} />) : <p className="note">Nenhum confronto pendente.</p>}</Panel>
        </>}
        {tab === 'equipes' && <div className="teams">{d.teams.map((t) => {
          const r = st.findIndex((x) => x.id === t.id), s = st[r];
          return <article key={t.id} className="team" style={{ '--c': t.color }}>
            <div className="th"><Logo t={t} s={64} /><div><h3><a className="tlink" href={'/equipe/' + slug(t.id)}>{t.name}</a></h3><small>Capitão: {t.captain || 'a definir'}</small></div></div>
            <div className="ts"><div><b>{r + 1}º</b><small>posição</small></div><div><b>{s.w}</b><small>vitórias</small></div><div><b>{s.l}</b><small>derrotas</small></div><div><b>{s.p}</b><small>pontos</small></div></div>
            <ul>{(t.players || []).length ? t.players.map((p) => <li key={p}><a className="tlink" href={`/jogador/${slug(t.id)}/${slug(p)}`}>{p}</a></li>) : <li className="mut">Titulares a divulgar</li>}{(t.reserves || []).map((p) => <li key={p} className="mut"><a className="tlink" href={`/jogador/${slug(t.id)}/${slug(p)}`}>{p}</a> <small>reserva</small></li>)}</ul>
          </article>;
        })}</div>}
        {tab === 'resultados' && <Panel title="Resultados e tabela">
          <div className="chips">
            <select className="tsel" aria-label="Filtrar por equipe" value={tf} onChange={(e) => setTf(e.target.value)}><option value="">Todas as equipes</option>{d.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            {!tf && rs.map((r) => <button key={r} className={rd === r ? 'on' : ''} onClick={() => setRd(r)}>Rodada {r}</button>)}
          </div>
          {tf && (() => { const mine = all.filter((m) => m.a === tf || m.b === tf).sort((a, b) => (a.time || '9').localeCompare(b.time || '9')); return mine.length ? mine.map((m) => <MatchRow key={m.id} m={m} T={T} name={m._n} />) : <p className="note">Nenhuma partida para esta equipe.</p>; })()}
          {!tf && groups(d).filter((m) => m.round === rd).map((m) => <MatchRow key={m.id} m={m} T={T} name={`Rodada ${m.round}`} />)}
          {!tf && (() => { const rest = d.teams.find((t) => !groups(d).some((m) => m.round === rd && (m.a === t.id || m.b === t.id))); return rest && d.teams.length % 2 ? <p className="note">Folga na rodada {rd}: {rest.name}</p> : null; })()}
          <h3 className="sh">Mata-mata</h3>{['sf1', 'sf2', 'third', 'final'].map((id) => <MatchRow key={id} m={B.M[id]} T={T} name={KO[id]} />)}
          <h3 className="sh">Classificação geral</h3><Standings d={d} st={st} done={B.done} />
        </Panel>}
        {tab === 'classificacao' && <>
          <Panel title="Classificação geral"><Standings d={d} st={st} done={B.done} />
            <p className="note"><i className="lg q" /> Classificados ao mata-mata (4 primeiros) · <i className="lg out" /> Eliminado (após o fim da fase). Aproveitamento = vitórias ÷ jogos.</p></Panel>
          <Panel title="Critérios de desempate"><ol className="crit"><li>Pontos (vitória = 3).</li><li>Maior número de vitórias.</li><li>Confronto direto entre as equipes empatadas.</li><li>Saldo de vitórias e derrotas em jogos.</li><li>Partida de desempate, conforme decisão divulgada.</li></ol></Panel>
          <Panel title="Histórico de resultados">{groups(d).filter(played).length ? groups(d).filter(played).sort((a, b) => a.round - b.round).map((m) => <MatchRow key={m.id} m={m} T={T} name={`Rodada ${m.round}`} />) : <p className="note">Nenhuma partida da fase classificatória foi disputada ainda.</p>}</Panel>
        </>}
        {tab === 'jogadores' && (d.teams.some((t) => (t.players || []).length || (t.reserves || []).length) ? d.teams.map((t) => <Panel key={t.id} title={t.name} cls="pteam">
          <div className="plist">{[...(t.players || []).map((n) => [n, false]), ...(t.reserves || []).map((n) => [n, true])].map(([n, res]) => {
            const pr = (t.profiles || {})[n] || {}, ph = (d.media?.players || {})[`${t.id}::${n}`];
            return <a key={n} className="pcard" href={`/jogador/${slug(t.id)}/${slug(n)}`} style={{ '--c': t.color }}>
              {ph ? <img src={`/api/img/${ph}`} alt="" loading="lazy" /> : <span className="noimg" style={{ background: t.color }}>{n.slice(0, 1).toUpperCase()}</span>}
              <b>{n}</b><small>{[pr.lane, pr.elo].filter(Boolean).join(' · ') || (res ? 'Reserva' : 'Titular')}</small></a>;
          })}</div></Panel>) : <Panel title="Jogadores"><p className="note">Os jogadores serão divulgados em breve.</p></Panel>)}
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
      <nav className="bnav" aria-label="Navegação principal">
        {BOTTOM.map(([k, l, ic]) => k[0] === '/' ? <a key={k} href={k}><svg viewBox="0 0 24 24" aria-hidden><path d={ic} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>{l}</a> : <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}><svg viewBox="0 0 24 24" aria-hidden><path d={ic} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>{l}</button>)}
        <button className={more || ['mata', 'equipes', 'jogadores', 'regras', 'live'].includes(tab) ? 'on' : ''} onClick={() => setMore(!more)} aria-expanded={more}><svg viewBox="0 0 24 24" aria-hidden><path d="M5 12h.01M12 12h.01M19 12h.01" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" /></svg>Mais</button>
      </nav>
      {more && <div className="sheet" onClick={() => setMore(false)}><div className="sheet-in" onClick={(e) => e.stopPropagation()} role="menu">
        {[['mata', 'Playoffs'], ['equipes', 'Equipes'], ['jogadores', 'Jogadores'], ['regras', 'Regulamento'], ...(c.stream ? [['live', 'Ao vivo']] : [])].map(([k, l]) => <button key={k} role="menuitem" onClick={() => go(k)}>{l}</button>)}
        <a href="/draft">Draft</a><a href="/simulador">Simulador</a><a href="/midia">Mídia</a><button onClick={flip}>{theme === 'light' ? 'Tema escuro' : 'Tema claro'}</button><a href="/admin">Painel ADM</a>
      </div></div>}
      <footer className="foot">Boa sorte a todos! · Projeto de fãs, não afiliado à Riot Games. League of Legends e as artes dos campeões são marcas e propriedade da Riot Games, Inc.</footer>
    </>
  );
}
