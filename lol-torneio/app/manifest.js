export default function manifest() {
  return {
    name: 'Copa Nexus — Torneio de League of Legends',
    short_name: 'Copa Nexus',
    description: 'Tabela, resultados, chaveamento e transmissão ao vivo do torneio.',
    id: '/',
    start_url: '/',
    categories: ['sports', 'games'],
    shortcuts: [
      { name: 'Transmissões', url: '/transmissoes' },
      { name: 'Notícias', url: '/noticias' },
      { name: 'Votação de MVP', url: '/votacao' },
    ],
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#010a13',
    theme_color: '#010a13',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
