// Votação popular de MVP. Voto único por navegador (cookie assinado pelo servidor) + limite por IP.
// O período é conferido SEMPRE no servidor. Contagem por candidato só é pública depois de encerrada e publicada.
import crypto from 'crypto';
import { hall, hget, hset, hdel, sadd, srem, sismember, hincr, hcounts, incr, decr } from './kv';
import { load } from './store';
import { Bad, rid, nowIso } from './cms';
import { collect, rank } from './rank';
import { bracket } from './logic';
import { pk } from './media';

const POLLS = 'lol-polls', VOTES = (id) => 'lol-votes:' + id, VOTERS = (id) => 'lol-voters:' + id;
export const IP_LIMIT = 3; // pessoas diferentes atrás do mesmo IP (casa, escola, 4G com NAT)
const s = (v, n) => String(v ?? '').trim().slice(0, n);
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev-only';
const sha = (v) => crypto.createHash('sha256').update(secret() + '|' + v).digest('hex');
export const newVoterId = () => crypto.randomBytes(16).toString('hex');
export const VID_RE = /^[a-f0-9]{32}$/;
const iso = (v, label) => { const x = s(v, 30); if (!x) return ''; if (isNaN(Date.parse(x))) throw new Bad(`Data inválida em ${label}.`); return new Date(x).toISOString(); };

// 'open' só vale dentro da janela; fora dela o servidor trata como encerrada/ainda não aberta
export function effective(p, now = Date.now()) {
  if (p.status === 'open') {
    if (p.closesAt && now > Date.parse(p.closesAt)) return 'closed';
    if (p.opensAt && now < Date.parse(p.opensAt)) return 'scheduled';
  }
  return p.status;
}

export async function savePoll(b, session) {
  const live = await load(true), old = b.id ? await hget(POLLS, String(b.id)) : null;
  if (b.id && !old) throw new Bad('Votação não encontrada.', 404);
  if (old && old.status !== 'draft' && JSON.stringify(old.candidates.map((c) => c.id)) !== JSON.stringify((b.candidates || old.candidates).map((c) => (typeof c === 'string' ? c : c.id)))) throw new Bad('Não é possível alterar os candidatos depois que a votação foi iniciada.', 409);
  const title = s(b.title, 120); if (!title) throw new Bad('Informe o título da votação.');
  const roster = new Map(); for (const t of live.teams) for (const n of [...t.players, ...t.reserves]) roster.set(pk(t.id, n), { nick: n, teamId: t.id });
  const ids = [...new Set((Array.isArray(b.candidates) ? b.candidates : []).map((c) => (typeof c === 'string' ? c : c?.id)))];
  if (ids.length < 2) throw new Bad('Escolha pelo menos 2 jogadores elegíveis.');
  if (ids.length > 50) throw new Bad('No máximo 50 candidatos.');
  const candidates = ids.map((id) => { const r = roster.get(id); if (!r) throw new Bad('Um dos candidatos não está em nenhuma equipe da temporada atual.'); return { id, ...r }; });
  const opensAt = iso(b.opensAt, 'abertura'), closesAt = iso(b.closesAt, 'encerramento');
  if (opensAt && closesAt && Date.parse(closesAt) <= Date.parse(opensAt)) throw new Bad('O encerramento precisa ser depois da abertura.');
  const p = { id: old?.id || rid(), title, description: s(b.description, 500), seasonId: live.config.seasonId, status: old?.status || 'draft', opensAt, closesAt, candidates, resultPublished: old?.resultPublished || false, createdAt: old?.createdAt || nowIso(), updatedAt: nowIso() };
  await hset(POLLS, p.id, p); return p;
}
export async function control(id, action, session) {
  const p = await hget(POLLS, String(id)); if (!p) throw new Bad('Votação não encontrada.', 404);
  const eff = effective(p);
  if (action === 'iniciar') {
    if (eff === 'closed' && p.status === 'closed') throw new Bad('Votação encerrada não pode ser reaberta.', 409);
    if (p.closesAt && Date.now() > Date.parse(p.closesAt)) throw new Bad('O horário de encerramento já passou. Ajuste a data antes de iniciar.', 409);
    if (p.candidates.length < 2) throw new Bad('Cadastre pelo menos 2 candidatos.');
    p.status = 'open'; p.startedAt ||= nowIso();
  } else if (action === 'pausar') { if (eff !== 'open') throw new Bad('Só é possível pausar uma votação aberta.', 409); p.status = 'paused'; }
  else if (action === 'encerrar') { if (p.status === 'draft') throw new Bad('A votação ainda não foi iniciada.', 409); p.status = 'closed'; p.closedAt = nowIso(); }
  else if (action === 'publicar') { if (effective(p) !== 'closed') throw new Bad('Encerre a votação antes de publicar o resultado.', 409); p.resultPublished = true; }
  else if (action === 'ocultar') p.resultPublished = false;
  else throw new Bad('Ação inválida.');
  p.updatedAt = nowIso(); await hset(POLLS, p.id, p); return p;
}
export async function deletePoll(id) {
  const p = await hget(POLLS, String(id)); if (!p) throw new Bad('Votação não encontrada.', 404);
  if (p.status !== 'draft') throw new Bad('Só votações ainda não iniciadas podem ser excluídas (os votos são mantidos como registro).', 409);
  await hdel(POLLS, p.id);
}

export async function castVote(pollId, candId, vid, ip) {
  const p = await hget(POLLS, String(pollId)); if (!p) throw new Bad('Votação não encontrada.', 404);
  const eff = effective(p);
  if (eff === 'scheduled') throw new Bad('A votação ainda não começou.', 403);
  if (eff === 'closed') throw new Bad('A votação foi encerrada.', 403);
  if (eff !== 'open') throw new Bad('A votação não está aberta no momento.', 403);
  if (!p.candidates.some((c) => c.id === candId)) throw new Bad('Candidato inválido.');
  if (!VID_RE.test(vid || '')) throw new Bad('Identificação do navegador ausente. Ative os cookies e tente de novo.', 400);
  const vkey = sha(p.id + '|v|' + vid), ikey = 'ipv:' + p.id + ':' + sha(ip);
  if (!(await sadd(VOTERS(p.id), vkey))) throw new Bad('Você já votou nesta votação.', 409);
  try {
    if ((await incr(ikey)) > IP_LIMIT) { await decr(ikey); await srem(VOTERS(p.id), vkey); throw new Bad('Limite de votos deste endereço de rede atingido.', 429); }
    await hincr(VOTES(p.id), candId, 1);
  } catch (e) { if (!(e instanceof Bad)) { await srem(VOTERS(p.id), vkey).catch(() => {}); } throw e; }
  return { ok: true };
}
export async function hasVoted(pollId, vid) {
  if (!VID_RE.test(vid || '')) return false;
  return sismember(VOTERS(pollId), sha(pollId + '|v|' + vid));
}

export async function listPolls() { return (await hall(POLLS)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export async function counts(id) { return hcounts(VOTES(id)); }

// Visão pública: sem contagem por candidato enquanto a votação não estiver encerrada E publicada
export async function publicPoll(p, live, vid) {
  const eff = effective(p), c = await counts(p.id), total = Object.values(c).reduce((a, b) => a + b, 0);
  const B = bracket(live), C = collect(live, B), stat = new Map(C.players.map((x) => [x.team + '::' + x.nick, x]));
  const show = eff === 'closed' && p.resultPublished;
  const cand = p.candidates.map((x) => {
    const t = live.teams.find((q) => q.id === x.teamId), st = stat.get(x.id), pr = t?.profiles?.[x.nick] || {};
    return { id: x.id, nick: x.nick, teamName: t?.name || x.teamId, teamColor: t?.color, lane: pr.lane || '', photo: live.media?.players?.[x.id] || '', stats: st ? { j: st.j, k: st.k, d: st.d, a: st.a, kda: +((st.k + st.a) / Math.max(1, st.d)).toFixed(2) } : null, ...(show ? { votes: c[x.id] || 0 } : {}) };
  });
  if (show) cand.sort((a, b) => b.votes - a.votes);
  return { id: p.id, title: p.title, description: p.description, status: eff, opensAt: p.opensAt, closesAt: p.closesAt, totalVotes: total, resultPublished: show, voted: await hasVoted(p.id, vid), candidates: cand };
}
// MVP estatístico (separado da votação popular): melhor KDA com mínimo de jogos registrados
export function statMvp(live, min = 2) {
  const B = bracket(live), C = collect(live, B);
  return rank(C.players, 'kda', min).slice(0, 5).map((p) => ({ nick: p.nick, teamName: p.teamName, j: p.j, kda: +p.v.toFixed(2), k: p.k, d: p.d, a: p.a }));
}
