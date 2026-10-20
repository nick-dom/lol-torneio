'use client';
import { useEffect, useState } from 'react';
import { pk } from '@/lib/media';

const TABS = [['videos', 'Vídeos'], ['fotos', 'Fotos'], ['jogadores', 'Jogadores']];
const dt = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '');

function Video({ v }) {
  const [on, setOn] = useState(false);
  return (
    <article className="vcard">
      {on
        ? <iframe className="player" src={`https://www.youtube-nocookie.com/embed/${v.yt}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen title={v.title || 'Vídeo'} />
        : <button className="vthumb" onClick={() => setOn(true)} aria-label={'Reproduzir ' + (v.title || 'vídeo')} style={{ backgroundImage: `url(https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg)` }}><span className="play" /></button>}
      <div className="vmeta"><h3>{v.title || 'Vídeo'}</h3>{v.caption && <p>{v.caption}</p>}<small>{dt(v.date)}</small></div>
    </article>
  );
}

export default function Midia({ data: d }) {
  const [tab, setTab] = useState('videos');
  const [box, setBox] = useState(null);
  const M = d.media || { items: [], players: {} };
  const videos = M.items.filter((x) => x.kind === 'video'), photos = M.items.filter((x) => x.kind === 'photo');
  useEffect(() => { const h = location.hash.slice(1); if (TABS.some((t) => t[0] === h)) setTab(h); }, []);
  useEffect(() => { const k = (e) => e.key === 'Escape' && setBox(null); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const go = (t) => { setTab(t); history.replaceState(null, '', '#' + t); };

  return (
    <>
      <header className="mhead"><div><p className="kicker">Campeonato oficial de League of Legends</p><h1>Mídia</h1><p className="sub">{d.config.name}</p></div></header>
      <nav className="nav"><div className="nav-in">
        <a className="navlink" href="/">← Site do torneio</a>
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}
      </div></nav>
      <main className="wrap">
        {tab === 'videos' && (videos.length ? <div className="vgrid">{videos.map((v) => <Video key={v.id} v={v} />)}</div> : <p className="note">Nenhum vídeo publicado ainda.</p>)}

        {tab === 'fotos' && (photos.length ? <div className="pgal">{photos.map((p) => (
          <figure key={p.id} className="ph-it"><button onClick={() => setBox(p)} aria-label={'Ampliar ' + (p.title || 'foto')}><img src={`/api/img/${p.img}`} alt={p.title || 'Foto do torneio'} loading="lazy" /></button>
            {(p.title || p.caption) && <figcaption><b>{p.title}</b>{p.caption && <span>{p.caption}</span>}</figcaption>}</figure>
        ))}</div> : <p className="note">Nenhuma foto publicada ainda.</p>)}

        {tab === 'jogadores' && (d.teams.some((t) => (t.players || []).length) ? d.teams.map((t) => (
          <section key={t.id} className="panel" style={{ '--c': t.color }}>
            <div className="ph"><h2 style={{ color: t.color }}>{t.name}</h2></div>
            {(t.players || []).length ? <div className="roster">{t.players.map((n) => {
              const id = M.players[pk(t.id, n)];
              return <figure key={n} className="pl">
                {id ? <img src={`/api/img/${id}`} alt={'Foto de ' + n} loading="lazy" /> : <div className="noimg" style={{ background: t.color }}>{n.slice(0, 1).toUpperCase()}</div>}
                <figcaption>{n}</figcaption></figure>;
            })}</div> : <p className="note">Jogadores a divulgar.</p>}
          </section>
        )) : <p className="note">Os jogadores serão divulgados em breve.</p>)}
      </main>
      {box && <div className="lb" onClick={() => setBox(null)} role="dialog" aria-modal="true">
        <img src={`/api/img/${box.img}`} alt={box.title || 'Foto'} />
        {(box.title || box.caption) && <p><b>{box.title}</b> {box.caption}</p>}
        <button className="btn" onClick={() => setBox(null)}>Fechar</button>
      </div>}
      <footer className="foot">Projeto de fãs, não afiliado à Riot Games. League of Legends é marca da Riot Games, Inc.</footer>
    </>
  );
}
