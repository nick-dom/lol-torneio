'use client';
import { useState } from 'react';
import LivePlayer from '@/components/LivePlayer';
import { ytId } from '@/lib/media';
// Miniatura → ao clicar, carrega o player. Quando não dá para incorporar, o LivePlayer mostra o botão para a plataforma.
export default function VodCard({ v, sub, preview }) {
  const [on, setOn] = useState(false);
  const yt = ytId(v.url), thumb = preview || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '');
  return (
    <article className="vcard">
      {on ? <LivePlayer url={v.url} /> : <button className="vthumb" onClick={() => setOn(true)} aria-label={'Reproduzir ' + v.title} style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}><span className="play" /></button>}
      <div className="vmeta"><h3>{v.title}</h3>{v.description && <p>{v.description}</p>}<small>{sub}</small><div style={{ marginTop: 8 }}><a className="btn sm" href={v.url} target="_blank" rel="noopener noreferrer">Abrir em {v.platform} ↗</a></div></div>
    </article>
  );
}
