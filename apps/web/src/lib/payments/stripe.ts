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
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Price in the smallest currency unit, which is what Stripe expects. */
export const PRICE_CENTS = 1990;
export const CURRENCY = 'brl';
