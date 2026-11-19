# Copa Nexus — Torneio de League of Legends

Site oficial do torneio Copa Nexus, com classificação, resultados, calendário de partidas, chaveamento automático, regulamento e painel administrativo.

Desenvolvido com **Next.js 14 (App Router)** e preparado para deploy na Vercel.

Projeto independente de fãs, sem vínculo com a Riot Games. Os assets de campeões são fornecidos pelo Data Dragon.

## Funcionalidades

### Site público
- Classificação das equipes.
- Resultados e calendário de partidas.
- Fase de pontos corridos e mata-mata.
- Equipes e jogadores.
- Notícias e avisos.
- Transmissão ao vivo.
- Contagem regressiva para o torneio.

### Painel administrativo (`/admin`)
Painel protegido por senha para gerenciamento do torneio, incluindo:

- Informações gerais, banner e identidade visual.
- Campeões em destaque.
- Equipes, jogadores, logos e cores.
- Partidas, horários e placares.
- Notícias, avisos e transmissão.
- Regulamento e configurações da competição.
- Gerenciamento de mídia.

### Sistema de competição
- Fase de pontos corridos em MD1.
- 3 pontos por vitória.
- Folgas sem pontuação.
- Desempate por vitórias, confronto direto, saldo e critérios manuais.
- Os quatro melhores avançam para o mata-mata.
- O quinto colocado é eliminado.

**Mata-mata:**
- Semifinal 1: 1º × 4º.
- Semifinal 2: 2º × 3º.
- Semifinais em MD3.
- Final em MD3 ou MD5.
- Disputa de terceiro lugar em MD1.

### Transmissão e mídia
- Incorporação de transmissões compatíveis.
- Link externo para transmissões que não permitem incorporação.
- Galeria de vídeos e fotos.
- Agenda de partidas com opção de adicionar ao calendário.
- Compartilhamento do site e partidas.

## Tecnologias

- Next.js 14
- React
- JavaScript
- Upstash Redis para persistência
- Vercel para hospedagem
- Data Dragon para assets de League of Legends

## Configuração

Requisitos:
- Node.js 18.17 ou superior.
- npm.
- Banco de dados Upstash Redis para persistência.

Variáveis de ambiente necessárias:

| Variável | Finalidade |
|---|---|
| `ADMIN_PASSWORD` | Autenticação do painel administrativo |
| `SESSION_SECRET` | Proteção e assinatura de sessão |
| `KV_REST_API_URL` | Conexão com o banco |
| `KV_REST_API_TOKEN` | Autenticação do banco |

Utilize o arquivo `.env.example` como referência para configurar o ambiente local.

## Execução local

Instale as dependências:

```bash
npm install
```

Configure as variáveis de ambiente no arquivo `.env.local` e execute:

```bash
npm run dev
```

O site estará disponível em `http://localhost:3000`.

## Deploy

1. Envie o projeto para um repositório GitHub.
2. Importe o repositório na Vercel.
3. Configure as variáveis de ambiente.
4. Conecte o Upstash Redis.
5. Realize o deploy.
6. Acesse `/admin` para configurar e publicar o torneio.

## Estrutura

```text
app/          Páginas e rotas de API
components/    Interface pública e painel administrativo
lib/          Lógica, regras, dados iniciais,
              persistência e autenticação
```

## Segurança e manutenção

- Não compartilhe arquivos `.env` ou credenciais.
- Nunca exponha tokens, senhas ou secrets no frontend.
- Mantenha a autenticação do painel habilitada.
- Dados persistentes devem ser armazenados no Redis.
- Faça backup dos dados antes de alterações estruturais.
- Atualizações devem preservar os dados existentes e evitar mudanças desnecessárias na lógica do torneio.
