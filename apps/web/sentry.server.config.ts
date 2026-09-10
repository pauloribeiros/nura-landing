/**
 * Sentry no runtime Node — onde o dinheiro e o banco acontecem.
 *
 * Carregado por `src/instrumentation.ts` antes de qualquer rota rodar.
 */
import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, opcoesComuns } from '@/lib/observability/sentry';

if (SENTRY_DSN) {
  Sentry.init(opcoesComuns);
}
