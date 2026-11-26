// Constantes compartilhadas entre servidor e navegador (sem imports de servidor)
export const CREW_ROLES = { narrador: 'Narrador', comentarista: 'Comentarista', observador: 'Observador', tecnica: 'Equipe técnica' };
export const BC_STATUS = { agendada: 'Agendada', ao_vivo: 'Ao vivo', finalizada: 'Finalizada', cancelada: 'Cancelada' };
export const AWARD_CATS = ['MVP da temporada', 'Melhor jogador por rota', 'Melhor equipe', 'Maior número de abates', 'Melhor KDA', 'Melhor jogada', 'Jogador revelação', 'Outro'];

export const INSC_STATUS = { pendente: 'Pendente', em_analise: 'Em análise', aguardando_correcao: 'Aguardando correção', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };
export const PUSH_TYPES = { partidas: 'Nova partida agendada', horarios: 'Alteração de horário', lembretes: 'Partida prestes a começar', resultados: 'Resultado publicado', noticias: 'Nova notícia', votacao: 'Início e encerramento de votação', avisos: 'Atualizações importantes do campeonato' };
