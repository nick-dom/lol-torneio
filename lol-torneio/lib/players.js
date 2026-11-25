// Perfil de jogador: helpers compartilhados (servidor e navegador)
export const LANES = ['Top', 'Jungle', 'Mid', 'ADC', 'Suporte'];
export const ELOS = ['', 'Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Esmeralda', 'Diamante', 'Mestre', 'Grão-Mestre', 'Desafiante'];
const s = (v, n) => String(v ?? '').trim().slice(0, n);

export function cleanProfile(p) {
  return {
    riotId: s(p?.riotId, 40),
    lane: LANES.includes(p?.lane) ? p.lane : '',
    lane2: LANES.includes(p?.lane2) ? p.lane2 : '',
    elo: s(p?.elo, 30),
    opgg: /^https:\/\//i.test(p?.opgg || '') ? s(p.opgg, 300) : '',
    consent: p?.consent === true, // jogador autorizou consulta de dados à Riot
    ranked: p?.ranked && typeof p.ranked === 'object' ? { wins: Math.max(0, p.ranked.wins | 0), losses: Math.max(0, p.ranked.losses | 0), at: /^\d{4}-\d\d-\d\dT/.test(p.ranked.at || '') ? String(p.ranked.at).slice(0, 30) : '' } : null,
  };
}
export const cleanNicks = (a) => [...new Set((Array.isArray(a) ? a : []).map((x) => s(x, 30)).filter(Boolean))];

// Link do OP.GG: o que foi informado ou, se vazio, derivado do Riot ID "Nome#TAG" (servidor BR)
export function opggUrl(p) {
  if (p?.opgg) return p.opgg;
  const m = String(p?.riotId || '').match(/^(.+)#([^#]{2,10})$/);
  return m ? `https://www.op.gg/summoners/br/${encodeURIComponent(m[1].trim())}-${encodeURIComponent(m[2])}` : '';
}
export const slug = (v) => encodeURIComponent(String(v));
