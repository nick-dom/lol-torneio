// Hall da Fama: tudo calculado a partir das temporadas guardadas, premiações e estatísticas. Nada estático.
import { listSeasons, getSeasonData } from './seasons';
import { list } from './cms';
import { bracket } from './logic';
import { collect } from './rank';
import { kda } from './games';

export async function buildHall(live) {
  const seasons = await listSeasons(live);
  const awards = await list('premiacoes');
  const rows = [], players = new Map(), records = {};
  for (const m of seasons) {
    const d = await getSeasonData(m.id, live); if (!d) continue;
    const T = Object.fromEntries(d.teams.map((t) => [t.id, t]));
    const r = m.status === 'ativa' ? null : m.result;
    const nm = (id) => (id && T[id] ? { id, name: T[id].name, logo: T[id].logo || '', color: T[id].color, tag: T[id].tag } : null);
    if (r) rows.push({ season: m, champion: nm(r.champion), vice: nm(r.vice), third: nm(r.third) });
    // Recordes e jogadores de destaque (todas as temporadas, incluindo a ativa)
    const B = bracket(d), C = collect(d, B);
    for (const p of C.players) { const k = `${p.nick}`; const x = players.get(k) || { nick: p.nick, teams: new Set(), seasons: new Set(), j: 0, k: 0, d: 0, a: 0 }; x.teams.add(p.teamName); x.seasons.add(m.name); x.j += p.j; x.k += p.k; x.d += p.d; x.a += p.a; players.set(k, x); }
    for (const [id, gs] of Object.entries(d.games || {})) for (const g of gs) for (const sd of ['a', 'b']) for (const p of g.players[sd]) {
      if (!p.nick) continue;
      const mk = (key, val, label) => { if (val > 0 && (!records[key] || val > records[key].value)) records[key] = { value: val, nick: p.nick, team: T[(d.matches.find((x) => x.id === id) || {})[sd]]?.name || '', season: m.name, label }; };
      mk('kills', p.k, 'Mais abates em um jogo'); mk('assists', p.a, 'Mais assistências em um jogo'); mk('dmg', p.dmg, 'Maior dano em um jogo'); mk('cs', p.cs, 'Mais farm (CS) em um jogo');
      if (p.d === 0 && p.k + p.a > 0) mk('kda', p.k + p.a, 'Maior KDA sem morrer (K+A)');
    }
  }
  const top = [...players.values()].filter((p) => p.j >= 1).map((p) => ({ nick: p.nick, teams: [...p.teams], seasons: [...p.seasons], j: p.j, kda: kda(p), k: p.k, d: p.d, a: p.a })).sort((a, b) => b.kda - a.kda || b.j - a.j).slice(0, 10);
  const teams = new Map();
  for (const x of rows) for (const [pos, t] of [['titulos', x.champion], ['vices', x.vice], ['terceiros', x.third]]) if (t) { const e = teams.get(t.name) || { ...t, titulos: 0, vices: 0, terceiros: 0 }; e[pos]++; teams.set(t.name, e); }
  return { seasons: rows.sort((a, b) => b.season.number - a.season.number), teams: [...teams.values()].sort((a, b) => b.titulos - a.titulos || b.vices - a.vices), top, records: Object.values(records), awards };
}
