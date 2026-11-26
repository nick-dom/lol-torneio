'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, toLocalInput, fromLocalInput, fmtDT } from './api';
import { INSC_STATUS, PUSH_TYPES } from '@/lib/consts';

const Spin = () => <p className="mut"><span className="spin" aria-hidden /> Carregando…</p>;

// ───────── Inscrições ─────────
function pendencias(x) {
  const p = [];
  if (!x.team.logo) p.push('Sem logo da equipe');
  if (!x.rep.email) p.push('Representante sem e-mail');
  const lanes = x.players.map((q) => q.lane); if (new Set(lanes).size < lanes.length) p.push('Rotas repetidas entre os titulares');
  if (!x.captain) p.push('Capitão não informado');
  if (!x.reserves.length) p.push('Sem reservas');
  if (x.status === 'aguardando_correcao') p.push('Aguardando correção da equipe');
  return p;
}
function Insc({ x, act, busy }) {
  const [note, setNote] = useState('');
  const run = (action, needNote) => { if (needNote && !note.trim()) return alert('Escreva a observação/descrição antes.'); if (action === 'rejeitar' && !confirm('Rejeitar esta inscrição? A vaga e o nome ficam livres.')) return; act(x.id, action, note).then((ok) => ok && setNote('')); };
  const pend = pendencias(x);
  return (
    <div className="insc-d">
      <div className="kv"><div><small>Representante</small><b>{x.rep.name}</b></div><div><small>Contato</small><b>{x.rep.contact}</b></div><div><small>E-mail</small><b>{x.rep.email || '—'}</b></div><div><small>Sigla</small><b>{x.team.tag}</b></div><div><small>Enviada em</small><b>{fmtDT(x.createdAt)}</b></div><div><small>Aceite do regulamento</small><b>{fmtDT(x.rulesAcceptedAt)}</b></div></div>
      {x.team.logo && <p><img className="logo" src={'/api/img/' + x.team.logo} alt="Logo" style={{ width: 72, height: 72 }} /></p>}
      <div className="tscroll"><table className="tbl"><thead><tr><th>Função</th><th>Nickname</th><th>Riot ID</th><th>Rota</th></tr></thead><tbody>{[...x.players, ...x.reserves].map((p, i) => <tr key={i}><td>{p.role}{p.nick === x.captain ? ' (capitão)' : ''}</td><td>{p.nick}</td><td>{p.riotId}</td><td>{p.lane || '—'}</td></tr>)}</tbody></table></div>
      {pend.length > 0 && <div className="pend"><b>Pendências:</b> {pend.join(' · ')}</div>}
      {x.correction && <p className="note"><b>Correção pedida:</b> {x.correction}</p>}
      <label className="f" style={{ marginTop: 12 }}><span>Observação administrativa / motivo / pedido de correção</span><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="row" style={{ flexWrap: 'wrap', marginTop: 10 }}>
        <button className="btn sm" disabled={busy} onClick={() => run('analise')}>Em análise</button>
        <button className="btn gold sm" disabled={busy} onClick={() => run('aprovar')}>Aprovar</button>
        <button className="btn sm" disabled={busy} onClick={() => run('correcao', true)}>Solicitar correção</button>
        <button className="btn sm danger" disabled={busy} onClick={() => run('rejeitar')}>Rejeitar</button>
        <button className="btn sm" disabled={busy} onClick={() => run('nota', true)}>Só salvar observação</button>
        {['aprovada', 'rejeitada'].includes(x.status) && <button className="btn sm" disabled={busy} onClick={() => run('reabrir')}>Reabrir</button>}
      </div>
      {x.notes.length > 0 && <><h4 className="sh">Observações</h4>{x.notes.map((n, i) => <p key={i} className="news"><b>{n.by}</b> <small className="mut">{fmtDT(n.t)}</small><br />{n.text}</p>)}</>}
      <h4 className="sh">Histórico de alterações</h4>
      {[...x.history].reverse().map((h, i) => <p key={i} className="news"><small className="mut">{fmtDT(h.t)}</small> · <b>{h.by}</b> — {h.action}{h.from && h.to && h.from !== h.to ? ` (${INSC_STATUS[h.from]} → ${INSC_STATUS[h.to]})` : ''}{h.note ? `: ${h.note}` : ''}</p>)}
    </div>
  );
}
export function Inscricoes({ say }) {
  const [d, setD] = useState(null), [flt, setFlt] = useState(''), [q, setQ] = useState(''), [open, setOpen] = useState(''), [busy, setBusy] = useState(false);
  const load = async () => { const r = await api('/api/adm/inscricoes'); r.ok ? setD(r.data) : say(r.error, false); };
  useEffect(() => { load(); }, []);
  const act = async (id, action, note) => {
    setBusy(true); const r = await api('/api/adm/inscricoes', 'POST', { id, action, note }); setBusy(false);
    if (!r.ok) { say(r.error, false); return false; }
    say(action === 'aprovar' ? 'Aprovada: equipe criada/atualizada no site. Recarregue o painel principal antes de salvar nele.' : 'Atualizado.', true);
    setD((p) => ({ ...p, vagas: r.data.vagas, items: p.items.map((i) => (i.id === id ? r.data.item : i)) })); return true;
  };
  const items = useMemo(() => (d?.items || []).filter((x) => (!flt || x.status === flt) && (!q || (x.team.name + ' ' + x.rep.name).toLowerCase().includes(q.toLowerCase()))), [d, flt, q]);
  if (!d) return <Spin />;
  const cnt = (s) => d.items.filter((x) => x.status === s).length;
  async function cfg(patch) { const r = await api('/api/adm/inscricoes', 'PUT', { ...d.cfg, ...patch }); if (r.ok) { setD({ ...d, cfg: r.data }); say('Configuração salva.', true); } else say(r.error, false); }
  return (
    <div>
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="stats"><div><b>{d.vagas.filled}/{d.vagas.total}</b><small>vagas preenchidas</small></div>{Object.entries(INSC_STATUS).map(([k, l]) => <div key={k}><b>{cnt(k)}</b><small>{l}</small></div>)}</div>
        <div className="row" style={{ flexWrap: 'wrap', alignItems: 'end', marginTop: 12 }}>
          <label className="chk"><input type="checkbox" checked={d.cfg.open} onChange={(e) => cfg({ open: e.target.checked })} /><span>Inscrições abertas</span></label>
          <label className="f" style={{ maxWidth: 240 }}><span>Prazo final (opcional)</span><input type="datetime-local" defaultValue={d.cfg.deadline} onBlur={(e) => e.target.value !== d.cfg.deadline && cfg({ deadline: e.target.value })} /></label>
        </div>
      </div>
      <div className="panel">
        <div className="chips"><button className={!flt ? 'on' : ''} onClick={() => setFlt('')}>Todas ({d.items.length})</button>{Object.entries(INSC_STATUS).map(([k, l]) => <button key={k} className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>{l}</button>)}</div>
        <input placeholder="Buscar por equipe ou representante" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" style={{ marginBottom: 10 }} />
        {!items.length ? <p className="note">Nenhuma inscrição encontrada.</p> : items.map((x) => (
          <div key={x.id} className="insc"><button className="arow btnrow" onClick={() => setOpen(open === x.id ? '' : x.id)} aria-expanded={open === x.id}>
            <div><b>{x.team.name}</b><small className="mut">{x.rep.name} · {fmtDT(x.createdAt)}{pendencias(x).length ? ` · ${pendencias(x).length} pendência(s)` : ''}</small></div><span className={'st s-' + x.status}>{INSC_STATUS[x.status]}</span></button>
            {open === x.id && <Insc x={x} act={act} busy={busy} />}</div>))}
      </div>
    </div>
  );
}

// ───────── Votação ─────────
export function Votacao({ say }) {
  const [d, setD] = useState(null), [form, setForm] = useState(null), [busy, setBusy] = useState(false), [find, setFind] = useState('');
  const load = async () => { const r = await api('/api/adm/votacao'); r.ok ? setD(r.data) : say(r.error, false); };
  useEffect(() => { load(); }, []);
  async function ctl(p, action) {
    if (action === 'encerrar' && !confirm('Encerrar a votação? Não será possível reabri-la.')) return;
    const r = await api('/api/adm/votacao', 'PATCH', { id: p.id, action }); if (!r.ok) return say(r.error, false);
    say('Feito.' + (r.data.push?.sent != null ? ` Notificação enviada a ${r.data.push.sent} dispositivo(s).` : ''), true); load();
  }
  async function save(e) { e.preventDefault(); setBusy(true); const r = await api('/api/adm/votacao', 'POST', { ...form, opensAt: fromLocalInput(form.opensAtL), closesAt: fromLocalInput(form.closesAtL) }); setBusy(false); if (!r.ok) return say(r.error, false); say('Votação salva.', true); setForm(null); load(); }
  async function del(p) { if (!confirm('Excluir esta votação?')) return; const r = await api('/api/adm/votacao?id=' + p.id, 'DELETE'); r.ok ? (say('Excluída.', true), load()) : say(r.error, false); }
  if (!d) return <Spin />;
  if (form) {
    const sel = form.candidates || [], tog = (id) => setForm({ ...form, candidates: sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id] });
    const locked = form.id && form.status !== 'draft';
    return <form className="panel" onSubmit={save}><div className="ph"><h2>{form.id ? 'Editar' : 'Nova'} votação de MVP</h2></div>
      <div className="fgrid"><label className="f"><span>Título *</span><input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="f"><span>Abertura (opcional)</span><input type="datetime-local" value={form.opensAtL || ''} onChange={(e) => setForm({ ...form, opensAtL: e.target.value })} /></label>
        <label className="f"><span>Encerramento (opcional)</span><input type="datetime-local" value={form.closesAtL || ''} onChange={(e) => setForm({ ...form, closesAtL: e.target.value })} /></label></div>
      <label className="f" style={{ marginTop: 10 }}><span>Descrição</span><textarea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <h3 className="sh">Jogadores elegíveis ({sel.length} escolhidos){locked && ' — travado após o início'}</h3>
      <input placeholder="Filtrar jogador ou equipe" value={find} onChange={(e) => setFind(e.target.value)} style={{ marginBottom: 8 }} />
      <div className="chips">{d.players.filter((p) => !find || (p.nick + p.team).toLowerCase().includes(find.toLowerCase())).map((p) => <button type="button" key={p.id} disabled={locked} className={sel.includes(p.id) ? 'on' : ''} onClick={() => tog(p.id)}>{p.nick} <small>({p.team})</small></button>)}</div>
      {!d.players.length && <p className="note">Cadastre equipes e jogadores antes (aprove inscrições ou use o painel principal).</p>}
      <div className="row" style={{ marginTop: 14 }}><button className="btn gold" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button><button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button></div></form>;
  }
  const ST = { draft: 'Rascunho', open: 'Aberta', paused: 'Pausada', closed: 'Encerrada', scheduled: 'Agendada' };
  return <div className="panel"><div className="ph"><h2>Votações de MVP</h2><button className="btn gold" onClick={() => setForm({ candidates: [] })}>Nova votação</button></div>
    {!d.polls.length ? <p className="note">Nenhuma votação criada.</p> : d.polls.map((p) => { const nm = (id) => p.candidates.find((c) => c.id === id)?.nick || id; return (
      <div key={p.id} className="insc" style={{ padding: 10 }}>
        <div className="arow" style={{ border: 0, padding: 0 }}><div><b>{p.title}</b><small className="mut">{ST[p.effective]}{p.closesAt ? ' · encerra ' + fmtDT(p.closesAt) : ''} · {p.total} voto(s){p.resultPublished ? ' · resultado publicado' : ''}</small></div></div>
        <div className="tscroll"><table className="tbl"><tbody>{[...p.candidates].sort((a, b) => (p.counts[b.id] || 0) - (p.counts[a.id] || 0)).map((c) => <tr key={c.id}><td>{nm(c.id)}</td><td className="pts">{p.counts[c.id] || 0}</td><td>{p.total ? Math.round(((p.counts[c.id] || 0) / p.total) * 100) + '%' : '–'}</td></tr>)}</tbody></table></div>
        <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
          {['draft', 'paused', 'scheduled'].includes(p.effective) && p.status !== 'closed' && <button className="btn gold sm" onClick={() => ctl(p, 'iniciar')}>{p.status === 'draft' ? 'Iniciar' : 'Retomar'}</button>}
          {p.effective === 'open' && <button className="btn sm" onClick={() => ctl(p, 'pausar')}>Pausar</button>}
          {p.status !== 'draft' && p.effective !== 'closed' && <button className="btn sm danger" onClick={() => ctl(p, 'encerrar')}>Encerrar</button>}
          {p.effective === 'closed' && !p.resultPublished && <button className="btn gold sm" onClick={() => ctl(p, 'publicar')}>Publicar resultado</button>}
          {p.resultPublished && <button className="btn sm" onClick={() => ctl(p, 'ocultar')}>Ocultar resultado</button>}
          <button className="btn sm" onClick={() => setForm({ ...p, opensAtL: toLocalInput(p.opensAt), closesAtL: toLocalInput(p.closesAt), candidates: p.candidates.map((c) => c.id) })}>Editar</button>
          {p.status === 'draft' && <button className="btn sm danger" onClick={() => del(p)}>Excluir</button>}
        </div></div>); })}
  </div>;
}

// ───────── Temporadas ─────────
const SL = { ativa: 'Ativa', encerrada: 'Encerrada', arquivada: 'Arquivada' };
export function Temporadas({ say, onChange }) {
  const [list, setList] = useState(null), [nova, setNova] = useState(null), [fix, setFix] = useState(null), [busy, setBusy] = useState(false);
  const load = async () => { const r = await api('/api/adm/temporadas'); r.ok ? setList(r.data) : say(r.error, false); };
  useEffect(() => { load(); }, []);
  async function post(body, okMsg) { setBusy(true); const r = await api('/api/adm/temporadas', 'POST', body); setBusy(false); if (!r.ok) { say(r.error, false); return r; } say(okMsg, true); load(); onChange?.(); return r; }
  async function close(force) {
    if (!force && !confirm('Encerrar a temporada atual? Uma cópia permanente dos dados é gravada. Depois você poderá criar a próxima.')) return;
    const r = await post({ action: 'encerrar', force }, 'Temporada encerrada e preservada.');
    if (!r.ok && r.status === 409 && /final/i.test(r.error) && confirm(r.error + '\n\nEncerrar mesmo assim, sem campeão?')) close(true);
  }
  if (!list) return <Spin />;
  const cur = list.find((s) => s.status === 'ativa');
  return (
    <div>
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="ph"><h2>Temporadas</h2>{cur ? <button className="btn danger" disabled={busy} onClick={() => close(false)}>Encerrar {cur.name}</button> : <button className="btn gold" onClick={() => setNova({ year: new Date().getFullYear() })}>Nova temporada</button>}</div>
        <p className="note">Encerrar guarda uma cópia imutável de equipes, jogadores, partidas, estatísticas e classificação. A nova temporada começa vazia; nada anterior é apagado.</p>
        {nova && <form className="fgrid" onSubmit={async (e) => { e.preventDefault(); const r = await post({ action: 'nova', ...nova }, 'Nova temporada criada. Recarregue o painel principal.'); if (r.ok) setNova(null); }}>
          <label className="f"><span>Nome</span><input value={nova.name || ''} onChange={(e) => setNova({ ...nova, name: e.target.value })} placeholder="Copa Nexus II" /></label>
          <label className="f"><span>Ano</span><input type="number" value={nova.year} onChange={(e) => setNova({ ...nova, year: e.target.value })} /></label>
          <label className="f"><span>Data de início</span><input type="date" value={nova.startDate || ''} onChange={(e) => setNova({ ...nova, startDate: e.target.value })} /></label>
          <label className="f" style={{ gridColumn: '1/-1' }}><span>Regulamento da temporada (vazio = manter o atual)</span><textarea rows={3} value={nova.rules || ''} onChange={(e) => setNova({ ...nova, rules: e.target.value })} /></label>
          <div className="row"><button className="btn gold" disabled={busy}>Criar temporada</button><button type="button" className="btn" onClick={() => setNova(null)}>Cancelar</button></div></form>}
      </div>
      {list.map((s) => (
        <div key={s.id} className="panel" style={{ marginBottom: 12 }}>
          <div className="arow" style={{ border: 0, padding: 0 }}><div><b>{s.name}</b> <small className="mut">· {s.year} · {SL[s.status]}</small><small className="mut">{s.result?.champion ? 'Campeão registrado' : s.status === 'ativa' ? 'Em andamento' : 'Sem campeão'}{(s.corrections || []).length ? ` · ${s.corrections.length} correção(ões)` : ''}</small></div>
            <div className="row" style={{ flexWrap: 'wrap' }}>{s.status !== 'ativa' && <a className="btn sm" href={'/temporadas/' + s.id} target="_blank" rel="noopener noreferrer">Ver</a>}
              {s.status === 'encerrada' && <button className="btn sm" onClick={() => post({ action: 'editar', id: s.id, status: 'arquivada' }, 'Arquivada.')}>Arquivar</button>}
              {s.status === 'arquivada' && <button className="btn sm" onClick={() => post({ action: 'editar', id: s.id, status: 'encerrada' }, 'Reativada na lista.')}>Desarquivar</button>}
              {s.status !== 'ativa' && <button className="btn sm" onClick={() => setFix({ id: s.id, matchId: 'g1', sa: 0, sb: 0, reason: '' })}>Corrigir placar</button>}
              <button className="btn sm" onClick={() => { const n = prompt('Novo nome da temporada:', s.name); if (n && n.trim()) post({ action: 'editar', id: s.id, name: n }, 'Nome atualizado.'); }}>Renomear</button></div></div>
          {fix?.id === s.id && <form className="fgrid" style={{ marginTop: 12 }} onSubmit={async (e) => { e.preventDefault(); const r = await post({ action: 'corrigir', ...fix }, 'Correção registrada.'); if (r.ok) setFix(null); }}>
            <label className="f"><span>ID da partida (g1…g10, sf1, sf2, third, final)</span><input value={fix.matchId} onChange={(e) => setFix({ ...fix, matchId: e.target.value })} /></label>
            <label className="f"><span>Placar A</span><input type="number" min="0" max="5" value={fix.sa} onChange={(e) => setFix({ ...fix, sa: e.target.value })} /></label>
            <label className="f"><span>Placar B</span><input type="number" min="0" max="5" value={fix.sb} onChange={(e) => setFix({ ...fix, sb: e.target.value })} /></label>
            <label className="f" style={{ gridColumn: '1/-1' }}><span>Motivo da correção (obrigatório, fica registrado)</span><input value={fix.reason} onChange={(e) => setFix({ ...fix, reason: e.target.value })} /></label>
            <div className="row"><button className="btn gold" disabled={busy}>Registrar correção</button><button type="button" className="btn" onClick={() => setFix(null)}>Cancelar</button></div></form>}
          {(s.corrections || []).length > 0 && <div style={{ marginTop: 8 }}>{s.corrections.map((c, i) => <p key={i} className="news"><small className="mut">{fmtDT(c.t)}</small> · {c.by}: {c.matchId} {c.from} → {c.to} — {c.reason}</p>)}</div>}
        </div>))}
    </div>
  );
}

// ───────── Notificações ─────────
export function Push({ say }) {
  const [d, setD] = useState(null), [f, setF] = useState({ type: 'avisos', title: '', body: '', url: '/' }), [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/adm/push').then((r) => (r.ok ? setD(r.data) : say(r.error, false))); }, []);
  async function send(e) { e.preventDefault(); if (!confirm('Enviar esta notificação agora?')) return; setBusy(true); const r = await api('/api/adm/push', 'POST', f); setBusy(false); if (!r.ok) return say(r.error, false); say(`Enviada: ${r.data.sent} entregue(s), ${r.data.removed} inscrição(ões) inválida(s) removida(s), ${r.data.failed} falha(s).`, true); setF({ ...f, title: '', body: '' }); api('/api/adm/push').then((x) => x.ok && setD(x.data)); }
  if (!d) return <Spin />;
  return <div className="panel"><div className="ph"><h2>Notificações push</h2></div>
    {!d.configured && <p className="err">Push não configurado: defina NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT (veja o README). Nada será enviado enquanto isso.</p>}
    <div className="stats"><div><b>{d.total}</b><small>dispositivos inscritos</small></div>{Object.entries(d.types).map(([k, l]) => <div key={k}><b>{d.by[k]}</b><small>{l}</small></div>)}</div>
    <p className="note">Envio automático: nova partida/horário, resultado, notícia publicada, início/encerramento de votação e “partida prestes a começar” (via cron). Abaixo, envio manual.</p>
    <form className="fgrid" onSubmit={send}>
      <label className="f"><span>Tipo (quem recebe)</span><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(PUSH_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="f"><span>Título *</span><input maxLength={90} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <label className="f"><span>Mensagem</span><input maxLength={180} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
      <label className="f"><span>Abrir ao tocar (caminho do site)</span><input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></label>
      <div><button className="btn gold" disabled={busy || !d.configured}>{busy ? 'Enviando…' : 'Enviar notificação'}</button></div></form>
  </div>;
}
