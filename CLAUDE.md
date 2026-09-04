# NURA

SaaS de autoavaliações digitais (TDAH, QI, espectro autista). A pessoa responde
de graça, recebe uma prévia do resultado e compra o relatório completo por
R$ 19,90. Domínio: `nuraperfil.com`.

## Stack

- **App:** Next.js 15 (App Router) + React 19 + TypeScript, em `apps/web/`
- **i18n:** next-intl v4 — `pt-br`, `en`, `es`. Toda string visível vive em
  `apps/web/messages/<locale>.json`; nenhuma frase nasce dentro de um componente.
- **Dados e auth:** Supabase (Postgres + RLS + login anônimo)
- **Pagamento:** Stripe (Payment Element embutido, Pix e cartão)
- **E-mail:** Resend
- **Hospedagem:** Vercel · **Repositório:** `pauloribeiros/nura-landing`, branch `main`

## Design de interface — obrigatório

**Qualquer trabalho visual em `apps/web/` passa por uma skill de design antes de
escrever CSS ou JSX.** Elas estão instaladas em `~/.claude/skills` e valem para
este projeto. Não desenhar no olho: foi assim que a landing acumulou seções com
cara de template genérico, que é exatamente o que o dono não quer.

| Situação | Skill |
|---|---|
| Criar, redesenhar, criticar, polir ou auditar uma tela | `impeccable` (`shape`, `critique`, `audit`, `polish`, `bolder`, `layout`, `typeset`, `delight`) |
| Landing/portfólio que não pode parecer template | `design-taste-frontend` |
| Subir a régua de uma tela que já existe | `redesign-existing-projects` |
| Movimento, transição, micro-interação | `animate`, `improve-animations`, `review-animations`, `emil-design-eng` |
| Escolher biblioteca de UI | `pick-ui-library` |
| Texto que soa a IA | `humanizer` |

O padrão para uma tela nova é `impeccable shape`; para uma tela existente que
incomoda, `impeccable critique` e depois o comando que ele indicar.

### O que já é verdade visual deste projeto

Não existe `DESIGN.md`. A autoridade visual é o código: `apps/web/src/app/globals.css`
(tokens, `--nura-*`, `--text-on-dark-*`, `--status-*`), os componentes em
`apps/web/src/components/` e a tipografia definida no layout. Refinamento
preserva esse mundo; substituí-lo é decisão do dono, não efeito colateral de uma
tarefa.

Regras que já valem: escuro por padrão, ícones `lucide`, azul (`--nura-blue`)
para ação e ciano (`--nura-cyan`) para acento — violeta é raro e proposital —,
`prefers-reduced-motion` respeitado em toda animação (hoje são 12 blocos), e
nada de gradiente decorativo sem função.

## Comandos

```bash
pnpm --filter @workspace/web run build     # build de produção (valida tipos)
cd apps/web && npx vitest run              # testes de domínio (puros, sem DOM)
cd apps/web && npx tsc --noEmit            # só os tipos
```

Servidor de desenvolvimento: usar a ferramenta de preview do Claude Code
(`.claude/launch.json`), nunca `next dev` pelo shell. **Nunca rodar `next build`
enquanto um servidor está servindo `.next`.**

## Verificação

Mudança de tela não está pronta sem ter sido vista rodando — e no celular.
Verificar a 375×812 e, para telas com botão no rodapé, também a **375×660**, que
é a área visível do Safari no iPhone com a barra do navegador aberta. Duas vezes
um bug de funil passou por checagem só no desktop.

Regra de altura no celular: usar `svh`, nunca `dvh`. `dvh` muda quando a barra do
navegador recolhe, e um elemento que muda de tamanho no meio de uma interação
pula sob o dedo.

## Commits

Ao concluir uma funcionalidade **que esteja funcionando**, commitar e dar push
sem pedir confirmação. Não acumular várias funcionalidades num commit, nem
commitar trabalho pela metade. Trabalhar direto no `main`.

Antes de cada commit: rodar os testes, rodar o build, e conferir `git status` —
se aparecer arquivo que possa conter credencial (`.env*`, chave, token, dump de
banco), **parar e avisar** em vez de commitar.

Mensagem em português, dizendo *o que* mudou e *por quê*, título curto + corpo.
Manter o trailer `Co-Authored-By`.

## Segurança

Segredos vivem só em `apps/web/.env.local` (gitignorado). O dono escreve os
valores no arquivo; **nunca pedir uma chave no chat e nunca imprimir o conteúdo
do arquivo.** `SUPABASE_SECRET_KEY` e `STRIPE_SECRET_KEY` são de servidor: jamais
`NEXT_PUBLIC_`.

Identidade jurídica (razão social, CNPJ, endereço, e-mails do rodapé e das
páginas legais) nunca é inventada — vem de `apps/web/src/content/legal.ts`.

Pendências conhecidas: a senha do banco exposta numa sessão anterior ainda
precisa ser rotacionada antes de tráfego real.
