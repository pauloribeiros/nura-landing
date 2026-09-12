# NURA — instruções para agentes

SaaS de autoavaliações digitais (TDAH, QI, espectro autista). A pessoa responde
de graça, recebe uma prévia e compra o relatório por R$ 19,90. Domínio:
`nuraperfil.com`. **Está em produção e recebe dinheiro real.**

Next.js 15 (App Router) + React 19 + TypeScript em `apps/web/`, next-intl
(`pt-br`, `en`, `es`), Supabase, Stripe, Resend, Vercel.

> **O documento completo é o [CLAUDE.md](CLAUDE.md)** — design, i18n, verificação
> em celular, identidade jurídica e o resto. Leia antes de mexer em qualquer
> coisa. Este arquivo é o resumo das regras cujo descumprimento já custou caro.

## As sete regras que doem quando quebradas

**1. O build local NÃO roda o ESLint; o da Vercel roda, e falha o deploy.**
Um `prefer-const` já derrubou um deploy que tinha passado limpo na máquina.
Rode `cd apps/web && npx next lint` antes de commitar. Avisos não quebram,
erros sim. A CI (`.github/workflows/ci.yml`) também pega, mas depois do push.

**2. Nunca rode `next dev` ou `next build` pelo shell com um servidor servindo
`.next`.** Use a ferramenta de preview (`.claude/launch.json`).

**3. `svh`, nunca `dvh`.** `dvh` muda quando a barra do navegador recolhe, e um
elemento que muda de tamanho no meio de uma interação pula sob o dedo. Telas
com botão no rodapé se verificam a 375×812 **e** a 375×660.

**4. Erro que impede alguém de concluir sai por `reportarErro`
(`src/lib/observability/report.ts`), nunca por `console.error` solto.** O log da
Vercel só responde a quem já foi olhar; o checkout ficou quebrado em produção
por um espaço antes do `sk_live_` e só foi descoberto porque o dono tentou
comprar. Exceção: recusa de método de pagamento pela Stripe (o Pix) fica em
`console.warn` — acontece em toda compra e enterraria o painel.

**5. Segredos vivem só em `apps/web/.env.local` (gitignorado).** Nunca peça uma
chave no chat, nunca imprima o conteúdo do arquivo, nunca imprima uma
connection string nem parcialmente. `SUPABASE_SECRET_KEY` e
`STRIPE_SECRET_KEY` são de servidor: jamais `NEXT_PUBLIC_`. Antes de cada
commit, confira `git status` — se aparecer `.env*`, chave, token ou dump de
banco, **pare e avise** em vez de commitar.

**6. Nenhuma string visível nasce dentro de um componente.** Toda frase vive em
`apps/web/messages/<locale>.json`, nos três idiomas. Identidade jurídica
(razão social, CNPJ, endereço, e-mails) nunca é inventada — vem de
`apps/web/src/content/legal.ts`.

**7. Dado de avaliação é dado sensível de saúde sob a LGPD.** Não mande resposta,
e-mail nem IP para terceiro. O filtro em `src/lib/observability/privacidade.ts`
esteriliza todo evento antes de sair, e tem teste; se mexer nele, o teste tem
que continuar passando. Medição de uso (PostHog) só dispara após consentimento
explícito — qualquer pixel ou script de terceiro entra pelo mesmo portão, em
`src/lib/analytics.ts`, ou não entra.

## Comandos

```bash
pnpm --filter @workspace/web run build     # build de produção
cd apps/web && npx vitest run              # testes de domínio
cd apps/web && npx tsc --noEmit            # só os tipos
cd apps/web && npx next lint               # ESLint — ver regra 1
```

## Commits

Trabalhar direto no `main`. Ao concluir uma funcionalidade **que esteja
funcionando**, commitar e dar push sem pedir confirmação. Não acumular várias
funcionalidades num commit, nem commitar trabalho pela metade. Antes: testes,
build e `git status`. Mensagem em português, dizendo *o que* mudou e *por quê*,
título curto + corpo.

## Trabalho visual

Qualquer alteração de tela passa por uma skill de design antes de escrever CSS
ou JSX, e **não está pronta sem ter sido vista rodando — inclusive no celular.**
Duas vezes um bug de funil passou por checagem só no desktop. Detalhes e a
tabela de skills estão no `CLAUDE.md`.
