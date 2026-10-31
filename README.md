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

## Flags

Em `src/config/flags.ts`:

- `sorteiosAtivos` (padrão `false`): sorteios ligados a assinatura exigem autorização prévia da SPA/MF.
- `pontosSomenteAssinantes` (padrão `true`).
