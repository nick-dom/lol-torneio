import { totals, kda } from './games';

// Soma todos os jogos registrados, com filtros opcionais de fase ('g' ou 'k'), rota e equipe
export function collect(d, B, { fase = '', rota = '', equipe = '' } = {}) {
  const M = [...d.matches.filter((m) => m.phase === 'g'), ...Object.values(B.M)];
  const P = {}, C = {}, T = {};
  let jogos = 0;
  for (const m of M) {
    if (fase && m.phase !== fase) continue;
    for (const g of d.games?.[m.id] || []) {
      let counted = false;
      for (const sd of ['a', 'b']) {
        const tid = m[sd]; if (!tid || (equipe && tid !== equipe)) continue;
        const team = d.teams.find((t) => t.id === tid), tt = totals(g, sd), won = g.winner === sd;
        const tm = (T[tid] ||= { id: tid, name: team?.name || tid, j: 0, w: 0, k: 0, gold: 0, dmg: 0 });
        tm.j++; tm.k += tt.k; tm.gold += tt.gold; tm.dmg += tt.dmg; if (won) tm.w++;
        for (const p of g.players[sd]) {
          if (!p.nick) continue;
          const lane = team?.profiles?.[p.nick]?.lane || '';
          if (rota && lane !== rota) continue;
          const r = (P[tid + '::' + p.nick] ||= { team: tid, teamName: team?.name || tid, nick: p.nick, lane, j: 0, w: 0, k: 0, d: 0, a: 0, cs: 0, gold: 0, dmg: 0, vision: 0, kpN: 0, kpD: 0 });
          r.j++; r.k += p.k; r.d += p.d; r.a += p.a; r.cs += p.cs; r.gold += p.gold; r.dmg += p.dmg; r.vision += p.vision; r.kpN += p.k + p.a; r.kpD += tt.k; if (won) r.w++;
          if (p.champ) { const c = (C[p.champ] ||= { name: p.champ, j: 0, w: 0, k: 0, d: 0, a: 0 }); c.j++; c.k += p.k; c.d += p.d; c.a += p.a; if (won) c.w++; }
        }
        counted = true;
      }
      if (counted) jogos++;
    }
  }
  return { players: Object.values(P), champs: Object.values(C), teams: Object.values(T), jogos };
}

const avg = (k) => (r) => r[k] / r.j;
export const METRICS = {
  abates: { label: 'Abates', unit: 'por jogo', val: avg('k'), fmt: (v) => v.toFixed(2), total: (r) => r.k },
  mortes: { label: 'Mortes', unit: 'por jogo', val: avg('d'), fmt: (v) => v.toFixed(2), total: (r) => r.d },
  assistencias: { label: 'Assistências', unit: 'por jogo', val: avg('a'), fmt: (v) => v.toFixed(2), total: (r) => r.a },
  kda: { label: 'KDA', unit: '(K+A) ÷ D', val: (r) => kda(r), fmt: (v) => v.toFixed(2), total: (r) => `${r.k}/${r.d}/${r.a}` },
  dano: { label: 'Dano', unit: 'por jogo', val: avg('dmg'), fmt: (v) => Math.round(v).toLocaleString('pt-BR'), total: (r) => r.dmg.toLocaleString('pt-BR') },
  cs: { label: 'Farm (CS)', unit: 'por jogo', val: avg('cs'), fmt: (v) => v.toFixed(1), total: (r) => r.cs },
  visao: { label: 'Visão', unit: 'por jogo', val: avg('vision'), fmt: (v) => v.toFixed(1), total: (r) => r.vision },
  kp: { label: 'Participação em abates', unit: '%', val: (r) => (r.kpD ? (r.kpN / r.kpD) * 100 : 0), fmt: (v) => Math.round(v) + '%', total: (r) => `${r.kpN}/${r.kpD}` },
};
export function rank(players, metric, min) {
  const m = METRICS[metric] || METRICS.kda;
  return players.filter((p) => p.j >= min).map((p) => ({ ...p, v: m.val(p) })).sort((a, b) => b.v - a.v || b.j - a.j);
}
