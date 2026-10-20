import { RULES } from './rules';
const C = ['#3b82f6', '#e84057', '#0acf83', '#9b5cf6', '#f0b232'];
const R = [['A','B'],['C','D'],['A','C'],['B','E'],['A','D'],['C','E'],['A','E'],['B','D'],['B','C'],['D','E']];
export const SEED = {
  media: { items: [], players: {} },
  config: {
    name: 'Copa Nexus de League of Legends',
    subtitle: 'Torneio internacional · 5 equipes · pontos corridos e mata-mata',
    bannerImage: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_0.jpg',
    featured: 'Ahri,Jinx,Yasuo,Lux,Zed',
    startDate: '2026-11-07T19:30',
    stream: '',
    alert: 'Inscrições encerradas. A tabela de confrontos já está publicada.',
    finalFormat: 'MD3',
    news: ['Regulamento oficial publicado na aba Regras.', 'Capitães: confirmem a presença dos jogadores com 15 minutos de antecedência.'],
    rules: RULES,
  },
  teams: 'ABCDE'.split('').map((l, i) => ({ id: l, name: 'Time ' + l, tag: l, color: C[i], logo: '', captain: '', players: [], tb: i + 1 })),
  matches: [
    ...R.map(([a, b], i) => ({ id: 'g' + (i + 1), phase: 'g', round: Math.floor(i / 2) + 1, a, b, bo: 1, sa: null, sb: null, time: '' })),
    ...['sf1', 'sf2', 'third', 'final'].map((id) => ({ id, phase: 'k', bo: id === 'third' ? 1 : 3, a: null, b: null, sa: null, sb: null, time: '' })),
  ],
};
