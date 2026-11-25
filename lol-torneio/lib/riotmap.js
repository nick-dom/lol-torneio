// Conversão de respostas da Riot API (match-v5, league-v4) para o formato do torneio.
// Funções puras, sem rede: testáveis com respostas de exemplo.
const norm = (s) => String(s || '').trim().toLowerCase();
export const MATCH_ID = /^[A-Za-z0-9]{2,6}_\d{6,12}$/;
export const RIOT_ID = /^(.{3,16})#([A-Za-z0-9]{3,5})$/;

const ORDER = { TOP: 0, JUNGLE: 1, MIDDLE: 2, BOTTOM: 3, UTILITY: 4 };
const TIERS = { IRON: 'Ferro', BRONZE: 'Bronze', SILVER: 'Prata', GOLD: 'Ouro', PLATINUM: 'Platina', EMERALD: 'Esmeralda', DIAMOND: 'Diamante', MASTER: 'Mestre', GRANDMASTER: 'Grão-Mestre', CHALLENGER: 'Desafiante' };
const APEX = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);

// Elo da fila solo/duo a partir de league-v4 (entries by puuid)
export function parseRank(entries) {
  const e = (Array.isArray(entries) ? entries : []).find((x) => x.queueType === 'RANKED_SOLO_5x5');
  if (!e) return { elo: 'Sem classificação', wins: 0, losses: 0 };
  const tier = TIERS[e.tier] || e.tier;
  return { elo: `${tier}${APEX.has(e.tier) ? '' : ' ' + e.rank} · ${e.leaguePoints} PDL`, wins: e.wins | 0, losses: e.losses | 0 };
}

// rosters: { a: [{nick, riotId}], b: [{nick, riotId}] } ; names: { [championId numérico]: nome } e { [id interno]: nome }
export function mapMatch(json, rosters, names = {}) {
  const info = json?.info, warnings = [];
  if (!info || !Array.isArray(info.participants) || info.participants.length !== 10) throw new Error('Resposta da Riot sem os 10 participantes.');
  if (info.queueId !== 0 && info.gameMode !== 'CLASSIC') warnings.push('O modo de jogo não é Summoner\'s Rift clássico.');
  if (info.queueId !== 0) warnings.push('Esta partida não é personalizada (queueId ' + info.queueId + '). Confirme se é mesmo do torneio.');
  if ((info.gameDuration || 0) < 300) warnings.push('Partida com menos de 5 minutos (possível remake).');

  const idx = { a: new Map(), b: new Map() };
  for (const s of ['a', 'b']) for (const r of rosters?.[s] || []) if (r.riotId) idx[s].set(norm(r.riotId), r.nick);
  const full = (p) => `${p.riotIdGameName || ''}#${p.riotIdTagline || ''}`;

  // Descobre qual lado da Riot (100/200) é a equipe A, pelos Riot IDs cadastrados
  const score = { 100: { a: 0, b: 0 }, 200: { a: 0, b: 0 } };
  for (const p of info.participants) for (const s of ['a', 'b']) if (idx[s].has(norm(full(p)))) score[p.teamId][s]++;
  const aIs100 = score[100].a + score[200].b >= score[100].b + score[200].a;
  if (score[100].a + score[200].b === score[100].b + score[200].a) warnings.push('Não foi possível identificar qual equipe é qual (Riot IDs não cadastrados). Conferir os lados manualmente.');
  const sideOf = (teamId) => ((teamId === 100) === aIs100 ? 'a' : 'b');

  const champ = (p) => names[p.championId] || names[p.championName] || p.championName || '';
  const players = { a: [], b: [] };
  for (const p of [...info.participants].sort((x, y) => (ORDER[x.teamPosition] ?? 9) - (ORDER[y.teamPosition] ?? 9))) {
    const sd = sideOf(p.teamId), nick = idx[sd].get(norm(full(p)));
    if (!nick) warnings.push(`${full(p)} não está no elenco cadastrado da equipe ${sd === 'a' ? 'A' : 'B'}.`);
    players[sd].push({ nick: nick || p.riotIdGameName || '', champ: champ(p), pick: 0, k: p.kills | 0, d: p.deaths | 0, a: p.assists | 0, cs: (p.totalMinionsKilled | 0) + (p.neutralMinionsKilled | 0), gold: p.goldEarned | 0, dmg: p.totalDamageDealtToChampions | 0, vision: p.visionScore | 0, wards: p.wardsPlaced | 0 });
  }

  const g = { winner: '', dur: '', first: { blood: '', tower: '', dragon: '' }, bans: { a: [], b: [] }, obj: { a: {}, b: {} }, players, mvp: '' };
  const sec = info.gameDuration > 100000 ? Math.round(info.gameDuration / 1000) : info.gameDuration; // versões antigas devolviam ms
  g.dur = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const fb = info.participants.find((p) => p.firstBloodKill);
  if (fb) g.first.blood = sideOf(fb.teamId);
  for (const t of info.teams || []) {
    const sd = sideOf(t.teamId), o = t.objectives || {};
    if (t.win) g.winner = sd;
    // championId -1 = equipe sem ban naquele turno (não é erro)
    g.bans[sd] = [...(t.bans || [])].sort((x, y) => x.pickTurn - y.pickTurn).filter((b) => b.championId > 0).map((b) => names[b.championId] || '').slice(0, 5);
    g.obj[sd] = { towers: o.tower?.kills | 0, dragons: o.dragon?.kills | 0, heralds: o.riftHerald?.kills | 0, barons: o.baron?.kills | 0, inhibs: o.inhibitor?.kills | 0 };
    if (o.tower?.first) g.first.tower = sd;
    if (o.dragon?.first) g.first.dragon = sd;
  }
  if (!g.winner) warnings.push('A Riot não informou o vencedor.');
  if (g.bans.a.concat(g.bans.b).some((b) => !b)) warnings.push('Alguns bans não puderam ser convertidos em nome de campeão.');
  return { game: g, warnings, matchId: json.metadata?.matchId || '' };
}
