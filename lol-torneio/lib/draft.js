import { totals, kda } from './games';

const norm = (c) => String(c || '').trim();
// Todos os jogos registrados, com os times resolvidos
export function allGames(d, B) {
  const M = [...d.matches.filter((m) => m.phase === 'g'), ...Object.values(B.M)];
  const out = [];
  for (const m of M) (d.games?.[m.id] || []).forEach((g, i) => { if (m.a && m.b) out.push({ m, g, n: i + 1 }); });
  return out;
}

export function draftStats(d, B, { equipe = '' } = {}) {
  const G = allGames(d, B), C = {}, S = {}, PC = {};
  let jogos = 0;
  const champ = (n) => (C[n] ||= { name: n, picks: 0, bans: 0, w: 0, k: 0, d: 0, a: 0 });
  for (const { m, g } of G) {
    let used = false;
    for (const sd of ['a', 'b']) {
      const tid = m[sd]; if (equipe && tid !== equipe) continue;
      used = true;
      const won = g.winner === sd, ps = g.players[sd].filter((p) => norm(p.champ));
      for (const c of g.bans?.[sd] || []) if (norm(c)) champ(norm(c)).bans++;
      for (const p of ps) { const c = champ(norm(p.champ)); c.picks++; c.k += p.k; c.d += p.d; c.a += p.a; if (won) c.w++;
        const key = tid + '::' + p.nick + '::' + norm(p.champ); const r = (PC[key] ||= { team: tid, nick: p.nick, champ: norm(p.champ), j: 0, w: 0, k: 0, d: 0, a: 0 }); r.j++; r.k += p.k; r.d += p.d; r.a += p.a; if (won) r.w++; }
      const names = ps.map((p) => norm(p.champ)).sort();
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) { const k = names[i] + ' + ' + names[j]; const s = (S[k] ||= { pair: k, j: 0, w: 0 }); s.j++; if (won) s.w++; }
    }
    if (used) jogos++;
  }
  return { jogos, champs: Object.values(C), pairs: Object.values(S), pc: Object.values(PC) };
}

// Histórico de drafts: um registro por jogo e por equipe, com picks na ordem de escolha
export function draftHistory(d, B, equipe) {
  const rows = [];
  for (const { m, g, n } of allGames(d, B)) for (const sd of ['a', 'b']) {
    if (m[sd] !== equipe) continue;
    const picks = g.players[sd].filter((p) => norm(p.champ)).sort((x, y) => (x.pick || 99) - (y.pick || 99));
    const bans = (g.bans?.[sd] || []).filter(norm);
    if (!picks.length && !bans.length) continue;
    rows.push({ m, n, sd, vs: m[sd === 'a' ? 'b' : 'a'], won: g.winner === sd, hasWinner: !!g.winner, picks, bans, bansAgainst: (g.bans?.[sd === 'a' ? 'b' : 'a'] || []).filter(norm) });
  }
  return rows;
}
export { kda };
