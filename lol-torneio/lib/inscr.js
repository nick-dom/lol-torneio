// Inscrições de equipes: validação, duplicidade atômica, aprovação (cria a equipe oficial) e histórico.
import crypto from 'crypto';
import { hall, hget, hset, sadd, srem, getJ, setJ } from './kv';
import { load, save } from './store';
import { SEED } from './seed';
import { LANES, cleanProfile } from './players';
import { ID_RE } from './media';
import { Bad, rid, nowIso } from './cms';

const KEY = 'lol-inscr', CLAIMS = 'lol-inscr-claims', CFG = 'lol-inscr-cfg';
export const STATUS = { pendente: 'Pendente', em_analise: 'Em análise', aguardando_correcao: 'Aguardando correção', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };
export const N_TITULARES = 5, MAX_RESERVAS = 3;
const s = (v, n) => String(v ?? '').trim().slice(0, n);
const norm = (v) => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9#]+/g, '');
const sha = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const RIOT = /^.{3,16}#[A-Za-z0-9]{2,5}$/;

export const getCfg = async () => ({ open: true, deadline: '', ...(await getJ(CFG, {})) });
export async function setCfg(b) {
  const deadline = s(b.deadline, 16);
  if (deadline && !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(deadline)) throw new Bad('Prazo inválido.');
  const c = { open: b.open !== false, deadline }; await setJ(CFG, c); return c;
}
export async function isOpen() {
  const { epoch } = await import('./tz'); const c = await getCfg();
  return c.open && (!c.deadline || Date.now() <= (epoch(c.deadline) ?? Infinity));
}

export function clean(b) {
  const name = s(b.team?.name, 40); if (name.length < 3) throw new Bad('Informe o nome da equipe (mínimo 3 caracteres).');
  const tag = s(b.team?.tag, 4).toUpperCase() || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'EQP';
  const logo = s(b.team?.logo, 20); if (logo && !ID_RE.test(logo)) throw new Bad('Logo inválida: envie novamente.');
  const repName = s(b.rep?.name, 60), contact = s(b.rep?.contact, 80), email = s(b.rep?.email, 120);
  if (repName.length < 2) throw new Bad('Informe o nome do representante.');
  if (contact.length < 5) throw new Bad('Informe um contato do representante (Discord, WhatsApp ou e-mail).');
  if (email && !/^[^\s@]{1,64}@[^\s@]{1,120}\.[^\s@]{2,}$/.test(email)) throw new Bad('E-mail do representante inválido.');
  const pl = (arr, role) => (Array.isArray(arr) ? arr : []).map((p) => ({ nick: s(p?.nick, 30), riotId: s(p?.riotId, 40), lane: LANES.includes(p?.lane) ? p.lane : '', role }));
  const players = pl(b.players, 'titular'), reserves = pl(b.reserves, 'reserva').filter((p) => p.nick || p.riotId);
  if (players.length !== N_TITULARES) throw new Bad(`Cadastre exatamente ${N_TITULARES} jogadores titulares.`);
  if (reserves.length > MAX_RESERVAS) throw new Bad(`No máximo ${MAX_RESERVAS} reservas.`);
  const all = [...players, ...reserves], seenN = new Set(), seenR = new Set();
  all.forEach((p, i) => {
    const who = `${p.role === 'titular' ? 'Titular' : 'Reserva'} ${p.role === 'titular' ? i + 1 : i - N_TITULARES + 1}`;
    if (!p.nick) throw new Bad(`${who}: informe o nickname.`);
    if (!RIOT.test(p.riotId)) throw new Bad(`${who}: Riot ID inválido. Use o formato Nome#TAG.`);
    if (p.role === 'titular' && !p.lane) throw new Bad(`${who}: escolha a rota.`);
    if (seenN.has(norm(p.nick))) throw new Bad(`Nickname repetido na equipe: ${p.nick}.`);
    if (seenR.has(norm(p.riotId))) throw new Bad(`Riot ID repetido na equipe: ${p.riotId}.`);
    seenN.add(norm(p.nick)); seenR.add(norm(p.riotId));
  });
  const captain = s(b.captain, 30); if (captain && !all.some((p) => p.nick === captain)) throw new Bad('O capitão precisa ser um dos jogadores.');
  if (b.availability !== true) throw new Bad('Confirme a disponibilidade da equipe para participar.');
  if (b.rulesAccepted !== true) throw new Bad('É necessário aceitar o regulamento.');
  return { team: { name, tag, logo }, rep: { name: repName, contact, email }, players, reserves, captain, availability: true };
}
// Chaves por temporada: o mesmo jogador/nome pode se inscrever de novo numa temporada futura
const claimsOf = (x) => [...new Set([x.seasonId + ':team:' + norm(x.team.name), ...[...x.players, ...x.reserves].map((p) => x.seasonId + ':riot:' + norm(p.riotId))])];

// Reserva as chaves de duplicidade; se alguma já existe (de outra inscrição), desfaz e recusa
async function claim(next, prev = []) {
  const add = next.filter((k) => !prev.includes(k)), got = [];
  for (const k of add) {
    if (await sadd(CLAIMS, k)) got.push(k);
    else { for (const g of got) await srem(CLAIMS, g); throw new Bad(k.includes(':team:') ? 'Já existe uma inscrição ativa com este nome de equipe.' : 'Um dos Riot IDs informados já está inscrito em outra equipe.', 409); }
  }
  for (const k of prev.filter((k) => !next.includes(k))) await srem(CLAIMS, k);
}

export async function create(b, ip) {
  if (!(await isOpen())) throw new Bad('As inscrições estão encerradas.', 403);
  const c = clean(b), live = await load(true);
  const liveNames = new Set(live.teams.filter((t) => !/^Time [A-Z]$/.test(t.name) || t.reg || t.players.length).map((t) => norm(t.name)));
  if (liveNames.has(norm(c.team.name))) throw new Bad('Já existe uma equipe oficial com este nome.', 409);
  const keys = claimsOf({ ...c, seasonId: live.config.seasonId }); await claim(keys);
  const token = crypto.randomBytes(18).toString('hex'), t = nowIso();
  const x = { id: rid(), ...c, seasonId: live.config.seasonId, status: 'pendente', createdAt: t, updatedAt: t, tokenHash: sha(token), ipHash: sha((process.env.SESSION_SECRET || 'x') + ip), claims: keys, notes: [], correction: '', approvedTeamId: '', rulesAcceptedAt: t, history: [{ t, by: 'Equipe', action: 'inscrição enviada', to: 'pendente' }] };
  try { await hset(KEY, x.id, x); } catch (e) { await claim([], keys); throw e; }
  return { id: x.id, token };
}

const own = async (id, token) => { const x = id ? await hget(KEY, String(id)) : null; if (!x || !token || sha(token) !== x.tokenHash) throw new Bad('Inscrição não encontrada ou código inválido.', 404); return x; };
export async function ownerView(id, token) {
  const x = await own(id, token);
  return { id: x.id, status: x.status, statusLabel: STATUS[x.status], correction: x.status === 'aguardando_correcao' ? x.correction : '', data: { team: x.team, rep: x.rep, players: x.players, reserves: x.reserves, captain: x.captain } };
}
export async function ownerEdit(id, token, b) {
  const x = await own(id, token);
  if (!['aguardando_correcao', 'pendente'].includes(x.status)) throw new Bad('Esta inscrição não pode mais ser editada.', 409);
  const c = clean(b); const keys = claimsOf({ ...c, seasonId: x.seasonId }); await claim(keys, x.claims || []);
  const t = nowIso(), to = 'pendente';
  const n = { ...x, ...c, claims: keys, status: to, updatedAt: t, correction: '', history: [...x.history, { t, by: 'Equipe', action: x.status === 'aguardando_correcao' ? 'correção enviada' : 'dados atualizados', from: x.status, to }].slice(-100) };
  await hset(KEY, x.id, n); return { ok: true };
}

export const strip = (x) => { const { tokenHash, ipHash, claims, ...r } = x; return r; };
export async function listAll() { return (await hall(KEY)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(strip); }
export async function getOne(id) { const x = await hget(KEY, String(id)); return x ? strip(x) : null; }

export async function vagas(live) {
  live ||= await load();
  const filled = live.teams.filter((t) => t.reg || t.players.length || t.reserves.length).length;
  return { total: live.teams.length, filled, free: live.teams.length - filled };
}

const isFree = (t) => !t.reg && !t.players.length && !t.reserves.length && /^Time [A-Z]$/.test(t.name);
async function approve(x) {
  const live = await load(true);
  if (live.config.seasonId !== x.seasonId) throw new Bad('Esta inscrição é de outra temporada e não pode ser aprovada na temporada atual.', 409);
  let t = live.teams.find((q) => q.reg === x.id) || live.teams.find(isFree);
  if (!t) throw new Bad('Não há vagas livres: todas as equipes da temporada já estão preenchidas.', 409);
  t.name = x.team.name; t.tag = x.team.tag; t.logo = x.team.logo ? '/api/img/' + x.team.logo : (t.reg === x.id ? t.logo : '');
  t.rep = x.rep.name; t.captain = x.captain || ''; t.reg = x.id;
  t.players = x.players.map((p) => p.nick); t.reserves = x.reserves.map((p) => p.nick); t.profiles = {};
  for (const p of [...x.players, ...x.reserves]) t.profiles[p.nick] = cleanProfile({ riotId: p.riotId, lane: p.lane });
  await save(live); return t.id;
}
async function release(x) {
  const live = await load(true), t = live.teams.find((q) => q.reg === x.id); if (!t) return;
  const used = live.matches.some((m) => (m.a === t.id || m.b === t.id) && (m.sa != null || m.sb != null)) || live.matches.some((m) => (m.a === t.id || m.b === t.id) && (live.games?.[m.id] || []).length);
  if (used) throw new Bad('A equipe já tem resultados registrados e não pode ser removida da temporada. Corrija pelo painel principal.', 409);
  const base = SEED.teams.find((q) => q.id === t.id);
  Object.assign(t, { ...structuredClone(base), tb: t.tb, color: t.color }); delete t.reg;
  await save(live);
}

export async function act(id, b, session) {
  const x = await hget(KEY, String(id)); if (!x) throw new Bad('Inscrição não encontrada.', 404);
  const action = b.action, note = s(b.note, 600), t = nowIso(), by = session.n;
  const log = (a, to) => x.history.push({ t, by, action: a, from: x.status, to: to || x.status, ...(note ? { note } : {}) });
  const wasApproved = x.status === 'aprovada';
  if (action === 'nota') { if (!note) throw new Bad('Escreva a observação.'); x.notes.push({ t, by, text: note }); log('observação'); }
  else if (action === 'analise') { if (wasApproved) throw new Bad('Reabra a inscrição antes.', 409); log('movida para análise', 'em_analise'); x.status = 'em_analise'; }
  else if (action === 'correcao') {
    if (!note) throw new Bad('Descreva o que precisa ser corrigido.');
    if (wasApproved) await release(x);
    log('correção solicitada', 'aguardando_correcao'); x.status = 'aguardando_correcao'; x.correction = note; x.approvedTeamId = '';
  } else if (action === 'rejeitar') {
    if (wasApproved) await release(x);
    log('rejeitada', 'rejeitada'); x.status = 'rejeitada'; x.approvedTeamId = ''; await claim([], x.claims || []); x.claims = [];
  } else if (action === 'aprovar') {
    if (x.status === 'rejeitada') { const k = claimsOf(x); await claim(k); x.claims = k; }
    try { x.approvedTeamId = await approve(x); } catch (e) { if (x.status === 'rejeitada') await claim([], claimsOf(x)); throw e; }
    log('aprovada', 'aprovada'); x.status = 'aprovada'; x.correction = '';
  } else if (action === 'reabrir') {
    if (wasApproved) await release(x);
    if (x.status === 'rejeitada') { const k = claimsOf(x); await claim(k); x.claims = k; }
    log('reaberta', 'pendente'); x.status = 'pendente'; x.approvedTeamId = '';
  } else throw new Bad('Ação inválida.');
  x.updatedAt = t; await hset(KEY, x.id, x); return strip(x);
}
