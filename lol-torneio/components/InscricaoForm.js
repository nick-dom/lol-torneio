'use client';
import { useEffect, useState } from 'react';
import { LANES } from '@/lib/players';
import { upload } from '@/lib/imgprep';

const blank = (n) => Array.from({ length: n }, () => ({ nick: '', riotId: '', lane: '' }));
const init = () => ({ team: { name: '', tag: '', logo: '' }, rep: { name: '', contact: '', email: '' }, players: blank(5), reserves: [], captain: '', availability: false, rulesAccepted: false });

export default function InscricaoForm({ info, editId, editToken }) {
  const [f, setF] = useState(init()), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(null);
  const [loading, setLoading] = useState(!!editId), [corr, setCorr] = useState(''), [status, setStatus] = useState('');
  const [up, setUp] = useState(false);
  const editing = !!editId;
  useEffect(() => {
    if (!editId) return;
    fetch(`/api/inscricoes?id=${encodeURIComponent(editId)}&token=${encodeURIComponent(editToken || '')}`, { cache: 'no-store' })
      .then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json(); })
      .then((j) => { setStatus(j.statusLabel); setCorr(j.correction); const d = j.data; setF({ ...init(), team: { name: d.team.name, tag: d.team.tag, logo: d.team.logo || '' }, rep: { name: d.rep.name, contact: d.rep.contact, email: d.rep.email || '' }, players: d.players, reserves: d.reserves, captain: d.captain || '', availability: true, rulesAccepted: true }); })
      .catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [editId, editToken]);

  const set = (fn) => setF((p) => { const n = structuredClone(p); fn(n); return n; });
  const nicks = [...f.players, ...f.reserves].map((p) => p.nick).filter(Boolean);
  async function pickLogo(e) {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    setUp(true); setErr('');
    try { const id = await upload('/api/inscricoes/logo', file, 512); set((n) => { n.team.logo = id; }); } catch (x) { setErr(x.message || 'Falha ao enviar a logo.'); } finally { setUp(false); }
  }
  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!f.availability) return setErr('Confirme a disponibilidade da equipe para participar.');
    if (!f.rulesAccepted) return setErr('É necessário aceitar o regulamento.');
    setBusy(true);
    try {
      const body = { ...f, ...(editing ? { id: editId, token: editToken } : {}) };
      const r = await fetch('/api/inscricoes', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      if (editing) setDone({ edited: true }); else { try { localStorage.setItem('nexus-insc', JSON.stringify({ id: j.id, token: j.token })); } catch {} setDone(j); }
      scrollTo({ top: 0, behavior: 'smooth' });
    } catch (x) { setErr(x.message || 'Não foi possível enviar.'); } finally { setBusy(false); }
  }

  if (done) {
    const link = done.token ? `${location.origin}/inscricao?id=${done.id}&token=${done.token}` : '';
    return <section className="panel"><div className="ph"><h2>{done.edited ? 'Correção enviada' : 'Inscrição enviada!'}</h2></div>
      <p>{done.edited ? 'Sua inscrição voltou para análise da organização.' : 'Recebemos a inscrição da sua equipe. A organização vai analisar e você poderá acompanhar pelo link abaixo.'}</p>
      {link && <><p className="note"><b>Guarde este link:</b> ele é o único jeito de acompanhar o andamento e enviar correções. Não o compartilhe com quem não faz parte da equipe.</p>
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link de acompanhamento" />
        <div className="row" style={{ marginTop: 10 }}><button className="btn gold" onClick={() => navigator.clipboard?.writeText(link)}>Copiar link</button><a className="btn" href={link}>Abrir agora</a></div></>}
    </section>;
  }
  if (loading) return <section className="panel"><p className="mut"><span className="spin" aria-hidden /> Carregando inscrição…</p></section>;
  if (!editing && info && !info.open) return <section className="panel"><div className="ph"><h2>Inscrições encerradas</h2></div><p className="note">No momento a organização não está recebendo novas inscrições.</p></section>;
  if (editing && err && !f.team.name) return <section className="panel"><p className="err">{err}</p></section>;

  const P = ({ k, i, label, req }) => {
    const p = f[k][i]; const upd = (key, v) => set((n) => { n[k][i][key] = v; });
    return <div className="pform">
      <b>{label}</b>
      <label className="f"><span>Nickname{req && ' *'}</span><input value={p.nick} maxLength={30} onChange={(e) => upd('nick', e.target.value)} autoComplete="off" /></label>
      <label className="f"><span>Riot ID * (Nome#TAG)</span><input value={p.riotId} maxLength={40} placeholder="Jogador#BR1" onChange={(e) => upd('riotId', e.target.value)} autoComplete="off" autoCapitalize="none" /></label>
      <label className="f"><span>Rota{k === 'players' && ' *'}</span><select value={p.lane} onChange={(e) => upd('lane', e.target.value)}><option value="">—</option>{LANES.map((l) => <option key={l}>{l}</option>)}</select></label>
    </div>;
  };
  return (
    <form onSubmit={submit} noValidate>
      {editing && <section className="panel"><p className="kicker">Situação: {status}</p>{corr && <p className="err" style={{ fontSize: 15 }}><b>Correção solicitada:</b> {corr}</p>}</section>}
      {info && !editing && <section className="panel"><p>Vagas preenchidas: <b>{info.filled}/{info.total}</b>{info.free === 0 && ' — todas as vagas estão ocupadas; novas inscrições entram em lista de espera, sujeita à decisão da organização.'}</p></section>}
      <section className="panel"><div className="ph"><h2>Equipe</h2></div>
        <div className="fgrid">
          <label className="f"><span>Nome da equipe *</span><input value={f.team.name} maxLength={40} onChange={(e) => set((n) => { n.team.name = e.target.value; })} /></label>
          <label className="f"><span>Sigla (até 4 letras)</span><input value={f.team.tag} maxLength={4} onChange={(e) => set((n) => { n.team.tag = e.target.value.toUpperCase(); })} /></label>
          <div className="f"><span>Logo da equipe (JPG, PNG, WEBP ou GIF)</span><div className="row" style={{ alignItems: 'center' }}>{f.team.logo && <img className="logo" src={'/api/img/' + f.team.logo} alt="Logo enviada" style={{ width: 56, height: 56 }} />}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickLogo} disabled={up} aria-label="Enviar logo" />{up && <span className="mut">Enviando…</span>}</div></div>
        </div>
      </section>
      <section className="panel"><div className="ph"><h2>Representante</h2></div>
        <div className="fgrid">
          <label className="f"><span>Nome *</span><input value={f.rep.name} maxLength={60} onChange={(e) => set((n) => { n.rep.name = e.target.value; })} /></label>
          <label className="f"><span>Contato (Discord ou WhatsApp) *</span><input value={f.rep.contact} maxLength={80} onChange={(e) => set((n) => { n.rep.contact = e.target.value; })} /></label>
          <label className="f"><span>E-mail</span><input type="email" value={f.rep.email} maxLength={120} onChange={(e) => set((n) => { n.rep.email = e.target.value; })} /></label>
        </div>
      </section>
      <section className="panel"><div className="ph"><h2>Jogadores titulares (5)</h2></div>{f.players.map((_, i) => <P key={i} k="players" i={i} label={`Titular ${i + 1}`} req />)}</section>
      <section className="panel"><div className="ph"><h2>Reservas (opcional, até 3)</h2></div>
        {f.reserves.map((_, i) => <div key={i}><P k="reserves" i={i} label={`Reserva ${i + 1}`} req /><button type="button" className="btn danger sm" onClick={() => set((n) => { n.reserves.splice(i, 1); })}>Remover reserva</button></div>)}
        {f.reserves.length < 3 && <button type="button" className="btn" onClick={() => set((n) => { n.reserves.push({ nick: '', riotId: '', lane: '' }); })}>Adicionar reserva</button>}
        <label className="f" style={{ marginTop: 14 }}><span>Capitão (opcional)</span><select value={f.captain} onChange={(e) => set((n) => { n.captain = e.target.value; })}><option value="">—</option>{nicks.map((n) => <option key={n}>{n}</option>)}</select></label>
      </section>
      <section className="panel">
        <label className="chk"><input type="checkbox" checked={f.availability} onChange={(e) => set((n) => { n.availability = e.target.checked; })} /><span>Confirmo que a equipe tem disponibilidade para participar nas datas divulgadas. *</span></label>
        <label className="chk"><input type="checkbox" checked={f.rulesAccepted} onChange={(e) => set((n) => { n.rulesAccepted = e.target.checked; })} /><span>Li e aceito o <a href="/#regras" target="_blank" rel="noopener noreferrer">regulamento</a> do torneio. *</span></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn gold" disabled={busy || up} style={{ marginTop: 12 }}>{busy ? 'Enviando…' : editing ? 'Enviar correção' : 'Enviar inscrição'}</button>
      </section>
    </form>
  );
}
