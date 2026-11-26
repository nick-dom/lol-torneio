// Montagem de dados para as páginas públicas (equipes, partidas e datas)
import { bracket, teamMap, played, KO } from './logic';
export const dtBR = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }); };
export const dayBR = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '');
export function matchInfo(d, id) {
  const m = d.matches.find((x) => x.id === id); if (!m) return null;
  const B = bracket(d), mm = m.phase === 'k' ? B.M[id] : m, T = teamMap(d);
  return { id, label: m.phase === 'k' ? KO[id] : `Rodada ${m.round}`, a: T[mm.a] || null, b: T[mm.b] || null, sa: mm.sa, sb: mm.sb, time: mm.time, done: played(mm) };
}
export const img = (id) => (id ? '/api/img/' + id : '');
