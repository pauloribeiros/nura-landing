/**
 * As opções que valem em todo runtime.
 *
 * Uma chave só (`NEXT_PUBLIC_SENTRY_DSN`) liga servidor, edge e navegador. O DSN
 * não é segredo — ele viaja no bundle do cliente por desenho, e só autoriza
 * ESCREVER eventos no projeto. O que é segredo é o token de upload de sourcemap,
 * e esse fica na Vercel, nunca aqui.
 *
 * Sem DSN, nada é inicializado: `captureException` vira uma função vazia, e o
 * `console.error` de sempre continua sendo a única saída. É assim que a máquina
 * de quem desenvolve, os previews e os testes não poluem o painel de produção.
 */

import type { NodeOptions } from '@sentry/nextjs';
import { esterilizar } from './privacidade';

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;

/**
 * Qual deploy, e qual commit.
 *
 * Sem isto, "quebrou desde ontem" é uma pergunta sem resposta. A Vercel injeta
 * as duas variáveis sozinha; fora dela o campo simplesmente não existe.
 */
const ambiente =
  process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV;

const release =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || undefined;

export const opcoesComuns = {
  dsn: SENTRY_DSN,
  environment: ambiente,
  release,

  // Nunca. Isto é o que faria o Sentry anexar IP, cookie e corpo de requisição
  // por conta própria — exatamente o que `esterilizar` existe para impedir.
  sendDefaultPii: false,

  // Erro é o produto aqui, não desempenho. Tracing multiplicaria o volume de
  // eventos (e a superfície de dado exposto) para responder uma pergunta que
  // ninguém fez ainda. Ligar depois é mudar este número.
  tracesSampleRate: 0,

  beforeSend: esterilizar,

  // Ruído que não é do produto: extensão do navegador, rede do visitante caindo
  // no meio de um fetch, navegação abortada. Cada um destes já enterrou um
  // painel de erro em falso positivo.
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'AbortError',
    'Non-Error promise rejection captured',
    /^Failed to fetch$/,
    /^NetworkError/,
    /^Load failed$/,
  ],
} satisfies Partial<NodeOptions>;
