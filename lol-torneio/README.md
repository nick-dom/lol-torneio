# Copa Nexus — site do torneio de League of Legends

Site do torneio com tabela de classificação, resultados, chaveamento automático, regulamento e painel administrativo (`/admin`). Feito com **Next.js 14 (App Router)**, pronto para publicar na **Vercel**.

> Projeto de fãs, sem vínculo com a Riot Games. As artes vêm do Data Dragon (CDN oficial da Riot para projetos de fãs).

## Funcionalidades

- **Site público** (`/`): classificação, rodadas, mata-mata, equipes, notícias, transmissão ao vivo e contagem regressiva.
- **Painel** (`/admin`, protegido por senha): edita tudo sem mexer em código — nome, subtítulo, banner, campeões em destaque, início, link da live (YouTube/Twitch), alerta, formato da final (MD3/MD5), notícias, equipes (nome, sigla, cor, logo, capitão, titulares, prioridade de desempate), partidas/horários/placares e o texto do regulamento.
- **Regras automáticas**: pontos corridos em MD1 (3 pts por vitória), folga sem pontos; desempate por vitórias → confronto direto → saldo → partida extra (prioridade manual). Top 4 avança, 5º é eliminado. SF1: 1º x 4º, SF2: 2º x 3º (MD3); final MD3/MD5 e disputa de 3º lugar (MD1).

## Transmissão ao vivo (qualquer link)

No painel (aba **Torneio**), cole o link da live e salve. O site converte sozinho e toca **dentro da página**: YouTube (vídeo, `/live/`, canal `/channel/UC…/live`), Twitch (canal, vídeo, clipe), Kick, Facebook, Vimeo, Dailymotion, streams `.m3u8` (HLS), arquivos `.mp4/.webm` e o código `<iframe>` de qualquer plataforma. Qualquer outro link `https://` é tentado em um iframe isolado (sandbox); se o site de origem bloquear incorporação, o botão **Abrir em nova aba** fica disponível. Links `@canal/live` do YouTube não são incorporáveis: use o link do vídeo da live.

## Página de Mídia (`/midia`)

- **Vídeos**: envie no YouTube Studio com visibilidade **Não listado**, copie o link e cole no painel (aba **Mídia**). O vídeo toca dentro do site.
- **Fotos**: até **400 KB** (fotos maiores são reduzidas automaticamente pelo painel). JPG, PNG, WEBP ou GIF.
- **Jogadores**: uma foto por jogador; o nick aparece embaixo. Os nicks vêm do campo *Titulares* da aba Equipes. Se você renomear um nick, reenvie a foto dele.
- Depois de adicionar, clique em **Salvar e publicar**.
- As imagens ficam no Upstash, cada uma em sua própria chave (`lol-img:*`), sem pesar nos dados principais (`lol-tournament-v1`). Atualizar o código **não apaga** os dados já salvos.


## Rodar localmente

Requer Node.js 18.17+.

```bash
npm install
```

Crie um arquivo `.env.local` na raiz (funciona em Windows, macOS e Linux):

```
```

Depois:

```bash
npm run dev      # desenvolvimento → http://localhost:3000  (painel em /admin)
npm run build && npm start   # versão de produção
```

