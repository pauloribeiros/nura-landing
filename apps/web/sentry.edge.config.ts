/**
 * Sentry no runtime edge — hoje só o middleware de i18n passa por aqui.
 *
 * Nenhuma rota de pagamento roda no edge (todas declaram `runtime = 'nodejs'`),
 * mas um erro no middleware derruba a página inteira antes de qualquer código
 * de aplicação, e sem isto ele não apareceria em lugar nenhum.
 */
import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, opcoesComuns } from '@/lib/observability/sentry';

if (SENTRY_DSN) {
  Sentry.init(opcoesComuns);
}
