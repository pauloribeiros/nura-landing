/**
 * Sentry no navegador.
 *
 * Diferente do PostHog em `src/lib/analytics.ts`, isto NÃO passa pelo banner de
 * consentimento — e a diferença é proposital. Analytics mede comportamento para
 * o negócio e depende de um sim; relatório de erro existe para manter o serviço
 * funcionando e é enviado sem identificar ninguém (ver `privacidade.ts`: sem
 * usuário, sem IP, sem corpo de requisição, sem e-mail).
 *
 * Sem replay de sessão. Gravar a tela de alguém respondendo uma avaliação de
 * TDAH seria capturar o dado mais sensível do produto para depurar um botão.
 */
import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, opcoesComuns } from '@/lib/observability/sentry';

if (SENTRY_DSN) {
  Sentry.init(opcoesComuns);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
