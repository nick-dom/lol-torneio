'use client';
import { useEffect, useRef, useState } from 'react';

// Seções da página inicial (abas do site). Nas outras páginas viram links para /#secao.
export const SECTIONS = [['inicio', 'Início'], ['live', 'Ao vivo'], ['resultados', 'Partidas'], ['classificacao', 'Classificação'], ['mata', 'Playoffs'], ['equipes', 'Equipes'], ['jogadores', 'Jogadores'], ['regras', 'Regulamento']];
const GROUPS = [
  ['Ferramentas', [['/estatisticas', 'Estatísticas'], ['/draft', 'Draft'], ['/simulador', 'Simulador'], ['/midia', 'Mídia']]],
  ['Conteúdo', [['/noticias', 'Notícias'], ['/transmissoes', 'Transmissões'], ['/vods', 'Partidas gravadas'], ['/hall-da-fama', 'Hall da Fama'], ['/temporadas', 'Temporadas']]],
  ['Participe', [['/inscricao', 'Inscrição de equipes'], ['/votacao', 'Votação de MVP'], ['/notificacoes', 'Notificações e app']]],
  ['Administração', [['/admin', 'Painel ADM'], ['/admin/gestao', 'Gestão ampliada']]],
];

// Menu hambúrguer: gaveta lateral com todas as páginas. Fecha com Esc, clique fora ou ao escolher um link.
export default function Menu({ sections = SECTIONS, active = '', onSelect, theme, onTheme }) {
  const [open, setOpen] = useState(false);
  const btn = useRef(null), first = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') { // mantém o foco dentro da gaveta
        const els = [...document.querySelectorAll('#menu-drawer a, #menu-drawer button')]; if (!els.length) return;
        const a = els[0], z = els.at(-1);
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    addEventListener('keydown', onKey); first.current?.focus();
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = prev; btn.current?.focus(); };
  }, [open]);
  return (
    <>
      <button ref={btn} className="hb" aria-label="Abrir menu" aria-expanded={open} aria-controls="menu-drawer" onClick={() => setOpen(true)}><span /><span /><span /></button>
      {open && <div className="drawer-bg" onClick={() => setOpen(false)}>
        <aside id="menu-drawer" className="drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-h"><b>Copa Nexus</b><button ref={first} className="btn sm" onClick={() => setOpen(false)} aria-label="Fechar menu">✕ Fechar</button></div>
          <nav aria-label="Seções do torneio"><h3>Torneio</h3>{sections.map(([k, l]) => onSelect
            ? <button key={k} className={'dl' + (active === k ? ' on' : '')} aria-current={active === k ? 'page' : undefined} onClick={() => { onSelect(k); setOpen(false); }}>{l}</button>
            : <a key={k} href={k === 'inicio' ? '/' : '/#' + k} onClick={() => setOpen(false)}>{l}</a>)}</nav>
          {GROUPS.map(([t, links]) => <nav key={t} aria-label={t}><h3>{t}</h3>{links.map(([h, l]) => <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>)}</nav>)}
          {onTheme && <nav aria-label="Aparência"><h3>Aparência</h3><button className="dl" onClick={onTheme}>{theme === 'light' ? 'Usar tema escuro' : 'Usar tema claro'}</button></nav>}
        </aside>
      </div>}
    </>
  );
}
