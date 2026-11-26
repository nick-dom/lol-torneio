'use client';
import { useEffect, useState } from 'react';
import { can, ROLES } from '@/lib/perm';
import { api } from './admin/api';
import Crud from './admin/Crud';
import { Inscricoes, Votacao, Temporadas, Push } from './admin/Panels';
import { bracket, KO } from '@/lib/logic';

const TABS = [['inscricoes', 'Inscrições'], ['narradores', 'Narradores'], ['transmissoes', 'Transmissões'], ['noticias', 'Notícias'], ['vods', 'VODs'], ['premiacoes', 'Premiações'], ['votacao', 'Votação MVP'], ['temporadas', 'Temporadas'], ['push', 'Notificações']];

// Painel ampliado (Etapas 1–5). Usa o mesmo login do /admin; cada aba é protegida também no servidor.
export default function AdminPlus() {
  const [me, setMe] = useState(undefined), [d, setD] = useState(null), [tab, setTab] = useState(''), [msg, setMsg] = useState(null), [crew, setCrew] = useState([]), [seasons, setSeasons] = useState([]), [ver, setVer] = useState(0);
  const say = (t, ok = true) => { setMsg({ t, ok }); if (ok) setTimeout(() => setMsg((m) => (m && m.t === t ? null : m)), 6000); };
  useEffect(() => {
    fetch('/api/login', { cache: 'no-store' }).then((r) => r.json()).then(async (j) => {
      if (!j.auth) return setMe(null);
      setMe({ ...j.user, r: j.user.role });
      const r = await fetch('/api/data', { cache: 'no-store' }); if (r.ok) setD(await r.json());
    }).catch(() => setMe(null));
  }, [ver]);
  useEffect(() => {
    if (!me) return;
    if (can(me.r, 'transmissoes')) api('/api/adm/narradores').then((r) => r.ok && setCrew(r.data));
    if (can(me.r, 'premiacoes') || can(me.r, 'temporadas')) api('/api/adm/temporadas').then((r) => r.ok && setSeasons(r.data));
  }, [me, tab, ver]);
  const tabs = me ? TABS.filter(([k]) => can(me.r, k)) : [];
  useEffect(() => { if (tabs.length && !tabs.some(([k]) => k === tab)) setTab(tabs[0][0]); }, [me]);
  if (me === undefined) return <div className="adm-login"><p className="mut"><span className="spin" aria-hidden /> Carregando…</p></div>;
  if (!me) return <div className="adm-login"><div className="panel"><h2>Acesso restrito</h2><p className="note">Entre no painel administrativo primeiro.</p><a className="btn gold" href="/admin">Ir para o login</a></div></div>;

  const B = d ? bracket(d) : null;
  const matches = d ? [...d.matches.filter((m) => m.phase === 'g').map((m) => [m.id, `Rodada ${m.round}: ${d.teams.find((t) => t.id === m.a)?.name} x ${d.teams.find((t) => t.id === m.b)?.name}`]), ...['sf1', 'sf2', 'third', 'final'].map((k) => [k, KO[k] + (B.M[k].a && B.M[k].b ? `: ${d.teams.find((t) => t.id === B.M[k].a)?.name} x ${d.teams.find((t) => t.id === B.M[k].b)?.name}` : '')])] : [];
  const ctx = { matches, crew: crew.map((c) => [c.id, c.name]), seasons: seasons.map((s) => [s.id, s.name]), currentSeason: d?.config?.seasonId };
  return (
    <div className="adm">
      <header className="adm-h"><div><h1>Gestão do torneio</h1><small>Inscrições, transmissões, notícias, premiações, votação e temporadas</small></div>
        <div className="row"><span className="mut" style={{ alignSelf: 'center', fontSize: 13 }}>{me.name} · {ROLES[me.r]}</span><a className="btn" href="/admin">Painel principal</a><a className="btn" href="/" target="_blank">Ver site</a></div></header>
      <div className="atabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>)}</div>
      {msg && <p className={msg.ok ? 'okmsg' : 'err'} role="status" style={{ margin: '10px 0' }}>{msg.t}</p>}
      <main>
        {tab === 'inscricoes' && <Inscricoes say={say} />}
        {['narradores', 'transmissoes', 'noticias', 'vods', 'premiacoes'].includes(tab) && <Crud key={tab} col={tab} ctx={ctx} say={say} />}
        {tab === 'votacao' && <Votacao say={say} />}
        {tab === 'temporadas' && <Temporadas say={say} onChange={() => setVer((v) => v + 1)} />}
        {tab === 'push' && <Push say={say} />}
      </main>
    </div>
  );
}
