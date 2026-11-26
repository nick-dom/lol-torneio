'use client';
import { useEffect, useState } from 'react';

const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

export default function PushPrefs() {
  const [cfg, setCfg] = useState(null), [sub, setSub] = useState(null), [prefs, setPrefs] = useState([]), [perm, setPerm] = useState('default'), [busy, setBusy] = useState(false), [msg, setMsg] = useState(null);
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  useEffect(() => {
    fetch('/api/push', { cache: 'no-store' }).then((r) => r.json()).then(setCfg).catch(() => setCfg({ configured: false, error: true }));
    if (!supported) return;
    setPerm(Notification.permission);
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(async (s) => {
      if (!s) return; setSub(s);
      const r = await fetch('/api/push', { method: 'POST', body: JSON.stringify({ action: 'status', endpoint: s.endpoint }) }).catch(() => null);
      if (r?.ok) { const j = await r.json(); if (j.subscribed) setPrefs(j.prefs); }
    }).catch(() => {});
  }, [supported]);
  const say = (ok, t) => setMsg({ ok, t });

  async function enable() {   // só roda por clique do usuário: nunca pedimos permissão automaticamente
    setBusy(true); setMsg(null);
    try {
      const p = await Notification.requestPermission(); setPerm(p);
      if (p !== 'granted') throw new Error('Permissão negada. Para ativar, libere as notificações nas configurações do navegador para este site.');
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.publicKey) });
      const all = Object.keys(cfg.types);
      const r = await fetch('/api/push', { method: 'POST', body: JSON.stringify({ subscription: s.toJSON(), prefs: all }) });
      if (!r.ok) { await s.unsubscribe().catch(() => {}); throw new Error(await r.text()); }
      setSub(s); setPrefs(all); say(true, 'Notificações ativadas neste dispositivo.');
    } catch (e) { say(false, e.message || 'Não foi possível ativar.'); } finally { setBusy(false); }
  }
  async function toggle(t) {
    const next = prefs.includes(t) ? prefs.filter((x) => x !== t) : [...prefs, t]; setPrefs(next);
    const r = await fetch('/api/push', { method: 'PUT', body: JSON.stringify({ endpoint: sub.endpoint, prefs: next }) });
    if (!r.ok) { setPrefs(prefs); say(false, await r.text()); } else say(true, 'Preferências salvas.');
  }
  async function disable() {
    setBusy(true); try { await fetch('/api/push', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); setSub(null); setPrefs([]); say(true, 'Notificações desativadas.'); } catch (e) { say(false, e.message); } finally { setBusy(false); }
  }

  if (!cfg) return <section className="panel"><p className="mut"><span className="spin" aria-hidden /> Carregando…</p></section>;
  if (!supported) return <section className="panel"><p className="note">Este navegador não oferece notificações push. No iPhone/iPad, instale o app na tela inicial (Compartilhar → Adicionar à Tela de Início) e abra por lá.</p></section>;
  if (!cfg.configured) return <section className="panel"><p className="note">As notificações push ainda não foram ativadas pela organização neste servidor.</p></section>;
  return (
    <section className="panel"><div className="ph"><h2>Notificações</h2></div>
      {!sub ? <>
        <p>Receba avisos de partidas, resultados, notícias e votações neste dispositivo. Você escolhe quais tipos quer e pode desativar quando quiser.</p>
        {perm === 'denied' && <p className="err">As notificações estão bloqueadas no navegador. Libere nas configurações do site para continuar.</p>}
        <button className="btn gold" onClick={enable} disabled={busy || perm === 'denied'}>{busy ? 'Ativando…' : 'Ativar notificações'}</button>
      </> : <>
        <p className="okmsg">Notificações ativas neste dispositivo.</p>
        <div className="prefs">{Object.entries(cfg.types).map(([k, l]) => <label key={k} className="chk"><input type="checkbox" checked={prefs.includes(k)} onChange={() => toggle(k)} /><span>{l}</span></label>)}</div>
        <button className="btn danger" onClick={disable} disabled={busy} style={{ marginTop: 12 }}>Desativar neste dispositivo</button>
      </>}
      {msg && <p className={msg.ok ? 'okmsg' : 'err'} role="status">{msg.t}</p>}
    </section>
  );
}
