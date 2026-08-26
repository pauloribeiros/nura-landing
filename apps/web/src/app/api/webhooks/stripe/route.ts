import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/payments/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

/**
 * Where a payment becomes access.
 *
 * This is the only place an entitlement is created, and it is reachable by
 * anyone on the internet — so the signature check is the whole security model.
 * `constructEvent` verifies the request was signed by Stripe with the secret
 * only Stripe and this deployment know. Without it, a forged POST would hand
 * out reports for free.
 *
 * The raw body is read as text on purpose: parsing it first would change the
 * bytes the signature covers and every verification would fail.
 *
 * Idempotent by construction rather than by trying to detect repeats. Stripe
 * redelivers on any non-2xx and sometimes on success, so the same event can
 * arrive several times; the unique index on (provider, provider_ref) makes the
 * second insert a no-op instead of a second grant.
 */

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = getSupabaseAdminClient();

  if (!stripe || !secret || !admin) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'unsigned' }, { status: 400 });

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (error) {
    // A bad signature is not an outage — answering 400 stops Stripe retrying
    // something that will never verify.
    console.warn('[nura] stripe signature rejected', error);
    return NextResponse.json({ error: 'bad-signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Acknowledged and ignored. Answering 2xx keeps Stripe from retrying
    // events this endpoint has no opinion about.
    return NextResponse.json({ received: true });
  }

  const checkout = event.data.object as Stripe.Checkout.Session;

  // Only a paid session grants anything. A completed checkout can still be
  // unpaid — a bank transfer awaiting clearing, for one.
  if (checkout.payment_status !== 'paid') {
    return NextResponse.json({ received: true, granted: false });
  }

  const sessionId = checkout.metadata?.sessionId;
  const userId = checkout.metadata?.userId;
  const assessmentId = checkout.metadata?.assessmentId;

  if (!sessionId || !userId || !assessmentId) {
    console.error('[nura] paid checkout without metadata', checkout.id);
    // 200 on purpose: retrying will not add metadata that was never set, and
    // this needs a human, not another delivery.
    return NextResponse.json({ received: true, granted: false });
  }

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

  // 23505 is a unique violation: this event already granted, or the session
  // already had access. Both mean the desired state is the actual state.
  if (error && error.code !== '23505') {
    console.error('[nura] could not grant entitlement', error.message);
    // 500 asks Stripe to retry — the payment is real and access is owed.
    return NextResponse.json({ error: 'grant-failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true, granted: true });
}
