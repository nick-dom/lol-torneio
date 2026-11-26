# Copa Nexus

Site do torneio de League of Legends Copa Nexus: classificação, resultados, chaveamento, regulamento, transmissão ao vivo e mídia. Painel de administração em `/admin`.

Projeto de fãs, sem vínculo com a Riot Games. League of Legends e as artes dos campeões pertencem à Riot Games, Inc.

## Stack

Next.js 14 (App Router), React 18, Upstash Redis, hospedagem na Vercel.

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
|---|---|---|
| `ADMIN_PASSWORD` | sim | Senha do `/admin` |
| `SESSION_SECRET` | recomendada | Assina o cookie de sessão (string longa e aleatória) |
| `UPSTASH_REDIS_REST_URL` | sim, em produção | Banco de dados |
| `UPSTASH_REDIS_REST_TOKEN` | sim, em produção | Banco de dados |
| `NEXT_PUBLIC_SITE_URL` | não | URL pública, usada em sitemap e Open Graph |
| `RIOT_API_KEY` | não | Chave da Riot API (elo e importação de partidas). Sem ela, os botões da Riot não aparecem |
| `RIOT_PLATFORM`, `RIOT_REGION` | não | Padrão `br1` e `americas` |

Chaves de desenvolvimento da Riot expiram em 24 h; para uso contínuo é preciso registrar o produto no portal da Riot e obter uma chave permanente.

`KV_REST_API_URL` e `KV_REST_API_TOKEN` também são aceitas no lugar das variáveis do Upstash.

Sem o Redis, os dados ficam só na memória do servidor e se perdem a qualquer reinício.

## Acesso ao painel

`/admin` aceita dois tipos de login:

- Senha mestre: deixe o usuário em branco (ou `admin`) e use `ADMIN_PASSWORD`. Acesso total.
- Usuários cadastrados em Admin → Usuários, cada um com um papel: Superadministrador, Administrador, Organizador, Árbitro, Estatístico, Equipe de transmissão ou Representante de equipe.

## Rodar localmente

Requer Node.js 18.17 ou superior.

```bash
npm install
cp .env.example .env.local   # preencha os valores
npm run dev
```

Abre em http://localhost:3000.

## Publicar na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Na Vercel, importe o repositório.
3. Adicione as variáveis de ambiente (Production e Preview).
4. Conecte um banco Upstash Redis (Storage → Marketplace), que preenche as variáveis do banco.
5. Faça o deploy. Se adicionar variáveis depois, faça Redeploy.
6. Acesse `/admin`, entre com `ADMIN_PASSWORD` e configure o torneio.

O projeto precisa de servidor Node (Vercel). Não funciona como site estático.

## Estrutura

```
app/          páginas e rotas de API
components/   interface pública e painel
lib/          regras, classificação, banco, autenticação
public/       ícones e imagem de compartilhamento
```

## Segurança

- Nunca versione `.env` nem exponha senhas e tokens.
- Troque a senha padrão do `.env.example` antes de publicar.
- Faça backup dos dados antes de mudanças estruturais.

---

# Etapas 1–6: inscrições, transmissões, notícias, votação, PWA e temporadas

Painel novo: **/admin/gestao** (mesmo login do /admin; link "Gestão ampliada" no painel principal). Cada aba é protegida no servidor por papel.

## Páginas públicas novas
`/inscricao` · `/transmissoes` · `/transmissao/[id]` · `/noticias` · `/noticias/[slug]` · `/vods` · `/hall-da-fama` · `/votacao` · `/temporadas` · `/temporadas/[id]` · `/notificacoes` · `/offline`

## Banco de dados (Upstash Redis — o mesmo já usado)
Não há migração: as chaves novas são criadas sob demanda. Cada item fica num campo de um *hash*, então editar itens diferentes nunca se sobrescreve.

| Chave | Conteúdo |
|---|---|
| `lol-inscr`, `lol-inscr-claims`, `lol-inscr-cfg` | inscrições, chaves anti-duplicidade (por temporada), abertura/prazo |
| `lol-crew`, `lol-bcast`, `lol-news`, `lol-vods`, `lol-awards` | narradores, transmissões, notícias, VODs, premiações |
| `lol-polls`, `lol-votes:<id>`, `lol-voters:<id>` | votações, contagem, eleitores (hash SHA-256, sem dados pessoais) |
| `lol-seasons`, `lol-season:<id>` | metadados e **cópia imutável** de cada temporada encerrada |
| `lol-push`, `lol-reminded` | assinaturas push e lembretes já enviados |

O documento principal (`lol-tournament-v1`) ganhou só `config.seasonId` (padrão `s1`, então os dados atuais viram a Temporada 1 automaticamente). Equipes aprovadas por inscrição ganham o campo `reg`.
Sem Upstash configurado tudo cai para memória (só desenvolvimento: **perde os dados** ao reiniciar).

## Como funciona
- **Inscrição → site:** aprovar ocupa uma vaga livre (equipe "Time X" vazia) com nome, logo, jogadores, reservas, Riot IDs e rotas. Rejeitar ou pedir correção devolve a vaga (se a equipe já tiver resultados, o servidor recusa e pede correção manual). A equipe acompanha e corrige pelo link recebido ao enviar (guardado só como hash).
- **Duplicidade:** nome de equipe e Riot ID são "reservados" de forma atômica (`SADD`), por temporada.
- **Votação:** voto único por navegador (cookie `vid` HttpOnly) + máximo de 3 votos por IP; período e estado validados no servidor; placar por candidato só é público depois de **encerrar e publicar**. O MVP estatístico (KDA, mín. 2 jogos) é separado da votação popular.
- **Temporadas:** *Encerrar* grava a cópia imutável (e confirma a leitura) → *Nova temporada* zera o documento ativo, mantendo as anteriores. Correção de placar em temporada encerrada exige motivo e fica registrada. Um painel aberto antes da troca de temporada recebe 409 ao salvar (não sobrescreve a temporada nova).
- **Notícias:** texto com formatação simples e segura (`# título`, `**negrito**`, `- lista`, `[link](https://…)`); nunca vira HTML cru.

## Variáveis de ambiente
| Variável | Obrigatória | Para quê |
|---|---|---|
| `ADMIN_PASSWORD`, `SESSION_SECRET` | sim / recomendada | login; também salga os hashes de voto |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | sim em produção | persistência |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | só para push | `npx web-push generate-vapid-keys`; subject `mailto:…` ou `https://…` |
| `CRON_SECRET` | só para lembretes | protege `/api/cron/lembretes` |
| `TOURNAMENT_TZ_OFFSET` | opcional | fuso dos horários digitados (padrão `-03:00`) |

Sem as chaves VAPID o site funciona normalmente; a tela de notificações informa que o recurso não está ativo e o envio devolve erro 503 (nada é simulado).

## Notificações automáticas
Disparadas ao: agendar/alterar horário de partida ou transmissão, publicar resultado (placar novo), publicar notícia, iniciar/encerrar/publicar votação e criar temporada. O aviso **"partida prestes a começar"** depende de um agendador chamando `GET /api/cron/lembretes` com `Authorization: Bearer <CRON_SECRET>` (avisa quando faltam ≤ 30 min). Opções: Vercel Cron em plano Pro (`*/10 * * * *`; o plano Hobby só aceita 1×/dia e **recusa o deploy** se o cron for mais frequente — por isso o `vercel.json` não traz cron) ou um serviço externo gratuito (ex.: cron-job.org) chamando a URL com o cabeçalho.

## Executar localmente
```bash
npm install          # instala também web-push (novo)
cp .env.example .env.local   # preencha ADMIN_PASSWORD
npm run dev          # http://localhost:3000  (painel: /admin e /admin/gestao)
npm test             # testes de API em Node (banco em memória, sem rede)
```
Service worker e instalação do PWA exigem HTTPS (ou `localhost`) e `npm run build && npm start`.

## Publicar na Vercel
1. Suba o projeto no GitHub e importe na Vercel (Next.js é detectado).
2. Storage → conecte o Upstash Redis (preenche as variáveis `UPSTASH_*`).
3. Settings → Environment Variables: `ADMIN_PASSWORD`, `SESSION_SECRET` e, se quiser, as de push/cron.
4. Deploy. O `package-lock.json` precisa refletir o `web-push`: rode `npm install` localmente e faça commit do lock atualizado.
5. Depois do primeiro deploy: abra `/admin/gestao`, e (se usar push) `/notificacoes` em um celular real para testar.

## Limitações conhecidas
- Votos: identificar votantes sem login é aproximado. Quem limpa cookies pode votar de novo, até o limite de 3 por IP; pessoas na mesma rede podem esbarrar nesse limite. Para voto realmente nominal seria preciso login (ex.: Discord/Google).
- Painel principal (`/admin`) e inscrições aprovadas gravam o mesmo documento: se o painel principal ficar aberto por muito tempo, **recarregue antes de salvar** depois de aprovar inscrições.
- Imagens enviadas e depois removidas (capas, logos de inscrições rejeitadas) não são apagadas do Redis automaticamente.
- Offline: páginas já visitadas ficam salvas (até 60) e exibem faixa "offline + data da última sincronização"; páginas nunca abertas mostram `/offline`. Votar, inscrever-se e o painel exigem conexão.
- Horários das partidas do painel antigo (contagem regressiva) usam o fuso do navegador; os lembretes usam `TOURNAMENT_TZ_OFFSET`.
