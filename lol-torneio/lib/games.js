// Estatísticas de cada jogo de uma série. Só guarda o que foi registrado pela organização; o resto é calculado.
export const MAX_GAMES = 5;
export const OBJ = [['towers', 'Torres'], ['dragons', 'Dragões'], ['heralds', 'Arautos'], ['barons', 'Barões'], ['inhibs', 'Inibidores']];
const s = (v, l) => String(v ?? '').trim().slice(0, l);
const n = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
const side = (v) => (v === 'a' || v === 'b' ? v : '');

export const blankPlayer = () => ({ nick: '', champ: '', pick: 0, k: 0, d: 0, a: 0, cs: 0, gold: 0, dmg: 0, vision: 0, wards: 0 });
export const blankGame = () => ({ winner: '', dur: '', first: { blood: '', tower: '', dragon: '' }, bans: { a: ['', '', '', '', ''], b: ['', '', '', '', ''] }, obj: { a: {}, b: {} }, players: { a: Array.from({ length: 5 }, blankPlayer), b: Array.from({ length: 5 }, blankPlayer) }, mvp: '' });

const cleanPlayer = (p) => ({ nick: s(p?.nick, 30), champ: s(p?.champ, 30), pick: n(p?.pick, 10), k: n(p?.k, 99), d: n(p?.d, 99), a: n(p?.a, 99), cs: n(p?.cs, 999), gold: n(p?.gold, 200000), dmg: n(p?.dmg, 500000), vision: n(p?.vision, 999), wards: n(p?.wards, 999) });
function cleanGame(g) {
  const o = (x) => Object.fromEntries(OBJ.map(([k]) => [k, n(x?.[k], k === 'towers' ? 11 : 20)]));
  const bn = (x) => (Array.isArray(x) ? x : []).slice(0, 5).map((c) => s(c, 30));
  const pl = (x) => (Array.isArray(x) ? x : []).slice(0, 5).map(cleanPlayer);
  return {
    winner: side(g?.winner), dur: /^\d{1,3}:[0-5]\d$/.test(g?.dur || '') ? g.dur : '',
    first: { blood: side(g?.first?.blood), tower: side(g?.first?.tower), dragon: side(g?.first?.dragon) },
    bans: { a: bn(g?.bans?.a), b: bn(g?.bans?.b) },
    obj: { a: o(g?.obj?.a), b: o(g?.obj?.b) }, players: { a: pl(g?.players?.a), b: pl(g?.players?.b) }, mvp: s(g?.mvp, 30),
  };
}
// Mantém apenas partidas que existem e no máximo 5 jogos cada
export function cleanGames(x, ids) {
  const out = {};
  if (x && typeof x === 'object') for (const id of ids) if (Array.isArray(x[id]) && x[id].length) out[id] = x[id].slice(0, MAX_GAMES).map(cleanGame);
  return out;
}

export const kda = (p) => (p.k + p.a) / Math.max(1, p.d);
const sum = (a, k) => a.reduce((t, p) => t + p[k], 0);
export function totals(g, sd) { const a = g.players[sd]; return { k: sum(a, 'k'), d: sum(a, 'd'), a: sum(a, 'a'), gold: sum(a, 'gold'), dmg: sum(a, 'dmg'), cs: sum(a, 'cs'), vision: sum(a, 'vision') }; }
export const hasStats = (g) => g.players.a.length + g.players.b.length > 0;

// MVP: o informado pela organização ou, se vazio, o melhor (K+A)/D do time vencedor (desempate: dano)
export function mvp(g) {
  const w = g.winner; if (!w) return null;
  if (g.mvp) { for (const sd of ['a', 'b']) { const p = g.players[sd].find((x) => x.nick === g.mvp); if (p) return { ...p, side: sd, auto: false }; } }
  const best = [...g.players[w]].sort((x, y) => kda(y) - kda(x) || y.dmg - x.dmg)[0];
  return best ? { ...best, side: w, auto: true } : null;
}

const mmss = (v) => (v ? v : null);
const nf = (v) => v.toLocaleString('pt-BR');
// Relatório pós-jogo montado só com os dados registrados
export function report(g, name, num) {
  if (!g.winner) return '';
  const w = g.winner, l = w === 'a' ? 'b' : 'a';
  const parts = [`${name[w]} venceu o jogo ${num}${mmss(g.dur) ? ' em ' + g.dur : ''}.`];
  if (hasStats(g)) {
    const tw = totals(g, w), tl = totals(g, l);
    parts.push(`Abates: ${tw.k} a ${tl.k}.`);
    if (tw.gold && tl.gold) { const df = tw.gold - tl.gold; parts.push(df >= 0 ? `Vantagem de ${nf(df)} de ouro para o vencedor.` : `O vencedor terminou ${nf(-df)} de ouro atrás.`); }
  }
  const fb = { blood: 'primeiro abate', tower: 'primeira torre', dragon: 'primeiro dragão' }, f = Object.entries(fb).filter(([k]) => g.first[k]).map(([k, t]) => `${t}: ${name[g.first[k]]}`);
  if (f.length) parts.push(f.join('; ')[0].toUpperCase() + f.join('; ').slice(1) + '.');
  const o = OBJ.filter(([k]) => g.obj.a[k] || g.obj.b[k]).map(([k, t]) => `${t.toLowerCase()} ${g.obj[w][k]}–${g.obj[l][k]}`);
  if (o.length) parts.push(`Objetivos (vencedor–perdedor): ${o.join(', ')}.`);
  const m = mvp(g);
  if (m) parts.push(`MVP: ${m.nick}${m.champ ? ' (' + m.champ + ')' : ''}, ${m.k}/${m.d}/${m.a}.`);
  return parts.join(' ');
}

// Estatísticas de um jogador no torneio, somando todos os jogos registrados
export function playerAgg(d, M, teamId, nick) {
  const r = { jogos: 0, k: 0, d: 0, a: 0, cs: 0, gold: 0, dmg: 0, vision: 0, kpNum: 0, kpDen: 0, wins: 0, champs: {} };
  for (const m of M) for (const g of d.games?.[m.id] || []) {
    const sd = m.a === teamId ? 'a' : m.b === teamId ? 'b' : null; if (!sd) continue;
    const p = g.players[sd].find((x) => x.nick === nick); if (!p) continue;
    r.jogos++; for (const k of ['k', 'd', 'a', 'cs', 'gold', 'dmg', 'vision']) r[k] += p[k];
    r.kpNum += p.k + p.a; r.kpDen += totals(g, sd).k; if (g.winner === sd) r.wins++;
    if (p.champ) r.champs[p.champ] = (r.champs[p.champ] || 0) + 1;
  }
  return r;
}
