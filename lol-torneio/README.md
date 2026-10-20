# Copa Nexus — site do torneio de League of Legends

Site do torneio com tabela de classificação, resultados, chaveamento automático, regulamento e painel administrativo (`/admin`). Feito com **Next.js 14 (App Router)**, pronto para publicar na **Vercel**.

> Projeto de fãs, sem vínculo com a Riot Games. As artes vêm do Data Dragon (CDN oficial da Riot para projetos de fãs).

## Funcionalidades

- **Site público** (`/`): classificação, rodadas, mata-mata, equipes, notícias, transmissão ao vivo e contagem regressiva.
- **Painel** (`/admin`, protegido por senha): edita tudo sem mexer em código — nome, subtítulo, banner, campeões em destaque, início, link da live (YouTube/Twitch), alerta, formato da final (MD3/MD5), notícias, equipes (nome, sigla, cor, logo, capitão, titulares, prioridade de desempate), partidas/horários/placares e o texto do regulamento.
- **Regras automáticas**: pontos corridos em MD1 (3 pts por vitória), folga sem pontos; desempate por vitórias → confronto direto → saldo → partida extra (prioridade manual). Top 4 avança, 5º é eliminado. SF1: 1º x 4º, SF2: 2º x 3º (MD3); final MD3/MD5 e disputa de 3º lugar (MD1).

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `ADMIN_PASSWORD` | **Sim** | Senha do painel `/admin`. Sem ela não é possível entrar. |
| `SESSION_SECRET` | Recomendada | Texto longo e aleatório para assinar a sessão do admin. |
| `KV_REST_API_URL` e `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) | Recomendadas | Banco Upstash Redis. **Sem ele, as edições ficam só na memória do servidor e são perdidas.** |

Um modelo está em `.env.example`.

## Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub e importe o repositório na Vercel (ou use `npx vercel`).
2. Em **Settings → Environment Variables**, defina `ADMIN_PASSWORD` e `SESSION_SECRET`.
3. Em **Storage / Marketplace**, adicione **Upstash Redis** ao projeto. A Vercel preenche `KV_REST_API_URL` e `KV_REST_API_TOKEN` sozinha.
4. Faça **Redeploy** (variáveis só valem em novos deploys).
5. Abra `https://SEU-SITE.vercel.app/admin`, entre com a senha, edite e clique em **Salvar e publicar**.

## Rodar localmente

Requer Node.js 18.17+.

```bash
npm install
```

Crie um arquivo `.env.local` na raiz (funciona em Windows, macOS e Linux):

```
ADMIN_PASSWORD=teste
SESSION_SECRET=qualquer-texto-longo
```

Depois:

```bash
npm run dev      # desenvolvimento → http://localhost:3000  (painel em /admin)
npm run build && npm start   # versão de produção
```

## Solução de problemas

- **Painel mostra "A variável ADMIN_PASSWORD não está definida"**: defina-a (Vercel ou `.env.local`) e reinicie/redeploy.
- **"Não foi possível abrir o painel"**: clique em *Tentar novamente*; se persistir, confira os logs da Vercel e as variáveis do Upstash.
- **Edições somem depois de um tempo**: o Redis não está conectado (o painel avisa em amarelo). Siga o passo 3 acima.
- **Imagens**: logos enviados pelo painel devem ter até 150 KB (ou cole uma URL). O limite total de dados salvos é 3 MB.

## Estrutura

```
app/            páginas (/ e /admin) e rotas de API (/api/data, /api/login)
components/     Site.js (público) e Admin.js (painel)
lib/            logic.js (classificação e chaveamento), rules.js (regulamento padrão),
                seed.js (dados iniciais), store.js (persistência), auth.js (sessão)
```
