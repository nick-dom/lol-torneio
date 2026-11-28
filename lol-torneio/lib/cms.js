// Coleções de conteúdo (narradores, transmissões, notícias, VODs, premiações).
// Toda validação acontece aqui, no servidor: o navegador nunca é confiável.
import crypto from 'crypto';
import { ID_RE } from './media';
import { parseLive } from './embed';
import { LOCAL_RE } from './tz';
import { hall, hset, hget, hdel } from './kv';
import { delImg } from './store';

export class Bad extends Error { constructor(m, code = 400) { super(m); this.code = code; } }
export const rid = () => crypto.randomBytes(6).toString('hex');
export const nowIso = () => new Date().toISOString();
const s = (v, n) => String(v ?? '').trim().slice(0, n);
const req = (v, n, label) => { const x = s(v, n); if (!x) throw new Bad(`Preencha o campo: ${label}.`); return x; };
const img = (v) => { const x = s(v, 20); if (!x) return ''; if (!ID_RE.test(x)) throw new Bad('Imagem inválida: envie novamente.'); return x; };
export function httpsUrl(v, label, { required = false } = {}) {
  const x = s(v, 500);
  if (!x) { if (required) throw new Bad(`Informe o link: ${label}.`); return ''; }
  try { const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(x) ? x : 'https://' + x); if (u.protocol === 'http:') u.protocol = 'https:'; if (u.protocol === 'https:') return u.href; } catch {}
  throw new Bad(`Link inválido em ${label}. Use um endereço https://…`);
}
const pick = (v, list, label) => { if (!list.includes(v)) throw new Bad(`Valor inválido em ${label}.`); return v; };
const day = (v, label) => { const x = s(v, 10); if (!x) return ''; if (!/^\d{4}-\d\d-\d\d$/.test(x) || isNaN(Date.parse(x))) throw new Bad(`Data inválida em ${label}.`); return x; };

export { CREW_ROLES, BC_STATUS, AWARD_CATS } from './consts';
import { CREW_ROLES, BC_STATUS, AWARD_CATS } from './consts';

export function slugify(t) {
  return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'noticia';
}

const matchesOf = (live) => new Map(live.matches.map((m) => [m.id, m]));

const cleaners = {
  narradores(b, old) {
    const social = {};
    for (const k of ['twitch', 'youtube', 'x', 'instagram']) social[k] = httpsUrl(b.social?.[k], 'rede social ' + k);
    return {
      name: req(b.name, 60, 'Nome'), photo: img(b.photo), bio: s(b.bio, 500),
      role: pick(b.role, Object.keys(CREW_ROLES), 'Função'), social, profile: httpsUrl(b.profile, 'perfil'),
      available: b.available !== false, availNote: s(b.availNote, 120),
    };
  },
  transmissoes(b, old, ctx) {
    const M = matchesOf(ctx.live), matchId = s(b.matchId, 20);
    if (matchId && !M.has(matchId)) throw new Bad('A partida escolhida não existe.');
    const date = s(b.date || (matchId && M.get(matchId).time) || '', 16);
    if (!LOCAL_RE.test(date)) throw new Bad('Defina data e horário da transmissão.');
    const crew = [...new Set((Array.isArray(b.crew) ? b.crew : []).map((x) => s(x, 20)))].slice(0, 12);
    for (const c of crew) if (!ctx.crewIds.has(c)) throw new Bad('Um dos integrantes escolhidos não existe mais.');
    const url = httpsUrl(b.url, 'transmissão');
    if (url && !parseLive(url, 'localhost')) throw new Bad('Link de transmissão não reconhecido.');
    const host = url ? new URL(url).hostname : '';
    const platform = /twitch\.tv$/.test(host) ? 'twitch' : /(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(host) ? 'youtube' : url ? 'outra' : '';
    return {
      title: s(b.title, 120) || 'Transmissão', matchId, date, platform, url, channel: s(b.channel, 80),
      crew, status: pick(b.status || 'agendada', Object.keys(BC_STATUS), 'Status'), notes: s(b.notes, 500), seasonId: ctx.live.config.seasonId,
    };
  },
  noticias(b, old, ctx) {
    const status = pick(b.status || 'draft', ['draft', 'published'], 'Status');
    let publishedAt = s(b.publishedAt, 30);
    if (publishedAt && isNaN(Date.parse(publishedAt))) throw new Bad('Data de publicação inválida.');
    if (publishedAt) publishedAt = new Date(publishedAt).toISOString();
    if (status === 'published' && !publishedAt) publishedAt = old?.publishedAt || nowIso();
    if (status === 'draft') publishedAt = publishedAt || '';
    const title = req(b.title, 140, 'Título');
    const content = s(b.content, 30000);
    if (status === 'published' && !content) throw new Bad('Escreva o conteúdo antes de publicar.');
    let slug = old?.slug;
    if (!slug || (old && old.title !== title && old.status !== 'published')) {
      const base = slugify(title); slug = base;
      for (let i = 2; ctx.all.some((x) => x.slug === slug && x.id !== old?.id); i++) slug = `${base}-${i}`;
    }
    const tags = [...new Set((Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',')).map((t) => s(t, 24).toLowerCase()).filter(Boolean))].slice(0, 8);
    return { slug, title, subtitle: s(b.subtitle, 220), cover: img(b.cover), content, author: s(b.author, 60) || ctx.author || 'Organização', status, publishedAt, category: s(b.category, 40), tags, featured: b.featured === true };
  },
  vods(b, old, ctx) {
    const kind = pick(b.kind || 'vod', ['vod', 'highlight'], 'Tipo'), matchId = s(b.matchId, 20), M = matchesOf(ctx.live);
    if (matchId) { const m = M.get(matchId); if (!m) throw new Bad('A partida escolhida não existe.'); if (kind === 'vod' && (m.sa == null || m.sb == null)) throw new Bad('Só é possível vincular um VOD a uma partida finalizada (com placar registrado).'); }
    else if (kind === 'vod') throw new Bad('Vincule o VOD à partida correspondente.');
    const url = httpsUrl(b.url, 'vídeo', { required: true });
    if (!parseLive(url, 'localhost')) throw new Bad('Link de vídeo não reconhecido.');
    return { kind, title: req(b.title, 120, 'Título'), description: s(b.description, 500), matchId, platform: s(b.platform, 30) || (/youtu/.test(url) ? 'YouTube' : /twitch/.test(url) ? 'Twitch' : 'Outra'), url, preview: img(b.preview), date: day(b.date, 'data') || nowIso().slice(0, 10), seasonId: ctx.live.config.seasonId };
  },
  async premiacoes(b, old, ctx) {
    const seasonId = s(b.seasonId, 20) || ctx.live.config.seasonId;
    const data = await ctx.seasonData(seasonId);
    if (!data) throw new Bad('Temporada inexistente.');
    const winnerType = pick(b.winnerType || 'none', ['team', 'player', 'none'], 'Tipo de vencedor');
    const winnerTeam = s(b.winnerTeam, 40), winnerPlayer = s(b.winnerPlayer, 30);
    if (winnerType !== 'none') {
      const t = data.teams.find((x) => x.id === winnerTeam);
      if (!t) throw new Bad('Escolha uma equipe vencedora desta temporada.');
      if (winnerType === 'player' && ![...t.players, ...t.reserves].includes(winnerPlayer)) throw new Bad('O jogador escolhido não pertence à equipe nesta temporada.');
    }
    return {
      name: req(b.name, 100, 'Nome da premiação'), description: s(b.description, 500), seasonId, category: s(b.category, 40) || 'Outro',
      winnerType, winnerTeam: winnerType === 'none' ? '' : winnerTeam, winnerPlayer: winnerType === 'player' ? winnerPlayer : '', winnerLabel: s(b.winnerLabel, 80),
      image: img(b.image), date: day(b.date, 'data de entrega'),
    };
  },
};

const live = (x) => x;
export const COLS = {
  narradores: { key: 'lol-crew', sec: 'narradores', pub: live },
  transmissoes: { key: 'lol-bcast', sec: 'transmissoes', pub: live },
  noticias: { key: 'lol-news', sec: 'noticias', pub: (x) => (x.status === 'published' && x.publishedAt && Date.parse(x.publishedAt) <= Date.now() ? x : null) },
  vods: { key: 'lol-vods', sec: 'vods', pub: live },
  premiacoes: { key: 'lol-awards', sec: 'premiacoes', pub: live },
};

// Imagens trocadas ou removidas não ficam órfãs no Redis
const IMG_FIELDS = ['cover', 'photo', 'preview', 'image'];
const dropImgs = (old, item) => Promise.all(IMG_FIELDS.filter((f) => old?.[f] && old[f] !== item?.[f]).map((f) => delImg(old[f])));

export async function list(col) { return (await hall(COLS[col].key)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); }
export async function listPub(col) { const f = COLS[col].pub; return (await list(col)).map(f).filter(Boolean); }

// Contexto de validação (carrega só o necessário)
export async function makeCtx(col, extra = {}) {
  const { load } = await import('./store');
  const { getSeasonData } = await import('./seasons');
  const live = await load(true);
  const ctx = { live, author: extra.author, seasonData: (id) => getSeasonData(id, live) };
  if (col === 'noticias') ctx.all = await list('noticias');
  if (col === 'transmissoes') ctx.crewIds = new Set((await list('narradores')).map((x) => x.id));
  return ctx;
}

export async function save(col, body, session) {
  const C = COLS[col]; if (!C) throw new Bad('Coleção inexistente.', 404);
  const old = body.id ? await hget(C.key, String(body.id)) : null;
  if (body.id && !old) throw new Bad('Item não encontrado.', 404);
  const ctx = await makeCtx(col, { author: session?.n });
  const clean = await cleaners[col](body, old, ctx);
  const item = { ...clean, id: old?.id || rid(), createdAt: old?.createdAt || nowIso(), updatedAt: nowIso() };
  await hset(C.key, item.id, item);
  if (old) await dropImgs(old, item);
  return { item, old };
}
export async function remove(col, id) {
  const C = COLS[col]; if (!C) throw new Bad('Coleção inexistente.', 404);
  const old = await hget(C.key, String(id)); if (!old) throw new Bad('Item não encontrado.', 404);
  await hdel(C.key, old.id); await dropImgs(old, null); return old;
}
