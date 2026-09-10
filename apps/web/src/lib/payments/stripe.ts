import 'server-only';

import Stripe from 'stripe';

/**
 * Stripe client, server only.
 *
 * `server-only` at the top makes importing this from a client component a
 * build error rather than a leaked secret key.
 *
 * Returns null when Stripe is not configured, so the site keeps working
 * without it — the assessment, the free result and everything else have no
 * business failing because a payment provider is absent. Only the checkout
 * route cares, and it answers 503.
 */
/**
 * A CHAVE VEM APARADA. Um espaco antes do `sk_live_` — do tipo que sobra ao
 * colar num painel — faz o Stripe recusar tudo com erro de autenticacao. E a
 * requisicao nem aparece no log da conta, porque nao pode ser atribuida a ela:
 * o sintoma vira "o checkout nao abre" sem registro em lugar nenhum. Custou
 * horas uma vez; nao custa de novo.
 */
const aparada = (valor: string | undefined) => valor?.trim() || undefined;

export function getStripe(): Stripe | null {
  const key = aparada(process.env.STRIPE_SECRET_KEY);
  if (!key) return null;
  return new Stripe(key);
}

/** O segredo do webhook, pelo mesmo motivo: assinatura nao valida com espaco. */
export const webhookSecret = () => aparada(process.env.STRIPE_WEBHOOK_SECRET);

export const stripeConfigured = () => Boolean(aparada(process.env.STRIPE_SECRET_KEY));

/** Price in the smallest currency unit, which is what Stripe expects. */
export const PRICE_CENTS = 1990;
export const CURRENCY = 'brl';
