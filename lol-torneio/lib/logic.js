export const KO = { sf1: 'Semifinal 1', sf2: 'Semifinal 2', third: 'Disputa de 3º lugar', final: 'Grande Final' };
export const LBL = { sf1: ['1º colocado', '4º colocado'], sf2: ['2º colocado', '3º colocado'], third: ['Perdedor SF1', 'Perdedor SF2'], final: ['Vencedor SF1', 'Vencedor SF2'] };
export const teamMap = (d) => Object.fromEntries(d.teams.map((t) => [t.id, t]));
const need = (m) => Math.ceil(m.bo / 2);
export const win = (m) => (m.a && m.b ? (m.sa >= need(m) ? m.a : m.sb >= need(m) ? m.b : null) : null);
export const lose = (m) => { const w = win(m); return w ? (w === m.a ? m.b : m.a) : null; };
export const played = (m) => m.sa != null && m.sb != null;
export const groups = (d) => d.matches.filter((m) => m.phase === 'g');
export const rounds = (d) => [...new Set(groups(d).map((m) => m.round))].sort((a, b) => a - b);

export function standings(d) {
  const T = {};
  d.teams.forEach((t) => (T[t.id] = { id: t.id, j: 0, w: 0, l: 0, p: 0, gw: 0, gl: 0, tb: t.tb ?? 99, h2h: 0, diff: 0 }));
  const G = groups(d).filter((m) => played(m) && m.sa !== m.sb && T[m.a] && T[m.b]);
  const W = (m) => (m.sa > m.sb ? m.a : m.b);
  G.forEach((m) => {
    const w = W(m), l = w === m.a ? m.b : m.a;
    T[w].w++; T[w].p += 3; T[l].l++; T[m.a].j++; T[m.b].j++;
    T[m.a].gw += m.sa; T[m.a].gl += m.sb; T[m.b].gw += m.sb; T[m.b].gl += m.sa;
  });
  const rows = Object.values(T);
  rows.forEach((r) => {
    const tied = rows.filter((o) => o.p === r.p && o.w === r.w).map((o) => o.id);
    r.h2h = tied.length > 1 ? G.filter((m) => tied.includes(m.a) && tied.includes(m.b) && W(m) === r.id).length : 0;
    r.diff = r.gw - r.gl;
  });
  // Art. 4: pontos → vitórias → confronto direto → saldo → partida extra (prioridade manual)
  return rows.sort((a, b) => b.p - a.p || b.w - a.w || b.h2h - a.h2h || b.diff - a.diff || a.tb - b.tb);
}

export function bracket(d) {
  const st = standings(d);
  const done = groups(d).every(played);
  const M = Object.fromEntries(d.matches.filter((m) => m.phase === 'k').map((m) => [m.id, { ...m }]));
  const s = (i) => (done && st[i] ? st[i].id : null);
  M.sf1.a = s(0); M.sf1.b = s(3); M.sf2.a = s(1); M.sf2.b = s(2);
  M.final.bo = d.config.finalFormat === 'MD5' ? 5 : 3;
  M.final.a = win(M.sf1); M.final.b = win(M.sf2);
  M.third.a = lose(M.sf1); M.third.b = lose(M.sf2);
  return { M, st, done, champion: win(M.final), vice: lose(M.final), third: win(M.third) };
}
