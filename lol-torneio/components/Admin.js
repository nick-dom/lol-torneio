'use client';
import { useEffect, useRef, useState } from 'react';
import LivePlayer from '@/components/LivePlayer';
import { SEED } from '@/lib/seed';
import { standings, bracket, KO } from '@/lib/logic';
import { ytId, pk, MAX_IMG } from '@/lib/media';
import { ROLES, can } from '@/lib/perm';
import { LANES, ELOS } from '@/lib/players';
import { OBJ, MAX_GAMES, blankGame, blankPlayer } from '@/lib/games';

const num = (v) => (v === '' ? null : Math.max(0, Number(v)));
function img(file, cb) {
  if (!file) return;
  if (file.size > 150000) return alert('Imagem acima de 150 KB. Use um arquivo menor ou cole uma URL.');
  const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(file);
}

// Reduz automaticamente fotos grandes para caber em 400 KB (GIFs não são recomprimidos)
async function prep(file, maxDim) {
  if (!/^image\//.test(file.type)) throw new Error('Escolha um arquivo de imagem (JPG, PNG, WEBP ou GIF).');
  if (file.size <= MAX_IMG && /^image\/(jpeg|png|webp|gif)$/.test(file.type)) return file;
  if (file.type === 'image/gif') throw new Error('GIF acima de 400 KB. Reduza o GIF ou envie como JPG/PNG.');
  let bmp; try { bmp = await createImageBitmap(file); } catch { throw new Error('Não consegui ler esta imagem. Use JPG, PNG ou WEBP.'); }
  let scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  for (let i = 0; i < 8; i++) {
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * scale)); cv.height = Math.max(1, Math.round(bmp.height * scale));
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(bmp, 0, 0, cv.width, cv.height);
    for (const q of [0.88, 0.78, 0.68, 0.58, 0.48]) { const b = await new Promise((r) => cv.toBlob(r, 'image/jpeg', q)); if (b && b.size <= MAX_IMG - 2048) return b; }
    scale *= 0.8;
  }
  throw new Error('Não foi possível reduzir a imagem para 400 KB.');
}
// Prévia da live no painel (espera o usuário parar de digitar para não recarregar o player a cada tecla)
function StreamPreview({ url }) {
  const [u, setU] = useState('');
  useEffect(() => { const t = setTimeout(() => setU(url || ''), 700); return () => clearTimeout(t); }, [url]);
  if (!u.trim()) return null;
  return <div className="live-prev"><p className="note" style={{ marginTop: 0 }}>Prévia — é assim que o público verá:</p><LivePlayer url={u} /></div>;
}
const today = () => new Date().toISOString().slice(0, 10);

// Fora do componente: definir dentro fazia os campos perderem o foco a cada tecla
const F = ({ l, children }) => <label className="f"><span>{l}</span>{children}</label>;

// Registro de estatísticas por jogo (fora do Admin para os campos não perderem o foco)
function Stats({ d, set, B, canScore, riot, say }) {
  const [mid, setMid] = useState('');
  const [rid, setRid] = useState({});
  const nm = (id) => d.teams.find((t) => t.id === id)?.name || '—';
  const lbl = (m) => (m.phase === 'k' ? KO[m.id] : `Rodada ${m.round}`);
  const ms = [...d.matches.filter((m) => m.phase === 'g'), ...['sf1', 'sf2', 'third', 'final'].map((k) => B.M[k])].filter((m) => m.a && m.b);
  const m = ms.find((x) => x.id === mid), games = (d.games || {})[mid] || [];
  const roster = (id) => { const t = d.teams.find((x) => x.id === id); return [...(t?.players || []), ...(t?.reserves || [])]; };
  const upd = (fn) => set((n) => { n.games ||= {}; n.games[mid] ||= []; fn(n.games[mid]); if (!n.games[mid].length) delete n.games[mid]; });
  const N = (v) => (v === '' ? 0 : Math.max(0, Number(v) || 0));
  const SEL = (g, gi, k, label) => <F l={label}><select value={g.first?.[k] || ''} onChange={(e) => upd((a) => { a[gi].first ||= {}; a[gi].first[k] = e.target.value; })}><option value="">—</option><option value="a">{nm(m.a)}</option><option value="b">{nm(m.b)}</option></select></F>;
  return <div>
    <div className="panel" style={{ marginBottom: 14 }}>
      <F l="Partida"><select value={mid} onChange={(e) => setMid(e.target.value)}><option value="">Escolha uma partida…</option>{ms.map((x) => <option key={x.id} value={x.id}>{lbl(x)} — {nm(x.a)} x {nm(x.b)}{(d.games || {})[x.id] ? ` (${d.games[x.id].length} jogo(s))` : ''}</option>)}</select></F>
      <p className="note">Só aparecem partidas com as duas equipes definidas. Cada jogo da série tem o seu registro. O MVP é calculado pelo melhor (abates + assistências) ÷ mortes do time vencedor, se você não escolher um.</p>
    </div>
    {m && <>
      {games.map((g, gi) => <div className="panel" key={gi} style={{ marginBottom: 14 }}>
        <div className="ph"><h3 className="sh" style={{ margin: 0 }}>Jogo {gi + 1}</h3><button className="btn danger sm" onClick={() => confirm('Remover o jogo ' + (gi + 1) + '?') && upd((a) => a.splice(gi, 1))}>Remover jogo</button></div>
        {riot && <div className="rioline" style={{ marginBottom: 10 }}>
          <input style={{ maxWidth: 260 }} placeholder="ID da partida Riot (BR1_1234567890)" value={rid[gi] || ''} onChange={(e) => setRid({ ...rid, [gi]: e.target.value })} />
          <button type="button" className="btn sm" onClick={async () => {
            say('Importando da Riot…');
            const r = await fetch('/api/riot/match', { method: 'POST', body: JSON.stringify({ id: rid[gi], a: m.a, b: m.b }) });
            if (!r.ok) return say('Riot: ' + (await r.text()));
            const j = await r.json(); upd((a) => { a[gi] = j.game; });
            say(`Jogo ${gi + 1} importado (${j.matchId}). Revise antes de salvar.` + (j.warnings.length ? ' Avisos: ' + j.warnings.join(' | ') : ' Nenhum aviso.'));
          }}>Importar da Riot</button><small className="mut">Substitui os dados deste jogo. A ordem dos picks não vem da Riot.</small>
        </div>}
        <div className="grid">
          <F l="Vencedor"><select value={g.winner || ''} onChange={(e) => upd((a) => (a[gi].winner = e.target.value))}><option value="">—</option><option value="a">{nm(m.a)}</option><option value="b">{nm(m.b)}</option></select></F>
          <F l="Duração (mm:ss)"><input placeholder="32:15" value={g.dur || ''} onChange={(e) => upd((a) => (a[gi].dur = e.target.value))} /></F>
          {SEL(g, gi, 'blood', 'Primeiro abate')}{SEL(g, gi, 'tower', 'Primeira torre')}{SEL(g, gi, 'dragon', 'Primeiro dragão')}
          <F l="MVP (vazio = automático)"><input list={'mv' + gi} value={g.mvp || ''} onChange={(e) => upd((a) => (a[gi].mvp = e.target.value))} /><datalist id={'mv' + gi}>{[...roster(m.a), ...roster(m.b)].map((n) => <option key={n} value={n} />)}</datalist></F>
        </div>
        {['a', 'b'].map((sd) => <div key={sd} style={{ marginTop: 10 }}>
          <h4 style={{ fontSize: 20, color: d.teams.find((t) => t.id === m[sd])?.color }}>{nm(m[sd])}</h4>
          <div className="objrow">{[0, 1, 2, 3, 4].map((bi) => <label key={bi} className="f"><span>Ban {bi + 1}</span><input value={g.bans?.[sd]?.[bi] || ''} onChange={(e) => upd((a) => { a[gi].bans ||= { a: [], b: [] }; const arr = (a[gi].bans[sd] ||= []); while (arr.length < 5) arr.push(''); arr[bi] = e.target.value; })} /></label>)}</div>
          <div className="objrow">{OBJ.map(([k, l]) => <label key={k} className="f"><span>{l}</span><input inputMode="numeric" value={g.obj?.[sd]?.[k] ?? 0} onChange={(e) => upd((a) => { a[gi].obj ||= { a: {}, b: {} }; a[gi].obj[sd][k] = N(e.target.value); })} /></label>)}</div>
          <div className="srow head"><span>Jogador</span><span>Campeão</span><span>Pick</span><span>K</span><span>D</span><span>A</span><span>CS</span><span>Ouro</span><span>Dano</span><span>Visão</span><span>Sent.</span></div>
          {Array.from({ length: 5 }, (_, pi) => { const p = g.players?.[sd]?.[pi] || blankPlayer(); const sp = (k, v) => upd((a) => { a[gi].players ||= { a: [], b: [] }; const arr = a[gi].players[sd]; while (arr.length < 5) arr.push(blankPlayer()); arr[pi][k] = v; });
            return <div className="srow" key={pi}>
              <input list={'r' + sd + gi} placeholder="Nick" value={p.nick} onChange={(e) => sp('nick', e.target.value)} />
              <input placeholder="Campeão" value={p.champ} onChange={(e) => sp('champ', e.target.value)} />
              {['pick', 'k', 'd', 'a', 'cs', 'gold', 'dmg', 'vision', 'wards'].map((k) => <input key={k} inputMode="numeric" aria-label={k} value={p[k]} onChange={(e) => sp(k, N(e.target.value))} />)}
            </div>; })}
          <datalist id={'r' + sd + gi}>{roster(m[sd]).map((n) => <option key={n} value={n} />)}</datalist>
        </div>)}
      </div>)}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {games.length < MAX_GAMES && <button className="btn gold" onClick={() => upd((a) => a.push(blankGame()))}>Adicionar jogo</button>}
        {canScore && games.some((g) => g.winner) && <button className="btn" onClick={() => set((n) => { const i = n.matches.findIndex((x) => x.id === mid); const g = (n.games[mid] || []); if (i >= 0) { n.matches[i].sa = g.filter((x) => x.winner === 'a').length; n.matches[i].sb = g.filter((x) => x.winner === 'b').length; } })}>Aplicar placar da série ({games.filter((g) => g.winner === 'a').length} x {games.filter((g) => g.winner === 'b').length})</button>}
      </div>
      <p className="note">Depois de preencher, clique em “Salvar e publicar”. A página pública da partida passa a mostrar as estatísticas.</p>
    </>}
  </div>;
}

export default function Admin() {
  const [auth, setAuth] = useState(null);
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('torneio');
  const [msg, setMsg] = useState('');
  const [pw, setPw] = useState('');
  const [lu, setLu] = useState('');
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [log, setLog] = useState([]);
  const [riot, setRiot] = useState(false);
  const [nu, setNu] = useState({ login: '', name: '', password: '', role: 'organizador', team: '' });
  const [err, setErr] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => { const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h); }, [dirty]);
  const [fail, setFail] = useState('');
  const [cfg, setCfg] = useState(true);
  const [vf, setVf] = useState({ title: '', url: '', caption: '' });
  const [pf, setPf] = useState({ title: '', caption: '' });
  const [busy, setBusy] = useState('');
  const load = async () => {
    const r = await fetch('/api/data', { cache: 'no-store' });
    if (!r.ok) throw new Error('Falha ao carregar os dados (' + r.status + ')');
    setD(await r.json());
  };
  const boot = () => {
    setFail(''); setAuth(null);
    fetch('/api/login', { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then((r) => { if (!r.ok) throw new Error('Falha ao verificar o login (' + r.status + ')'); return r.json(); })
      .then((j) => { setCfg(j.configured !== false); setAuth(!!j.auth); setMe(j.user ? { ...j.user, r: j.user.role } : null); if (j.auth) return load(); })
      .catch((e) => setFail(e.name === 'TimeoutError' ? 'O servidor não respondeu em 10 s (a API /api/login não está rodando — o site foi publicado como site estático?).' : /JSON/i.test(e.message || '') ? 'A API /api/login não devolveu JSON: o projeto precisa rodar com servidor Next.js (Vercel), não como site estático.' : e.message || 'Erro de conexão'));
  };
  useEffect(boot, []);
  const set = (fn) => { const n = structuredClone(d); fn(n); setD(n); setMsg(''); setDirty(true); };
  // Versão assíncrona-segura do set (usa o estado mais recente e não apaga a mensagem)
  const setf = (fn) => { setD((p) => { const n = structuredClone(p); n.media ||= { items: [], players: {} }; fn(n); return n; }); setDirty(true); };
  async function up(file, maxDim) {
    try {
      setBusy('Enviando imagem…');
      const blob = await prep(file, maxDim);
      const r = await fetch('/api/media', { method: 'POST', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()).id;
    } catch (e) { setMsg('Erro: ' + (e.message || e)); return null; } finally { setBusy(''); }
  }
  function addVideo() {
    const yt = ytId(vf.url);
    if (!yt) return setMsg('Erro: link do YouTube inválido. Cole o link do vídeo (youtu.be/… ou youtube.com/watch?v=…).');
    setf((n) => { n.media.items.unshift({ id: 'm' + Date.now(), kind: 'video', yt, title: vf.title.trim(), caption: vf.caption.trim(), date: today() }); });
    setVf({ title: '', url: '', caption: '' }); setMsg('Vídeo adicionado. Clique em “Salvar e publicar” para ele aparecer no site.');
  }
  async function addPhoto(e) {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const id = await up(f, 1600); if (!id) return;
    setf((n) => { n.media.items.unshift({ id: 'm' + Date.now(), kind: 'photo', img: id, title: pf.title.trim(), caption: pf.caption.trim(), date: today() }); });
    setPf({ title: '', caption: '' }); setMsg('Foto enviada. Clique em “Salvar e publicar” para ela aparecer no site.');
  }
  async function playerPhoto(e, teamId, nick) {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const id = await up(f, 800); if (!id) return;
    setf((n) => { n.media.players[pk(teamId, nick)] = id; }); setMsg('Foto de ' + nick + ' enviada. Clique em “Salvar e publicar”.');
  }
  async function login(e) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ user: lu, password: pw }) });
    if (!r.ok) return setErr(await r.text());
    setPw(''); boot();
  }
  async function save(data = d) {
    setMsg('Salvando…');
    const r = await fetch('/api/data', { method: 'PUT', body: JSON.stringify(data) });
    let j = {}; if (r.ok) j = await r.json().catch(() => ({}));
    const ign = (j.ignored || []).length ? ' Sem permissão para: ' + j.ignored.join(', ') + ' (não gravado).' : '';
    setMsg(r.ok ? (data._persistent === false ? 'Salvo só na memória: o site público pode não mostrar. Conecte o Upstash.' : 'Alterações publicadas no site.') + ign : 'Erro: ' + (await r.text()));
    if (r.ok) { setDirty(false); if (ign) load().catch(() => {}); }
    if (r.status === 401) setAuth(false);
  }
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => { const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(); } }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const out = async () => { await fetch('/api/login', { method: 'DELETE' }); setAuth(false); setMe(null); setD(null); };

  const loadUsers = () => fetch('/api/users', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then(setUsers).catch(() => {});
  useEffect(() => { if (auth) fetch('/api/riot/status', { cache: 'no-store' }).then((r) => r.json()).then((j) => setRiot(!!j.configured)).catch(() => {}); }, [auth]);
  useEffect(() => {
    if (tab === 'usuarios') loadUsers();
    if (tab === 'auditoria') fetch('/api/audit', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then(setLog).catch(() => {});
  }, [tab]);
  async function userCall(method, body, qs = '') {
    const r = await fetch('/api/users' + qs, { method, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { setMsg('Erro: ' + (await r.text())); return false; }
    loadUsers(); return true;
  }

  if (fail) return <div className="adm-login"><div className="panel"><h2>Não foi possível abrir o painel</h2><p className="err">{fail}</p><button className="btn gold" onClick={boot}>Tentar novamente</button><a href="/" className="back">Voltar ao site</a></div></div>;
  if (auth === null) return <div className="adm-login"><p>Carregando…</p></div>;
  if (!auth) return (
    <div className="adm-login"><form onSubmit={login} className="panel">
      <h2>Painel administrativo</h2><p className="note">Acesso restrito à organização do torneio.</p>
      {!cfg && <p className="err">A variável ADMIN_PASSWORD não está definida no servidor. Defina-a (veja o README) e reinicie/redeploy.</p>}
      <input autoComplete="username" autoCapitalize="none" placeholder="Usuário (vazio = administrador)" value={lu} onChange={(e) => setLu(e.target.value)} />
      <input type="password" autoComplete="current-password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      {err && <p className="err">{err}</p>}<button className="btn gold">Entrar</button><a href="/" className="back">Voltar ao site</a>
    </form></div>
  );
  if (!d) return <div className="adm-login"><p>Carregando…</p></div>;

  const c = d.config, B = bracket(d), st = standings(d);
  const done = d.matches.filter((m) => m.phase === 'g' && m.sa != null && m.sb != null).length;
  const role = me?.r || 'super';
  const ALL = [['torneio', 'Torneio'], ['transmissao', 'Transmissão'], ['equipes', 'Equipes'], ['partidas', 'Partidas'], ['estatisticas', 'Estatísticas'], ['midia', 'Mídia'], ['regras', 'Regulamento'], ['usuarios', 'Usuários'], ['auditoria', 'Auditoria']];
  const TABS = ALL.filter(([k]) => can(role, k));
  const rep = role === 'representante';
  if (!TABS.some(([k]) => k === tab) && TABS.length) setTimeout(() => setTab(TABS[0][0]), 0);
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
        <div className="row"><span className="mut" style={{ alignSelf: 'center', fontSize: 13 }}>{me?.name} · {ROLES[role]}</span><a className="btn gold" href="/admin/gestao">Gestão ampliada</a><a className="btn" href="/" target="_blank">Ver site</a><button className="btn" onClick={out}>Sair</button></div></header>
      <div className="stats">
        <div><b>{d.teams.length}</b><small>equipes</small></div><div><b>{done}/10</b><small>partidas da fase 1</small></div>
        <div><b>{B.done ? 'Concluída' : 'Em andamento'}</b><small>classificatória</small></div><div><b>{B.champion ? d.teams.find((t) => t.id === B.champion)?.name : '—'}</b><small>campeão</small></div>
      </div>
      {!d._persistent && <p className="warn">Banco de dados não conectado: as alterações ficam só em memória e podem ser perdidas. As variáveis do Upstash (URL e TOKEN REST) não foram encontradas neste ambiente: confira se estão marcadas para Production e Preview e faça um Redeploy (veja o README).</p>}
      <div className="atabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'torneio' && <div className="panel grid">
        <F l="Nome do torneio"><input value={c.name} onChange={(e) => set((n) => (n.config.name = e.target.value))} /></F>
        <F l="Subtítulo"><input value={c.subtitle} onChange={(e) => set((n) => (n.config.subtitle = e.target.value))} /></F>
        <F l="Imagem do banner (URL)"><input value={c.bannerImage} onChange={(e) => set((n) => (n.config.bannerImage = e.target.value))} /></F>
        <F l="Campeões em destaque (nomes do Data Dragon, separados por vírgula)"><input value={c.featured} onChange={(e) => set((n) => (n.config.featured = e.target.value))} /></F>
        <F l="Início do torneio"><input type="datetime-local" value={c.startDate} onChange={(e) => set((n) => (n.config.startDate = e.target.value))} /></F>
        <F l="Texto do banner de alerta (vazio oculta)"><input value={c.alert} onChange={(e) => set((n) => (n.config.alert = e.target.value))} /></F>
        <F l="Formato da final"><select value={c.finalFormat} onChange={(e) => set((n) => (n.config.finalFormat = e.target.value))}><option>MD3</option><option>MD5</option></select></F>
        <F l="Notícias e avisos (uma por linha)"><textarea rows={5} value={(c.news || []).join('\n')} onChange={(e) => set((n) => (n.config.news = e.target.value.split('\n').filter(Boolean)))} /></F>
      </div>}

      {tab === 'transmissao' && <div className="panel grid">
        <F l="Link da transmissão (YouTube, Twitch, Kick, Facebook, Vimeo, .m3u8, .mp4 ou qualquer outro link/embed)"><input inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={c.stream} onChange={(e) => set((n) => (n.config.stream = e.target.value.slice(0, 2000)))} placeholder="https://twitch.tv/canal" /></F>
        <StreamPreview url={c.stream} />
      </div>}

      {tab === 'equipes' && <div>
        {d.teams.map((t, i) => (rep && t.id !== me?.team) ? null : <div key={t.id} className="panel grid tcard" style={{ borderLeft: `4px solid ${t.color}` }}>
          <F l="Nome"><input value={t.name} onChange={(e) => set((n) => (n.teams[i].name = e.target.value))} /></F>
          <F l="Sigla"><input maxLength={3} value={t.tag} onChange={(e) => set((n) => (n.teams[i].tag = e.target.value))} /></F>
          <F l="Cor"><input type="color" value={t.color} onChange={(e) => set((n) => (n.teams[i].color = e.target.value))} /></F>
          <F l="Capitão (contato)"><input value={t.captain} onChange={(e) => set((n) => (n.teams[i].captain = e.target.value))} /></F>
          <F l="Representante"><input value={t.rep || ''} onChange={(e) => set((n) => (n.teams[i].rep = e.target.value))} /></F>
          <F l="Titulares (nicks, separados por vírgula)"><input value={(t.players || []).join(', ')} onChange={(e) => set((n) => (n.teams[i].players = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} /></F>
          <F l="Reservas (nicks, separados por vírgula)"><input value={(t.reserves || []).join(', ')} onChange={(e) => set((n) => (n.teams[i].reserves = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} /></F>
          <F l="Logo (URL ou envio até 150 KB)"><input value={(t.logo || '').startsWith('data:') ? '(imagem enviada)' : t.logo} onChange={(e) => set((n) => (n.teams[i].logo = e.target.value))} /><input type="file" accept="image/*" onChange={(e) => img(e.target.files[0], (u) => set((n) => (n.teams[i].logo = u)))} /></F>
          {!rep && <F l="Prioridade na partida extra (1 = melhor)"><input type="number" min="1" value={t.tb ?? ''} onChange={(e) => set((n) => (n.teams[i].tb = num(e.target.value)))} /></F>}
          {[...(t.players || []), ...(t.reserves || [])].length > 0 && <div className="prof">
            <h4>Perfil dos jogadores</h4>
            {[...(t.players || []).map((n) => [n, false]), ...(t.reserves || []).map((n) => [n, true])].map(([nick, res]) => {
              const pr = t.profiles?.[nick] || {};
              const up = (k, v) => set((n) => { n.teams[i].profiles ||= {}; n.teams[i].profiles[nick] = { ...(n.teams[i].profiles[nick] || {}), [k]: v }; });
              return <div className="prow" key={nick}>
                <b>{nick}{res && <em> reserva</em>}</b>
                <input placeholder="Riot ID (Nome#TAG)" value={pr.riotId || ''} onChange={(e) => up('riotId', e.target.value)} />
                <select aria-label="Rota principal" value={pr.lane || ''} onChange={(e) => up('lane', e.target.value)}><option value="">Rota principal</option>{LANES.map((l) => <option key={l}>{l}</option>)}</select>
                <select aria-label="Rota secundária" value={pr.lane2 || ''} onChange={(e) => up('lane2', e.target.value)}><option value="">Rota secundária</option>{LANES.map((l) => <option key={l}>{l}</option>)}</select>
                <input list="elos" placeholder="Elo (ex.: Ouro II)" value={pr.elo || ''} onChange={(e) => up('elo', e.target.value)} />
                <input placeholder="Link OP.GG (vazio = gerado pelo Riot ID)" value={pr.opgg || ''} onChange={(e) => up('opgg', e.target.value)} />
                <div className="rioline">
                  <label><input type="checkbox" checked={!!pr.consent} onChange={(e) => up('consent', e.target.checked)} /> Jogador autorizou consulta de dados à Riot</label>
                  {riot && pr.consent && <button type="button" className="btn sm" onClick={async () => {
                    setMsg('Consultando a Riot…');
                    const r = await fetch('/api/riot/rank', { method: 'POST', body: JSON.stringify({ team: t.id, nick }) });
                    if (!r.ok) return setMsg('Riot: ' + (await r.text()));
                    const j = await r.json(); up('elo', j.elo); up('ranked', { wins: j.wins, losses: j.losses, at: j.at }); setMsg(`${nick}: ${j.elo}. Clique em Salvar e publicar para aplicar no site.`);
                  }}>Atualizar elo pela Riot</button>}
                  {pr.ranked?.at && <small className="mut">Elo atualizado em {new Date(pr.ranked.at).toLocaleString('pt-BR')}</small>}
                </div>
              </div>;
            })}
            <datalist id="elos">{ELOS.filter(Boolean).map((e) => <option key={e} value={e} />)}</datalist>
          </div>}
          {!rep && <button className="btn danger" onClick={() => confirm('Remover esta equipe?') && set((n) => { n.teams.splice(i, 1); n.matches.forEach((m) => { if (m.a === t.id) m.a = ''; if (m.b === t.id) m.b = ''; }); })}>Remover</button>}
        </div>)}
        {!rep && <button className="btn" onClick={() => set((n) => n.teams.push({ id: 't' + Date.now(), name: 'Nova equipe', tag: 'N', color: '#8a9bb4', logo: '', captain: '', rep: '', players: [], reserves: [], profiles: {}, tb: n.teams.length + 1 }))}>Adicionar equipe</button>}
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

      {tab === 'estatisticas' && <Stats d={d} set={set} B={B} canScore={can(role, 'partidas')} riot={riot} say={setMsg} />}

      {tab === 'midia' && (() => {
        const M = d.media || { items: [], players: {} };
        return <div>
          <div className="panel" style={{ marginBottom: 14 }}>
            <h3 className="sh">Adicionar vídeo (YouTube)</h3>
            <p className="note">Envie o vídeo no YouTube Studio, escolha a visibilidade <b>“Não listado”</b>, copie o link e cole abaixo. Quem não tiver o link não encontra o vídeo no YouTube, mas ele aparece aqui na página de Mídia.</p>
            <div className="grid" style={{ marginTop: 12 }}>
              <F l="Título"><input value={vf.title} onChange={(e) => setVf({ ...vf, title: e.target.value })} /></F>
              <F l="Link do vídeo no YouTube"><input value={vf.url} onChange={(e) => setVf({ ...vf, url: e.target.value })} placeholder="https://youtu.be/xxxxxxxxxxx" /></F>
              <F l="Descrição (opcional)"><input value={vf.caption} onChange={(e) => setVf({ ...vf, caption: e.target.value })} /></F>
            </div>
            <button className="btn gold" onClick={addVideo}>Adicionar vídeo</button>
          </div>

          <div className="panel" style={{ marginBottom: 14 }}>
            <h3 className="sh">Adicionar foto (até 400 KB)</h3>
            <p className="note">Fotos maiores que 400 KB são reduzidas automaticamente. Formatos: JPG, PNG, WEBP e GIF.</p>
            <div className="grid" style={{ marginTop: 12 }}>
              <F l="Título (opcional)"><input value={pf.title} onChange={(e) => setPf({ ...pf, title: e.target.value })} /></F>
              <F l="Legenda (opcional)"><input value={pf.caption} onChange={(e) => setPf({ ...pf, caption: e.target.value })} /></F>
              <F l="Escolher foto"><input type="file" accept="image/*" disabled={!!busy} onChange={addPhoto} /></F>
            </div>
            {busy && <p className="note">{busy}</p>}
          </div>

          <div className="panel" style={{ marginBottom: 14 }}>
            <h3 className="sh">Publicações ({M.items.length})</h3>
            {!M.items.length && <p className="note">Nada publicado ainda.</p>}
            {M.items.map((it, i) => <div className="mrow-m" key={it.id}>
              {it.kind === 'video' ? <img src={`https://i.ytimg.com/vi/${it.yt}/mqdefault.jpg`} alt="" /> : <img src={`/api/img/${it.img}`} alt="" />}
              <input placeholder={it.kind === 'video' ? 'Título do vídeo' : 'Título da foto'} value={it.title} onChange={(e) => set((n) => (n.media.items[i].title = e.target.value))} />
              <input placeholder="Legenda / descrição" value={it.caption} onChange={(e) => set((n) => (n.media.items[i].caption = e.target.value))} />
              <button className="btn danger sm" onClick={() => confirm('Remover esta publicação?') && set((n) => n.media.items.splice(i, 1))}>Remover</button>
            </div>)}
          </div>

          <div className="panel">
            <h3 className="sh">Fotos dos jogadores</h3>
            <p className="note">Uma foto por jogador; o nick aparece embaixo dela no site. Os nicks vêm do campo “Titulares” da aba Equipes.</p>
            {d.teams.map((t) => <div key={t.id} style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 22, color: t.color }}>{t.name}</h4>
              {(t.players || []).length ? <div className="mgrid">{t.players.map((nick) => {
                const id = M.players[pk(t.id, nick)];
                return <div className="mcard" key={nick}>
                  {id ? <img src={`/api/img/${id}`} alt={nick} /> : <div className="noimg">sem foto</div>}
                  <b>{nick}</b>
                  <input type="file" accept="image/*" disabled={!!busy} onChange={(e) => playerPhoto(e, t.id, nick)} />
                  {id && <button className="btn danger sm" onClick={() => set((n) => { delete n.media.players[pk(t.id, nick)]; })}>Remover foto</button>}
                </div>;
              })}</div> : <p className="note">Nenhum nick cadastrado. Preencha “Titulares” na aba Equipes.</p>}
            </div>)}
          </div>
        </div>;
      })()}

      {tab === 'usuarios' && <div>
        <div className="panel" style={{ marginBottom: 14 }}>
          <h3 className="sh">Novo usuário</h3>
          <p className="note">Cada pessoa entra com o próprio login e só enxerga o que o papel permite. Você (senha mestre, login em branco ou "admin") sempre tem acesso total.</p>
          <div className="grid" style={{ marginTop: 12 }}>
            <F l="Login (minúsculas, sem espaço)"><input autoCapitalize="none" value={nu.login} onChange={(e) => setNu({ ...nu, login: e.target.value })} /></F>
            <F l="Nome exibido"><input value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></F>
            <F l="Senha (mín. 8 caracteres)"><input type="password" autoComplete="new-password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></F>
            <F l="Papel"><select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
            {nu.role === 'representante' && <F l="Equipe"><select value={nu.team} onChange={(e) => setNu({ ...nu, team: e.target.value })}>{tOpts}</select></F>}
          </div>
          <button className="btn gold" onClick={async () => { if (await userCall('POST', nu)) { setNu({ login: '', name: '', password: '', role: 'organizador', team: '' }); setMsg('Usuário criado.'); } }}>Criar usuário</button>
        </div>
        <div className="panel">
          <h3 className="sh">Usuários ({users.length})</h3>
          {!users.length && <p className="note">Nenhum usuário além da senha mestre.</p>}
          {users.map((u) => <div className="mrow-u" key={u.id}>
            <b>{u.name}</b><span className="mut">{u.login}</span>
            <span>{ROLES[u.role]}{u.team ? ' · ' + (d.teams.find((t) => t.id === u.team)?.name || u.team) : ''}</span>
            <button className="btn sm" onClick={() => { const p = prompt('Nova senha para ' + u.login + ' (mín. 8 caracteres):'); if (p) userCall('PATCH', { id: u.id, password: p }).then((ok) => ok && setMsg('Senha alterada.')); }}>Nova senha</button>
            <button className="btn danger sm" onClick={() => confirm('Remover o usuário ' + u.login + '?') && userCall('DELETE', null, '?id=' + u.id)}>Remover</button>
          </div>)}
        </div>
      </div>}

      {tab === 'auditoria' && <div className="panel">
        <h3 className="sh">Últimas alterações</h3>
        {!log.length && <p className="note">Nenhum registro.</p>}
        {log.map((l, i) => <p className="logrow" key={i}><span className="mut">{new Date(l.t).toLocaleString('pt-BR')}</span> <b>{l.u}</b> <span className="mut">({ROLES[l.r] || l.r})</span> {l.a}{l.sec ? ': ' + l.sec.join(', ') : ''}{l.alvo ? ' — ' + l.alvo : ''}</p>)}
      </div>}

      {tab === 'regras' && <div className="panel"><F l="Texto do regulamento (cada artigo começa com “## Título”; itens com “- ”)"><textarea rows={26} value={c.rules} onChange={(e) => set((n) => (n.config.rules = e.target.value))} /></F></div>}

      <div className="savebar"><span>{msg}{!TABS.length && 'Seu papel ainda não tem módulos disponíveis nesta versão.'}</span>
        {can(role, 'torneio') && can(role, 'equipes') && can(role, 'partidas') && <button className="btn" onClick={() => confirm('Restaurar todos os dados padrão? Isso apaga resultados e equipes.') && (() => { const r = { ...structuredClone(SEED), media: structuredClone(d.media || SEED.media), _persistent: d._persistent }; setD(r); save(r); })()}>Restaurar padrão</button>}
        <button className="btn gold" onClick={() => save()} title="Ctrl+S">Salvar e publicar</button></div>
    </div>
  );
}
