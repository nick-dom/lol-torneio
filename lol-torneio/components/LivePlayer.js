'use client';
import { useEffect, useRef, useState } from 'react';
import { parseLive } from '@/lib/embed';

const ALLOW = 'autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write; accelerometer; gyroscope';
// Isolamento para sites de terceiros que não conhecemos: roda scripts, mas não navega nem controla a página principal
const SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox';

function Hls({ src, onFail }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    let hls, dead = false;
    if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = src; return; } // iOS/Safari tocam HLS nativamente
    import('hls.js').then(({ default: H }) => {
      if (dead) return;
      if (!H.isSupported()) return onFail();
      hls = new H({ lowLatencyMode: true });
      hls.on(H.Events.ERROR, (_, e) => { if (e.fatal) onFail(); });
      hls.loadSource(src); hls.attachMedia(v);
    }).catch(onFail);
    return () => { dead = true; hls?.destroy(); };
  }, [src, onFail]);
  return <video ref={ref} className="player" controls playsInline preload="metadata" />;
}

export default function LivePlayer({ url }) {
  const [p, setP] = useState(undefined); // undefined = ainda não calculou (evita erro de hidratação)
  const [bad, setBad] = useState(false);
  useEffect(() => { setBad(false); setP(parseLive(url, location.hostname)); }, [url]);

  if (p === undefined) return <div className="player off" />;
  if (!p) return <div className="player off"><span>Transmissão offline</span><small>O link da live aparece aqui quando a organização publicar.</small></div>;

  const openBtn = <a className="btn sm live-open" href={p.open} target="_blank" rel="noopener noreferrer">Abrir em nova aba ↗</a>;

  if (p.type === 'link' || bad) return (
    <div className="live">
      <div className="player off"><span>{p.provider}</span><small>{bad ? 'Não foi possível tocar este stream aqui.' : p.note}</small></div>
      <div className="live-bar">{openBtn}</div>
    </div>
  );

  return (
    <div className="live">
      {p.type === 'iframe' && <iframe className="player" src={p.src} allow={ALLOW} allowFullScreen loading="lazy" referrerPolicy={p.referrerPolicy} sandbox={p.sandbox ? SANDBOX : undefined} title={`Transmissão ao vivo (${p.provider})`} />}
      {p.type === 'hls' && <Hls src={p.src} onFail={() => setBad(true)} />}
      {p.type === 'video' && <video className="player" src={p.src} controls playsInline preload="metadata" onError={() => setBad(true)} />}
      <div className="live-bar">
        <span className="mut">{p.provider}</span>
        {p.generic && <span className="mut live-hint">Se não carregar, o site bloqueia incorporação.</span>}
        {openBtn}
      </div>
    </div>
  );
}
