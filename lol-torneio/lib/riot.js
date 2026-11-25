// Acesso à Riot API (somente servidor). Chave em RIOT_API_KEY; sem ela, nada é consultado.
import { RIOT_ID, MATCH_ID, parseRank } from './riotmap';
const PLATFORM = (process.env.RIOT_PLATFORM || 'br1').toLowerCase();   // liga, elo
const REGION = (process.env.RIOT_REGION || 'americas').toLowerCase();  // conta, partidas
export const configured = () => !!process.env.RIOT_API_KEY;

async function call(host, path) {
  if (!configured()) throw new Error('RIOT_API_KEY não configurada.');
  let r;
  try { r = await fetch(`https://${host}.api.riotgames.com${path}`, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY }, cache: 'no-store', signal: AbortSignal.timeout(8000) }); }
  catch { throw new Error('Não foi possível falar com a Riot (rede ou tempo esgotado).'); }
  if (r.ok) return r.json();
  const msg = { 400: 'Pedido inválido.', 401: 'Chave da Riot ausente ou inválida.', 403: 'Chave da Riot sem permissão ou expirada (chaves de desenvolvimento duram 24 h).', 404: 'Não encontrado na Riot.', 429: 'Limite de consultas da Riot atingido. Aguarde um minuto.' }[r.status] || `Erro ${r.status} da Riot.`;
  throw new Error(msg);
}

export async function rankByRiotId(riotId) {
  const m = String(riotId || '').match(RIOT_ID);
  if (!m) throw new Error('Riot ID inválido. Use o formato Nome#TAG.');
  const acc = await call(REGION, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(m[1])}/${encodeURIComponent(m[2])}`);
  const entries = await call(PLATFORM, `/lol/league/v4/entries/by-puuid/${encodeURIComponent(acc.puuid)}`);
  return { ...parseRank(entries), at: new Date().toISOString() };
}

// Nomes de campeões (Data Dragon), em cache de 6 h: id numérico e id interno -> nome
const g = globalThis;
export async function champNames() {
  if (g.__champs && Date.now() - g.__champs.t < 216e5) return g.__champs.v;
  const vs = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json', { signal: AbortSignal.timeout(8000) })).json();
  const data = (await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${vs[0]}/data/pt_BR/champion.json`, { signal: AbortSignal.timeout(8000) })).json()).data;
  const v = {};
  for (const c of Object.values(data)) { v[c.key] = c.name; v[c.id] = c.name; }
  g.__champs = { t: Date.now(), v };
  return v;
}
export async function fetchMatch(id) {
  if (!MATCH_ID.test(id)) throw new Error('ID de partida inválido. Exemplo: BR1_1234567890.');
  return call(REGION, `/lol/match/v5/matches/${encodeURIComponent(id)}`);
}
