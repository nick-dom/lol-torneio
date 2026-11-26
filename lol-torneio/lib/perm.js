// Papéis e permissões. Usado no servidor (aplicação real) e no painel (só para esconder o que não vale).
export const ROLES = {
  super: 'Superadministrador',
  admin: 'Administrador',
  organizador: 'Organizador',
  arbitro: 'Árbitro',
  estatistico: 'Estatístico',
  transmissao: 'Equipe de transmissão',
  representante: 'Representante de equipe',
};

// Seções novas (gestão ampliada). Organizador não encerra/cria temporadas nem apaga tudo: isso fica com admin.
const EXTRA_ORG = ['inscricoes', 'narradores', 'transmissoes', 'noticias', 'vods', 'premiacoes', 'votacao', 'push'];
const EXTRA_ALL = [...EXTRA_ORG, 'temporadas'];
// Seções do painel que cada papel pode editar
export const ACCESS = {
  super: ['torneio', 'transmissao', 'equipes', 'partidas', 'estatisticas', 'midia', 'regras', 'usuarios', 'auditoria', ...EXTRA_ALL],
  admin: ['torneio', 'transmissao', 'equipes', 'partidas', 'estatisticas', 'midia', 'regras', 'auditoria', ...EXTRA_ALL],
  organizador: ['torneio', 'transmissao', 'equipes', 'partidas', 'estatisticas', 'midia', ...EXTRA_ORG],
  arbitro: ['partidas'],
  estatistico: ['estatisticas'],
  transmissao: ['transmissao', 'midia', 'narradores', 'transmissoes', 'vods'],
  representante: ['equipes'], // somente a própria equipe
};
export const can = (role, sec) => !!ACCESS[role]?.includes(sec);
export const canAny = (role, secs) => secs.some((x) => can(role, x));

// JSON com chaves ordenadas: comparação estável
export const sj = (v) => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));

// Quais seções mudaram entre o que está salvo e o que o navegador enviou
export function diff(o, n) {
  const s = new Set();
  const { stream: os, rules: or, ...oc } = o.config, { stream: ns, rules: nr, ...nc } = n.config;
  if (sj(oc) !== sj(nc)) s.add('torneio');
  if ((os || '') !== (ns || '')) s.add('transmissao');
  if ((or || '') !== (nr || '')) s.add('regras');
  if (sj(o.teams) !== sj(n.teams)) s.add('equipes');
  if (sj(o.matches) !== sj(n.matches)) s.add('partidas');
  if (sj(o.media) !== sj(n.media)) s.add('midia');
  if (sj(o.games) !== sj(n.games)) s.add('estatisticas');
  return s;
}

// Parte do que o navegador enviou que o papel pode gravar; o resto continua como estava no banco.
// Assim, um painel desatualizado nunca apaga o que outra pessoa alterou numa seção que não é dela.
export function applyPerms(old, nd, role, teamId) {
  const out = structuredClone(old), ignored = [], applied = [];
  for (const sec of diff(old, nd)) {
    if (role === 'representante' && sec === 'equipes') {
      const mine = nd.teams.find((t) => t.id === teamId);
      if (!teamId || !mine) { ignored.push(sec); continue; }
      out.teams = old.teams.map((t) => (t.id === teamId ? { ...mine, id: t.id, tb: t.tb } : t));
      applied.push(sec);
    } else if (!can(role, sec)) ignored.push(sec);
    else {
      applied.push(sec);
      if (sec === 'torneio') { const { stream, rules, ...rest } = nd.config; Object.assign(out.config, rest); }
      else if (sec === 'transmissao') out.config.stream = nd.config.stream;
      else if (sec === 'regras') out.config.rules = nd.config.rules;
      else if (sec === 'equipes') out.teams = nd.teams;
      else if (sec === 'partidas') out.matches = nd.matches;
      else if (sec === 'midia') out.media = nd.media;
      else if (sec === 'estatisticas') out.games = nd.games;
    }
  }
  return { out, ignored, applied };
}

export const SEC_LABEL = { torneio: 'Torneio', transmissao: 'Transmissão', equipes: 'Equipes', partidas: 'Partidas', estatisticas: 'Estatísticas', midia: 'Mídia', regras: 'Regulamento' };
