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
