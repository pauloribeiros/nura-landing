/**
 * Ponto de entrada do Next para instrumentação de servidor.
 *
 * `register` roda uma vez por runtime, antes de tudo. `onRequestError` é o
 * gancho que entrega ao Sentry os erros que o React lança durante o render no
 * servidor — sem ele, uma página que explode em RSC só aparece no log da Vercel.
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
