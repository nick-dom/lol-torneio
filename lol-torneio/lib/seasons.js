// Temporadas: a temporada ATIVA vive no documento principal (como sempre foi).
// Ao ENCERRAR, uma cópia imutável é gravada em 'lol-season:<id>'. Criar uma nova temporada só é permitido
// depois dessa cópia existir e ser relida com sucesso, então nada anterior é apagado ou sobrescrito.
import { hall, hget, hset, getJ, setJ } from './kv';
import { load, save } from './store';
import { SEED } from './seed';
import { bracket } from './logic';
import { Bad, nowIso } from './cms';

const IDX = 'lol-seasons', SNAP = (id) => 'lol-season:' + id;
const ID = /^s\d{1,4}$/;
const s = (v, n) => String(v ?? '').trim().slice(0, n);
const dayOf = (v, label) => { const x = s(v, 10); if (!x) return ''; if (!/^\d{4}-\d\d-\d\d$/.test(x) || isNaN(Date.parse(x))) throw new Bad(`Data inválida em ${label}.`); return x; };

export async function ensureCurrent(live) {
  const id = live.config.seasonId, m = await hget(IDX, id);
  if (m) return m;
  const meta = { id, number: Number(id.slice(1)) || 1, name: 'Temporada ' + (Number(id.slice(1)) || 1), year: Number((live.config.startDate || '').slice(0, 4)) || new Date().getFullYear(), startDate: (live.config.startDate || '').slice(0, 10), endDate: '', status: 'ativa', rules: '', createdAt: nowIso(), corrections: [] };
  await hset(IDX, id, meta); return meta;
}
export async function listSeasons(live) {
  live ||= await load(true); await ensureCurrent(live);
  return (await hall(IDX)).sort((a, b) => b.number - a.number);
}
export async function getMeta(id) { return ID.test(String(id)) ? hget(IDX, id) : null; }
// Dados completos de uma temporada (a ativa vem do documento principal; as demais, do arquivo imutável)
export async function getSeasonData(id, live) {
  live ||= await load(true);
  if (id === live.config.seasonId) return live;
  if (!ID.test(String(id))) return null;
  const snap = await getJ(SNAP(id)); return snap?.data || null;
}

export function seasonResult(d) {
  const B = bracket(d);
  return { champion: B.champion || '', vice: B.vice || '', third: B.third || '', standings: B.st.map((r) => ({ id: r.id, j: r.j, w: r.w, l: r.l, p: r.p, diff: r.diff })) };
}

export async function closeSeason(session, { force = false } = {}) {
  const live = await load(true), meta = await ensureCurrent(live);
  if (meta.status !== 'ativa') throw new Bad('Esta temporada já foi encerrada.', 409);
  const result = seasonResult(live);
  if (!result.champion && !force) throw new Bad('A final ainda não tem vencedor. Registre o resultado ou confirme o encerramento forçado.', 409);
  const data = structuredClone(live); data.config.stream = ''; delete data._persistent;
  await setJ(SNAP(meta.id), { data, closedAt: nowIso(), by: session.n });
  if (!(await getJ(SNAP(meta.id)))?.data?.teams) throw new Bad('Não foi possível confirmar a cópia da temporada. Nada foi alterado.', 500);
  const done = { ...meta, status: 'encerrada', endDate: new Date().toISOString().slice(0, 10), closedAt: nowIso(), result };
  await hset(IDX, meta.id, done); return done;
}

export async function newSeason(session, b) {
  const live = await load(true), cur = await ensureCurrent(live);
  if (cur.status === 'ativa') throw new Bad('Encerre a temporada atual antes de criar outra.', 409);
  if (!(await getJ(SNAP(cur.id)))?.data) throw new Bad('A cópia da temporada atual não foi encontrada. Nada foi alterado.', 500);
  const all = await listSeasons(live), number = Math.max(...all.map((x) => x.number)) + 1, id = 's' + number;
  const name = s(b.name, 80) || 'Temporada ' + number;
  const meta = { id, number, name, year: Number(b.year) || new Date().getFullYear(), startDate: dayOf(b.startDate, 'início'), endDate: '', status: 'ativa', rules: s(b.rules, 20000), createdAt: nowIso(), corrections: [] };
  const base = structuredClone(SEED);
  const fresh = {
    config: { ...live.config, seasonId: id, name: live.config.name, startDate: b.startDate ? dayOf(b.startDate, 'início') + 'T19:30' : '', stream: '', alert: '', news: [], rules: meta.rules || live.config.rules },
    teams: base.teams, matches: base.matches, games: {}, media: { items: live.media?.items || [], players: {} },
  };
  await save(fresh); await hset(IDX, id, meta); return meta;
}

export async function editMeta(id, b) {
  const m = await getMeta(id); if (!m) throw new Bad('Temporada não encontrada.', 404);
  const n = { ...m, name: s(b.name ?? m.name, 80) || m.name, year: Number(b.year) || m.year, startDate: b.startDate !== undefined ? dayOf(b.startDate, 'início') : m.startDate, endDate: b.endDate !== undefined ? dayOf(b.endDate, 'encerramento') : m.endDate };
  if (b.rules !== undefined) n.rules = s(b.rules, 20000);
  if (b.status !== undefined && b.status !== m.status) {
    if (m.status === 'ativa') throw new Bad('Encerre a temporada antes de arquivá-la.', 409);
    if (!['encerrada', 'arquivada'].includes(b.status)) throw new Bad('Status inválido.');
    n.status = b.status;
  }
  await hset(IDX, id, n); return n;
}

// Correção administrativa de placar em temporada encerrada: exige motivo e fica registrada
export async function correctMatch(id, b, session) {
  const m = await getMeta(id); if (!m) throw new Bad('Temporada não encontrada.', 404);
  if (m.status === 'ativa') throw new Bad('Temporada ativa: edite pelo painel principal.', 409);
  const reason = s(b.reason, 300); if (reason.length < 5) throw new Bad('Informe o motivo da correção.');
  const snap = await getJ(SNAP(id)); const mt = snap?.data?.matches?.find((x) => x.id === b.matchId);
  if (!mt) throw new Bad('Partida não encontrada nesta temporada.', 404);
  const sa = Number(b.sa), sb = Number(b.sb);
  if (!Number.isInteger(sa) || !Number.isInteger(sb) || sa < 0 || sb < 0 || sa > 5 || sb > 5) throw new Bad('Placar inválido.');
  const from = `${mt.sa ?? '–'}x${mt.sb ?? '–'}`; mt.sa = sa; mt.sb = sb;
  await setJ(SNAP(id), snap);
  const n = { ...m, result: seasonResult(snap.data), corrections: [...(m.corrections || []), { t: nowIso(), by: session.n, matchId: mt.id, from, to: `${sa}x${sb}`, reason }].slice(-100) };
  await hset(IDX, id, n); return n;
}
