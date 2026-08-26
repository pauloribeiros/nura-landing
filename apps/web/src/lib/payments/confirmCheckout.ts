import 'server-only';

import { getStripe } from './stripe';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

/**
 * Grants access by asking Stripe directly, on the success redirect.
 *
 * The webhook is still the authoritative path — it works when the buyer
 * closes the tab, loses signal, or never comes back. But Stripe redirects the
 * browser the instant a payment succeeds and delivers the webhook separately,
 * so the redirect regularly wins the race. Relying on the webhook alone meant
 * someone could pay and land on a 404, which is the worst screen a paying
 * customer can see.
 *
 * This is not a second source of truth: it asks Stripe the same question the
 * webhook answers, and writes the same row. The unique index makes whichever
 * arrives second a no-op.
 *
 * Ownership is checked against the metadata Stripe holds, which the checkout
 * route set from values it had verified. A checkout id for a different
 * session grants nothing.
 */
export async function confirmCheckout(
  stripeSessionId: string,
  expectedSessionId: string,
): Promise<boolean> {
  const stripe = getStripe();
  const admin = getSupabaseAdminClient();
  if (!stripe || !admin) return false;

  let checkout;
  try {
    checkout = await stripe.checkout.sessions.retrieve(stripeSessionId);
  } catch {
    // An id that is not ours, or not a checkout session at all.
    return false;
  }

  if (checkout.payment_status !== 'paid') return false;

  const sessionId = checkout.metadata?.sessionId;
  const userId = checkout.metadata?.userId;
  const assessmentId = checkout.metadata?.assessmentId;

  // The checkout must be for the report being opened. Without this, a valid
  // checkout id could unlock any session someone named in the URL.
  if (!sessionId || sessionId !== expectedSessionId || !userId || !assessmentId) return false;

  const { error } = await admin.from('assessment_entitlements').insert({
    user_id: userId,
    session_id: sessionId,
    assessment_id: assessmentId,
    source: 'purchase',
    provider: 'stripe',
    provider_ref: checkout.id,
    amount_cents: checkout.amount_total,
    currency: checkout.currency,
  });

  // 23505 means the webhook got there first. Access exists either way.
  if (error && error.code !== '23505') {
    console.error('[nura] could not grant on return', error.message);
    return false;
  }

  return true;
}
