import Menu from '@/components/Menu';
import { Logo } from '@/components/Logo';
import { standings, teamMap, win, played, KO } from '@/lib/logic';
import { slug } from '@/lib/players';

export const fmt = (t) => (t ? `${t.slice(8, 10)}/${t.slice(5, 7)} às ${t.slice(11, 16)}` : 'A definir');

// Estrutura comum das páginas de perfil
export function Page({ title, children }) {
  return (
    <>
      <nav className="nav"><div className="nav-in"><a className="navlink" href="/">← Site do torneio</a><a className="navlink" href="/#equipes">Equipes</a><a className="navlink" href="/#jogadores">Jogadores</a></div><Menu /></nav>
      <main id="main" className="wrap">{children}</main>
      <div className="foot"><a className="navlink" href="/">← Voltar ao site do torneio</a><p style={{ marginTop: 14 }}>Projeto de fãs, não afiliado à Riot Games. League of Legends é marca da Riot Games, Inc.</p></div>
    </>
  );
}

const nameOf = (m, k, T, i) => T[m[k]]?.name || ({ sf1: ['1º colocado', '4º colocado'], sf2: ['2º colocado', '3º colocado'], third: ['Perdedor SF1', 'Perdedor SF2'], final: ['Vencedor SF1', 'Vencedor SF2'] }[m.id]?.[i]) || 'A definir';

// Todas as partidas (grupo + mata-mata já definido) de uma equipe, na ordem do calendário
export function teamMatches(d, B, id) {
  const all = [...d.matches.filter((m) => m.phase === 'g').map((m) => ({ ...m, _n: `Rodada ${m.round}` })), ...['sf1', 'sf2', 'third', 'final'].map((k) => ({ ...B.M[k], _n: KO[k] }))];
  return all.filter((m) => m.a === id || m.b === id).sort((a, b) => (a.time || '9').localeCompare(b.time || '9'));
}

export function MatchList({ ms, T }) {
  if (!ms.length) return <p className="note">Nenhuma partida definida.</p>;
  return ms.map((m) => {
    const done = played(m), w = m.phase === 'k' ? win(m) : done ? (m.sa > m.sb ? m.a : m.sa < m.sb ? m.b : null) : null;
    return (
      <div className="mrow" key={m.id}>
        <div className="mt"><b>{m._n}</b>{fmt(m.time)}{T[m.a] && T[m.b] && <a className="mlink" href={'/partida/' + m.id}>Detalhes</a>}</div>
        <div className={'side' + (w && w === m.a ? ' w' : '')}><span>{nameOf(m, 'a', T, 0)}</span><Logo t={T[m.a]} s={30} /></div>
        <div className="score">{done ? <><b>{m.sa}</b><i>x</i><b>{m.sb}</b></> : <i>vs</i>}</div>
        <div className={'side r' + (w && w === m.b ? ' w' : '')}><Logo t={T[m.b]} s={30} /><span>{nameOf(m, 'b', T, 1)}</span></div>
      </div>
    );
  });
}
export { standings, teamMap, slug };
