'use client';
import { useEffect, useState } from 'react';
import { api, get, setIn, toLocalInput, fromLocalInput } from './api';
import { upload } from '@/lib/imgprep';
import { CREW_ROLES, BC_STATUS, AWARD_CATS } from '@/lib/consts';

const entries = (o) => Object.entries(o);
// Configuração de cada coleção: campos do formulário e como listar
export const CONFIG = {
  narradores: {
    label: 'Narradores e equipe', title: (x) => x.name, sub: (x) => `${CREW_ROLES[x.role]} · ${x.available ? 'disponível' : 'indisponível'}`,
    blank: () => ({ role: 'narrador', available: true, social: {} }),
    fields: [{ k: 'name', l: 'Nome', t: 'text', req: 1 }, { k: 'role', l: 'Função', t: 'select', opts: () => entries(CREW_ROLES) }, { k: 'photo', l: 'Foto', t: 'image' }, { k: 'bio', l: 'Descrição', t: 'area' },
      { k: 'social.twitch', l: 'Twitch', t: 'text' }, { k: 'social.youtube', l: 'YouTube', t: 'text' }, { k: 'social.x', l: 'X (Twitter)', t: 'text' }, { k: 'social.instagram', l: 'Instagram', t: 'text' }, { k: 'profile', l: 'Link de perfil', t: 'text' },
      { k: 'available', l: 'Disponível para transmissões', t: 'check' }, { k: 'availNote', l: 'Observação de disponibilidade', t: 'text' }],
  },
  transmissoes: {
    label: 'Transmissões', title: (x) => x.title, sub: (x) => `${x.date?.replace('T', ' ')} · ${BC_STATUS[x.status]}`,
    blank: () => ({ status: 'agendada', crew: [] }),
    fields: [{ k: 'title', l: 'Título', t: 'text' }, { k: 'matchId', l: 'Partida vinculada', t: 'select', opts: (c) => [['', '— nenhuma —'], ...c.matches] }, { k: 'date', l: 'Data e horário', t: 'datetime', req: 1 },
      { k: 'status', l: 'Status', t: 'select', opts: () => entries(BC_STATUS) }, { k: 'url', l: 'Link (Twitch, YouTube ou outra plataforma)', t: 'text' }, { k: 'channel', l: 'Canal de transmissão', t: 'text' },
      { k: 'crew', l: 'Narradores e comentaristas', t: 'multi', opts: (c) => c.crew }, { k: 'notes', l: 'Observações', t: 'area' }],
  },
  noticias: {
    label: 'Notícias', title: (x) => x.title, sub: (x) => `${x.status === 'published' ? 'Publicada' : 'Rascunho'}${x.featured ? ' · destaque' : ''} · /noticias/${x.slug}`,
    blank: () => ({ status: 'draft', tags: [] }),
    fields: [{ k: 'title', l: 'Título', t: 'text', req: 1 }, { k: 'subtitle', l: 'Subtítulo', t: 'text' }, { k: 'cover', l: 'Imagem de capa', t: 'image' },
      { k: 'content', l: 'Conteúdo', t: 'area', rows: 14, help: 'Formatação: # Título, ## Subtítulo, **negrito**, *itálico*, - lista, > citação, [texto](https://link), ![descrição](https://imagem)' },
      { k: 'author', l: 'Autor', t: 'text' }, { k: 'category', l: 'Categoria', t: 'text' }, { k: 'tags', l: 'Tags (separadas por vírgula)', t: 'tags' },
      { k: 'publishedAt', l: 'Data de publicação (vazio = agora)', t: 'datetimeiso' }, { k: 'status', l: 'Status', t: 'select', opts: () => [['draft', 'Rascunho'], ['published', 'Publicada']] }, { k: 'featured', l: 'Notícia em destaque', t: 'check' }],
  },
  vods: {
    label: 'VODs e melhores momentos', title: (x) => x.title, sub: (x) => `${x.kind === 'vod' ? 'VOD' : 'Melhores momentos'} · ${x.platform} · ${x.date}`,
    blank: () => ({ kind: 'vod' }),
    fields: [{ k: 'kind', l: 'Tipo', t: 'select', opts: () => [['vod', 'Partida gravada (VOD)'], ['highlight', 'Melhores momentos']] }, { k: 'title', l: 'Título', t: 'text', req: 1 }, { k: 'matchId', l: 'Partida (VOD exige partida finalizada)', t: 'select', opts: (c) => [['', '— nenhuma —'], ...c.matches] },
      { k: 'url', l: 'Link do vídeo (YouTube, Twitch ou outra plataforma)', t: 'text', req: 1 }, { k: 'preview', l: 'Imagem de prévia (opcional)', t: 'image' }, { k: 'description', l: 'Descrição', t: 'area' }, { k: 'date', l: 'Data', t: 'date' }],
  },
  premiacoes: {
    label: 'Premiações', title: (x) => x.name, sub: (x) => `${x.category} · ${x.seasonId} · ${x.winnerPlayer || x.winnerLabel || x.winnerTeam || 'sem vencedor'}`,
    blank: (c) => ({ category: AWARD_CATS[0], winnerType: 'none', seasonId: c.currentSeason }),
    fields: [{ k: 'name', l: 'Nome da premiação', t: 'text', req: 1 }, { k: 'category', l: 'Categoria', t: 'select', opts: () => AWARD_CATS.map((x) => [x, x]) }, { k: 'seasonId', l: 'Temporada', t: 'select', opts: (c) => c.seasons },
      { k: 'winnerType', l: 'Vencedor é…', t: 'select', opts: () => [['none', 'Ainda sem vencedor / texto livre'], ['team', 'Uma equipe'], ['player', 'Um jogador']] },
      { k: 'winnerTeam', l: 'Equipe vencedora', t: 'team', show: (x) => x.winnerType !== 'none' }, { k: 'winnerPlayer', l: 'Jogador vencedor', t: 'player', show: (x) => x.winnerType === 'player' },
      { k: 'winnerLabel', l: 'Texto livre (ex.: melhor jogada)', t: 'text' }, { k: 'image', l: 'Imagem ou troféu', t: 'image' }, { k: 'description', l: 'Descrição', t: 'area' }, { k: 'date', l: 'Data da entrega', t: 'date' }],
  },
};

function ImageField({ value, onChange, say }) {
  const [busy, setBusy] = useState(false);
  async function pick(e) { const f = e.target.files[0]; e.target.value = ''; if (!f) return; setBusy(true); try { onChange(await upload('/api/media', f, 1600)); } catch (x) { say(x.message || 'Falha no envio da imagem.', false); } finally { setBusy(false); } }
  return <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
    {value && <img src={'/api/img/' + value} alt="" style={{ width: 72, height: 72, objectFit: 'cover', border: '1px solid var(--line)' }} />}
    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} disabled={busy} style={{ maxWidth: 260 }} />
    {busy && <span className="mut">Enviando…</span>}{value && <button type="button" className="btn sm danger" onClick={() => onChange('')}>Remover</button>}
  </div>;
}

function Field({ f, form, set, ctx, say, teams }) {
  const v = get(form, f.k), on = (x) => set((o) => setIn(o, f.k, x));
  if (f.show && !f.show(form)) return null;
  let input;
  if (f.t === 'text') input = <input value={v ?? ''} onChange={(e) => on(e.target.value)} />;
  else if (f.t === 'area') input = <textarea rows={f.rows || 3} value={v ?? ''} onChange={(e) => on(e.target.value)} />;
  else if (f.t === 'date') input = <input type="date" value={v ?? ''} onChange={(e) => on(e.target.value)} />;
  else if (f.t === 'datetime') input = <input type="datetime-local" value={v ?? ''} onChange={(e) => on(e.target.value)} />;
  else if (f.t === 'datetimeiso') input = <input type="datetime-local" value={toLocalInput(v)} onChange={(e) => on(fromLocalInput(e.target.value))} />;
  else if (f.t === 'select') input = <select value={v ?? ''} onChange={(e) => on(e.target.value)}>{f.opts(ctx).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
  else if (f.t === 'check') return <label className="chk"><input type="checkbox" checked={!!v} onChange={(e) => on(e.target.checked)} /><span>{f.l}</span></label>;
  else if (f.t === 'tags') input = <input value={Array.isArray(v) ? v.join(', ') : v ?? ''} onChange={(e) => on(e.target.value)} />;
  else if (f.t === 'image') input = <ImageField value={v} onChange={on} say={say} />;
  else if (f.t === 'multi') input = <div className="chips">{f.opts(ctx).length ? f.opts(ctx).map(([k, l]) => { const a = v || [], onx = a.includes(k); return <button type="button" key={k} className={onx ? 'on' : ''} onClick={() => on(onx ? a.filter((x) => x !== k) : [...a, k])}>{l}</button>; }) : <span className="mut">Cadastre integrantes primeiro.</span>}</div>;
  else if (f.t === 'team') input = <select value={v ?? ''} onChange={(e) => { on(e.target.value); set((o) => { o.winnerPlayer = ''; }); }}><option value="">—</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>;
  else if (f.t === 'player') input = <select value={v ?? ''} onChange={(e) => on(e.target.value)}><option value="">—</option>{(teams.find((t) => t.id === form.winnerTeam)?.players || []).map((p) => <option key={p}>{p}</option>)}</select>;
  return <label className="f"><span>{f.l}{f.req ? ' *' : ''}</span>{input}{f.help && <small className="mut">{f.help}</small>}</label>;
}

export default function Crud({ col, ctx, say }) {
  const C = CONFIG[col], [items, setItems] = useState(null), [form, setForm] = useState(null), [busy, setBusy] = useState(false), [teams, setTeams] = useState([]);
  const load = async () => { const r = await api('/api/adm/' + col); if (r.ok) setItems(r.data); else say(r.error, false); };
  useEffect(() => { setForm(null); setItems(null); load(); }, [col]);
  const sid = form?.seasonId;
  useEffect(() => { if (col === 'premiacoes' && sid) api('/api/adm/temporadas?teams=' + encodeURIComponent(sid)).then((r) => setTeams(r.ok ? r.data : [])); }, [col, sid]);
  const set = (fn) => setForm((p) => { const n = structuredClone(p); fn(n); return n; });
  async function save(e) {
    e.preventDefault(); setBusy(true);
    const body = structuredClone(form); if (typeof body.tags === 'string') body.tags = body.tags.split(',');
    const r = await api('/api/adm/' + col, 'POST', body); setBusy(false);
    if (!r.ok) return say(r.error, false);
    say(col === 'noticias' && r.data.item.status === 'draft' ? 'Rascunho salvo.' : 'Salvo com sucesso.' + (r.data.push?.sent != null ? ` Notificação enviada a ${r.data.push.sent} dispositivo(s).` : ''), true);
    setForm(null); load();
  }
  async function del(x) { if (!confirm(`Excluir “${C.title(x)}”? Esta ação não pode ser desfeita.`)) return; const r = await api(`/api/adm/${col}?id=${x.id}`, 'DELETE'); if (!r.ok) return say(r.error, false); say('Excluído.', true); load(); }
  if (form) return (
    <form className="panel" onSubmit={save}>
      <div className="ph"><h2>{form.id ? 'Editar' : 'Novo'} — {C.label}</h2></div>
      <div className="fgrid">{C.fields.map((f) => <Field key={f.k} f={f} form={form} set={set} ctx={ctx} say={say} teams={teams} />)}</div>
      <div className="row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn gold" disabled={busy}>{busy ? 'Salvando…' : col === 'noticias' && form.status === 'published' ? 'Salvar e publicar' : 'Salvar'}</button>
        <button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button>
      </div>
    </form>
  );
  return (
    <div className="panel"><div className="ph"><h2>{C.label}</h2><button className="btn gold" onClick={() => setForm(C.blank(ctx))}>Novo</button></div>
      {items === null ? <p className="mut"><span className="spin" aria-hidden /> Carregando…</p> : !items.length ? <p className="note">Nada cadastrado ainda.</p> : items.map((x) => (
        <div key={x.id} className="arow"><div><b>{C.title(x)}</b><small className="mut">{C.sub(x)}</small></div>
          <div className="row" style={{ flexWrap: 'wrap' }}>{col === 'noticias' && x.status === 'published' && <a className="btn sm" href={'/noticias/' + x.slug} target="_blank" rel="noopener noreferrer">Ver</a>}<button className="btn sm" onClick={() => setForm(structuredClone(x))}>Editar</button><button className="btn sm danger" onClick={() => del(x)}>Excluir</button></div></div>))}
    </div>
  );
}
