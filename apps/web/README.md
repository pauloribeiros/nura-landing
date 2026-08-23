# @workspace/web

Next.js (App Router) front-end for NURA. Replaces the Vite SPA in
`artifacts/nura-landing`.

## Run

```bash
pnpm --filter @workspace/web run dev        # http://localhost:3000
pnpm --filter @workspace/web run build
pnpm --filter @workspace/web run typecheck
pnpm --filter @workspace/web run lint
```

## Deploy (Vercel)

Set the project **Root Directory** to `apps/web`. Vercel detects the pnpm
workspace and installs from the repository root on its own. `SITE_URL` is the
only environment variable, and only once a custom domain exists.

Every locale is prerendered as static HTML (`generateStaticParams`), so the
landing costs no server invocation per visit and the whole copy is in the
initial HTML for crawlers.

## Where things live

| Path | What |
| --- | --- |
| `src/app/[locale]/` | Route, metadata, JSON-LD |
| `src/app/globals.css` | The whole stylesheet. Palette tokens at the top |
| `src/components/sections/` | Server components — all copy, no interactivity |
| `src/components/webgl/` | R3F scene, lazily loaded on the client only |
| `src/content/landing.ts` | Structure: catalog, section ids, lists |
| `messages/*.json` | Every user-facing string |
| `src/i18n/` | Locale ids, routing, request config |

## Conventions

- **No string in a component.** Copy goes to `messages/`, structure to
  `src/content/`. A new locale is a new JSON file and nothing else.
- **URL segments are lowercase** (`/pt-br`), the BCP-47 tag is not
  (`pt-BR`). `LOCALE_META` in `src/i18n/routing.ts` maps between them for
  `<html lang>`, `og:locale` and `hreflang`.
- **Sections stay server components.** Interactivity is isolated in
  `CtaButton`, `Header`, `FaqList` and `MobileStickyCta` so the copy stays in
  the server-rendered HTML.
- **No utility CSS framework.** The stylesheet is hand-written against the
  tokens in `:root`. Add Tailwind back only if the dashboard needs it.

## Not done yet

- `en` and `es` translations need a native review before going live.
- No assessment route exists — every CTA still scrolls and shows a notice.
