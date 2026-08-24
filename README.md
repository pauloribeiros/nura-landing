# NURA

Plataforma de avaliações para explorar atenção, cognição, personalidade,
comportamento e carreira.

Contexto de produto, posicionamento e decisões de negócio:
[NURA_PRODUCT_MASTER.md](NURA_PRODUCT_MASTER.md).

## Estrutura

```
apps/web     Next.js (App Router) — landing, catálogo e landings de avaliação
lib/db       Drizzle ORM — schema do Postgres (Supabase)
```

## Rodar

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build          # typecheck + build
pnpm lint
```

Detalhes do front, convenções e onde cada coisa vive: [apps/web/README.md](apps/web/README.md).

## Stack

| Camada | Escolha |
| --- | --- |
| Front + API | Next.js (App Router) na Vercel — sem serviço separado no MVP |
| Banco | Supabase Postgres, acessado por Drizzle no servidor |
| Auth | Supabase Auth, com sessão anônima antes do cadastro |
| i18n | `next-intl` — `/pt-br`, `/en`, `/es` |
| Pagamento | Mercado Pago (PIX e cartão). Provedor modelado de forma agnóstica |

Duas regras que valem desde a primeira migration, porque resposta de avaliação
é dado pessoal sensível na LGPD: **RLS ligada** e a `service_role` key nunca
no cliente.

## Deploy

Vercel, com **Root Directory** apontando para `apps/web`. As três locales são
pré-renderizadas como HTML estático, então a landing não custa invocação de
servidor por visita.

`SITE_URL` só é necessária quando houver domínio próprio — até lá a Vercel
preenche a partir de `VERCEL_PROJECT_PRODUCTION_URL`.
