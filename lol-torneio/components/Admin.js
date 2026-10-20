'use client';
import { useEffect, useState } from 'react';
import { SEED } from '@/lib/seed';
import { standings, bracket, KO } from '@/lib/logic';

const num = (v) => (v === '' ? null : Math.max(0, Number(v)));
function img(file, cb) {
  if (!file) return;
  if (file.size > 150000) return alert('Imagem acima de 150 KB. Use um arquivo menor ou cole uma URL.');
  const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(file);
}

// Fora do componente: definir dentro fazia os campos perderem o foco a cada tecla
const F = ({ l, children }) => <label className="f"><span>{l}</span>{children}</label>;

export default function Admin() {
  const [auth, setAuth] = useState(null);
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('torneio');
  const [msg, setMsg] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => { const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h); }, [dirty]);
  const load = async () => setD(await (await fetch('/api/data', { cache: 'no-store' })).json());
  useEffect(() => { fetch('/api/login').then((r) => r.json()).then((j) => { setAuth(j.auth); if (j.auth) load(); }); }, []);
  const set = (fn) => { const n = structuredClone(d); fn(n); setD(n); setMsg(''); setDirty(true); };
  async function login(e) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ password: pw }) });
    if (r.ok) { setAuth(true); load(); } else setErr(await r.text());
  }
  async function save(data = d) {
    setMsg('Salvando…');
    const r = await fetch('/api/data', { method: 'PUT', body: JSON.stringify(data) });
    setMsg(r.ok ? 'Alterações publicadas no site.' : 'Erro: ' + (await r.text()));
    if (r.ok) setDirty(false);
    if (r.status === 401) setAuth(false);
  }
  const out = async () => { await fetch('/api/login', { method: 'DELETE' }); setAuth(false); };

  if (auth === null) return <div className="adm-login"><p>Carregando…</p></div>;
  if (!auth) return (
    <div className="adm-login"><form onSubmit={login} className="panel">
      <h2>Painel administrativo</h2><p className="note">Acesso restrito à organização do torneio.</p>
      <input type="password" placeholder="Senha de administrador" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      {err && <p className="err">{err}</p>}<button className="btn gold">Entrar</button><a href="/" className="back">Voltar ao site</a>
    </form></div>
  );
  if (!d) return <div className="adm-login"><p>Carregando…</p></div>;

  const c = d.config, B = bracket(d), st = standings(d);
  const done = d.matches.filter((m) => m.phase === 'g' && m.sa != null && m.sb != null).length;
  const TABS = [['torneio', 'Torneio'], ['equipes', 'Equipes'], ['partidas', 'Partidas'], ['regras', 'Regulamento']];
  const G = d.matches.filter((m) => m.phase === 'g');
  const warns = [
    ...G.filter((m) => m.sa != null && m.sa === m.sb).map((m) => `Rodada ${m.round}: empate ${m.sa} x ${m.sb} não vale na MD1 (a partida é ignorada na tabela).`),
    ...G.filter((m) => !m.a || !m.b || m.a === m.b).map((m) => `Rodada ${m.round}: confronto com equipe faltando ou repetida.`),
    ...(B.done ? st.filter((r, i) => i < st.length - 1 && [r.p, r.w, r.h2h, r.diff].join() === [st[i + 1].p, st[i + 1].w, st[i + 1].h2h, st[i + 1].diff].join()).map((r) => `Empate total entre ${d.teams.find((t) => t.id === r.id)?.name} e o próximo: realize a partida extra e ajuste a “prioridade” nas Equipes.`) : []),
  ];
  const tOpts = <>{<option value="">—</option>}{d.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</>;

  return (
    <div className="adm">
      <header className="adm-h"><div><h1>Painel administrativo</h1><small>{c.name}</small></div>
        <div className="row"><a className="btn" href="/" target="_blank">Ver site</a><button className="btn" onClick={out}>Sair</button></div></header>
      <div className="stats">
        <div><b>{d.teams.length}</b><small>equipes</small></div><div><b>{done}/10</b><small>partidas da fase 1</small></div>
        <div><b>{B.done ? 'Concluída' : 'Em andamento'}</b><small>classificatória</small></div><div><b>{B.champion ? B.M && d.teams.find((t) => t.id === B.champion)?.name : '—'}</b><small>campeão</small></div>
      </div>
      {!d._persistent && <p className="warn">Banco de dados não conectado: as alterações ficam só em memória e podem ser perdidas. Conecte um Upstash Redis na Vercel (veja o README).</p>}
      <div className="atabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'torneio' && <div className="panel grid">
        <F l="Nome do torneio"><input value={c.name} onChange={(e) => set((n) => (n.config.name = e.target.value))} /></F>
        <F l="Subtítulo"><input value={c.subtitle} onChange={(e) => set((n) => (n.config.subtitle = e.target.value))} /></F>
        <F l="Imagem do banner (URL)"><input value={c.bannerImage} onChange={(e) => set((n) => (n.config.bannerImage = e.target.value))} /></F>
        <F l="Campeões em destaque (nomes do Data Dragon, separados por vírgula)"><input value={c.featured} onChange={(e) => set((n) => (n.config.featured = e.target.value))} /></F>
        <F l="Início do torneio"><input type="datetime-local" value={c.startDate} onChange={(e) => set((n) => (n.config.startDate = e.target.value))} /></F>
        <F l="Link da transmissão (YouTube ou Twitch)"><input value={c.stream} onChange={(e) => set((n) => (n.config.stream = e.target.value))} placeholder="https://twitch.tv/canal" /></F>
        <F l="Texto do banner de alerta (vazio oculta)"><input value={c.alert} onChange={(e) => set((n) => (n.config.alert = e.target.value))} /></F>
        <F l="Formato da final"><select value={c.finalFormat} onChange={(e) => set((n) => (n.config.finalFormat = e.target.value))}><option>MD3</option><option>MD5</option></select></F>
        <F l="Notícias e avisos (uma por linha)"><textarea rows={5} value={(c.news || []).join('\n')} onChange={(e) => set((n) => (n.config.news = e.target.value.split('\n').filter(Boolean)))} /></F>
      </div>}

      {tab === 'equipes' && <div>
        {d.teams.map((t, i) => <div key={t.id} className="panel grid tcard" style={{ borderLeft: `4px solid ${t.color}` }}>
          <F l="Nome"><input value={t.name} onChange={(e) => set((n) => (n.teams[i].name = e.target.value))} /></F>
          <F l="Sigla"><input maxLength={3} value={t.tag} onChange={(e) => set((n) => (n.teams[i].tag = e.target.value))} /></F>
          <F l="Cor"><input type="color" value={t.color} onChange={(e) => set((n) => (n.teams[i].color = e.target.value))} /></F>
          <F l="Capitão (contato)"><input value={t.captain} onChange={(e) => set((n) => (n.teams[i].captain = e.target.value))} /></F>
          <F l="Titulares (IDs, separados por vírgula)"><input value={(t.players || []).join(', ')} onChange={(e) => set((n) => (n.teams[i].players = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} /></F>
          <F l="Logo (URL ou envio até 150 KB)"><input value={t.logo.startsWith('data:') ? '(imagem enviada)' : t.logo} onChange={(e) => set((n) => (n.teams[i].logo = e.target.value))} /><input type="file" accept="image/*" onChange={(e) => img(e.target.files[0], (u) => set((n) => (n.teams[i].logo = u)))} /></F>
          <F l="Prioridade na partida extra (1 = melhor)"><input type="number" min="1" value={t.tb ?? ''} onChange={(e) => set((n) => (n.teams[i].tb = num(e.target.value)))} /></F>
          <button className="btn danger" onClick={() => confirm('Remover esta equipe?') && set((n) => { n.teams.splice(i, 1); n.matches.forEach((m) => { if (m.a === t.id) m.a = ''; if (m.b === t.id) m.b = ''; }); })}>Remover</button>
        </div>)}
        <button className="btn" onClick={() => set((n) => n.teams.push({ id: 't' + Date.now(), name: 'Nova equipe', tag: 'N', color: '#8a9bb4', logo: '', captain: '', players: [], tb: n.teams.length + 1 }))}>Adicionar equipe</button>
      </div>}

      {tab === 'partidas' && <div className="panel">
        {warns.map((w, i) => <p key={i} className="warn">{w}</p>)}
        <p className="note">Fase 1 em MD1: lance 1 x 0 para o vencedor. W.O. na classificatória vale derrota (0 ponto) — lance 1 x 0 para a equipe presente (Art. 8º). No mata-mata, os times são definidos automaticamente pela classificação e pelos resultados.</p>
        {d.matches.map((m, i) => {
          const k = m.phase === 'k', bm = B.M[m.id];
          return <div className="mrow-a" key={m.id}>
            <b>{k ? KO[m.id] : `Rodada ${m.round}`}</b>
            {k ? <><span>{d.teams.find((t) => t.id === bm.a)?.name || '—'}</span><span>x</span><span>{d.teams.find((t) => t.id === bm.b)?.name || '—'}</span></>
              : <><select value={m.a} onChange={(e) => set((n) => (n.matches[i].a = e.target.value))}>{tOpts}</select><span>x</span><select value={m.b} onChange={(e) => set((n) => (n.matches[i].b = e.target.value))}>{tOpts}</select></>}
            <input className="sc" type="number" min="0" value={m.sa ?? ''} onChange={(e) => set((n) => (n.matches[i].sa = num(e.target.value)))} />
            <input className="sc" type="number" min="0" value={m.sb ?? ''} onChange={(e) => set((n) => (n.matches[i].sb = num(e.target.value)))} />
            <input type="datetime-local" value={m.time} onChange={(e) => set((n) => (n.matches[i].time = e.target.value))} />
            <button className="btn sm" onClick={() => set((n) => { n.matches[i].sa = null; n.matches[i].sb = null; })}>Limpar</button>
          </div>;
        })}
        <h3 className="sh">Classificação atual</h3>
        <p className="note">{st.map((r, i) => `${i + 1}º ${d.teams.find((t) => t.id === r.id)?.name} (${r.p} pts)`).join(' · ')}</p>
      </div>}

      {tab === 'regras' && <div className="panel"><F l="Texto do regulamento (cada artigo começa com “## Título”; itens com “- ”)"><textarea rows={26} value={c.rules} onChange={(e) => set((n) => (n.config.rules = e.target.value))} /></F></div>}

      <div className="savebar"><span>{msg}</span>
        <button className="btn" onClick={() => confirm('Restaurar todos os dados padrão? Isso apaga resultados e equipes.') && (setD(structuredClone(SEED)), save(structuredClone(SEED)))}>Restaurar padrão</button>
        <button className="btn gold" onClick={() => save()}>Salvar e publicar</button></div>
    </div>
  );
}
