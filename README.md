# Largadia

> Sua próxima largada começa aqui.

Agenda de corridas de rua do Brasil, com assinatura Largadia+, Clube Largadia (pontos) e sorteios.

## Stack

- Next.js 16 (App Router, Cache Components) + TypeScript
- Tailwind CSS v4
- PostgreSQL (Neon) + Prisma 7 com `@prisma/adapter-pg`
- Leaflet + OpenStreetMap para mapas
- Zod para validação, Vitest para testes

## Rodando localmente

Requisitos: Node.js 20.9+.

```bash
npm install                 # também gera o Prisma Client
cp .env.example .env        # preencha DATABASE_URL e DIRECT_URL (Neon)
npm run db:migrate          # aplica as migrations
npm run db:seed             # carrega corridas de exemplo (datas relativas a hoje)
npm run dev                 # http://localhost:3000
```

Outros comandos:

| Comando             | O que faz                          |
| ------------------- | ---------------------------------- |
| `npm test`          | Testes automatizados (Vitest)      |
| `npm run typecheck` | Checagem de tipos                  |
| `npm run lint`      | ESLint                             |
| `npm run build`     | Build de produção                  |

## Estrutura

```
prisma/              schema, migrations e seed
src/app/             rotas (App Router)
src/components/      componentes de UI
src/config/          valores ajustáveis (flags, pontos, sorteios, filtros)
src/domain/          regras de negócio (consultas, validações)
src/lib/             infraestrutura (banco, datas, geo, rate limit)
tests/               testes
```

## Admin

- Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` e rode `npm run db:seed`: o admin é criado se ainda não existir.
- Acesse `/admin` (login em `/entrar`).
- **Cadastro rápido:** em `/admin/corridas/nova`, cole o link da prova na plataforma de inscrição; os campos são pré-preenchidos para revisão.
- Corridas enviadas por organizadores chegam como pendentes em `/admin/corridas?status=PENDENTE`.

## Parcerias com plataformas

- O botão de inscrição passa por `/ir/[slug]`, que conta o clique e redireciona com os parâmetros da plataforma.
- Parâmetros por domínio em `src/config/parceiros.ts`. Troque pelos códigos combinados quando fechar uma parceria.
- O painel `/admin` mostra cliques por plataforma e por prova nos últimos 30 dias.

## Flags

Em `src/config/flags.ts`:

- `sorteiosAtivos` (padrão `false`): sorteios ligados a assinatura exigem autorização prévia da SPA/MF.
- `pontosSomenteAssinantes` (padrão `true`).
