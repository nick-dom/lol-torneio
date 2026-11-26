'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const KEY = 'nexus-last-sync';
const when = (t) => { try { return new Date(Number(t)).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

// Registra o service worker, mostra se está offline (e quando foi a última sincronização) e oferece instalar o app.
export default function PwaClient() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [last, setLast] = useState('');
  const [back, setBack] = useState(false);
  const [ev, setEv] = useState(null);
  const was = useRef(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const onPrompt = (e) => { e.preventDefault(); setEv(e); };
    const onInstalled = () => setEv(null);
    addEventListener('beforeinstallprompt', onPrompt); addEventListener('appinstalled', onInstalled);
    return () => { removeEventListener('beforeinstallprompt', onPrompt); removeEventListener('appinstalled', onInstalled); };
  }, []);

  useEffect(() => {
    let dead = false;
    // Só consideramos "online" se o servidor realmente respondeu (navigator.onLine sozinho não basta)
    const check = async () => {
      let ok = false;
      try { const r = await fetch('/api/ping', { cache: 'no-store', signal: AbortSignal.timeout(5000) }); ok = r.ok; } catch {}
      if (dead) return;
      if (ok) { try { localStorage.setItem(KEY, String(Date.now())); } catch {} }
      try { setLast(localStorage.getItem(KEY) || ''); } catch {}
      setOnline(ok);
      if (ok && !was.current) { setBack(true); router.refresh(); setTimeout(() => setBack(false), 4000); }
      was.current = ok;
    };
    check();
    const i = setInterval(check, 30000);
    addEventListener('online', check); addEventListener('offline', check);
    return () => { dead = true; clearInterval(i); removeEventListener('online', check); removeEventListener('offline', check); };
  }, [router]);

  const install = async () => { if (!ev) return; ev.prompt(); try { await ev.userChoice; } catch {} setEv(null); };
  return (
    <>
      {!online && <div className="pwa-bar off" role="status" aria-live="polite"><b>Você está offline.</b> {last ? `Os dados mostrados foram salvos em ${when(last)} e podem estar desatualizados.` : 'Os dados mostrados podem estar desatualizados.'}</div>}
      {online && back && <div className="pwa-bar on" role="status" aria-live="polite">Conexão restaurada — dados atualizados.</div>}
      {ev && online && <button className="pwa-install" onClick={install}>Instalar o app</button>}
    </>
  );
}
