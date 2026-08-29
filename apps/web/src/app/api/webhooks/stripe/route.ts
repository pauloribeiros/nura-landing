import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/payments/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { sendReportEmail } from '@/lib/email/sendReport';

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

  /**
   * Os dois jeitos de pagar chegam aqui.
   *
   * `checkout.session.completed` e a pagina hospedada pelo Stripe;
   * `payment_intent.succeeded` e o pagamento feito dentro da nossa pagina, com
   * os campos do Payment Element. O que o resto do codigo precisa saber e o
   * mesmo nos dois casos, entao a diferenca acaba aqui.
   */
  let pago: {
    ref: string;
    sessionId?: string;
    userId?: string;
    assessmentId?: string;
    locale?: string;
    email?: string | null;
    amount: number | null;
    currency: string | null;
  } | null = null;

  if (event.type === 'checkout.session.completed') {
    const checkout = event.data.object as Stripe.Checkout.Session;
    // Uma sessao concluida ainda pode estar sem pagamento — uma transferencia
    // aguardando compensacao, por exemplo.
    if (checkout.payment_status !== 'paid') {
      return NextResponse.json({ received: true, granted: false });
    }
    pago = {
      ref: checkout.id,
      sessionId: checkout.metadata?.sessionId,
      userId: checkout.metadata?.userId,
      assessmentId: checkout.metadata?.assessmentId,
      locale: checkout.metadata?.locale,
      email: checkout.customer_details?.email ?? null,
      amount: checkout.amount_total,
      currency: checkout.currency,
    };
  } else if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    pago = {
      ref: intent.id,
      sessionId: intent.metadata?.sessionId,
      userId: intent.metadata?.userId,
      assessmentId: intent.metadata?.assessmentId,
      locale: intent.metadata?.locale,
      email: intent.receipt_email,
      amount: intent.amount_received ?? intent.amount,
      currency: intent.currency,
    };
  }

  if (!pago) {
    // Acknowledged and ignored. Answering 2xx keeps Stripe from retrying
    // events this endpoint has no opinion about.
    return NextResponse.json({ received: true });
  }

  const { ref, sessionId, userId, assessmentId } = pago;

  if (!sessionId || !userId || !assessmentId) {
    console.error('[nura] pagamento sem metadata', ref);
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
    provider_ref: ref,
    amount_cents: pago.amount,
    currency: pago.currency,
  });

  // 23505 is a unique violation: this event already granted, or the session
  // already had access. Both mean the desired state is the actual state.
  if (error && error.code !== '23505') {
    console.error('[nura] could not grant entitlement', error.message);
    // 500 asks Stripe to retry — the payment is real and access is owed.
    return NextResponse.json({ error: 'grant-failed' }, { status: 500 });
  }

  // O endereco que a pessoa deu para esta compra — no checkout hospedado, o
  // que o Stripe coletou; na nossa pagina, o que ela digitou antes de pagar.
  // Enviado depois que o acesso existe, nunca antes: um e-mail apontando para
  // um relatorio que ainda nao foi liberado e pior do que nenhum.
  if (pago.email) {
    await sendReportEmail({
      to: pago.email,
      sessionId,
      locale: pago.locale ?? 'pt-br',
    });
  }

  // Deliberately not part of the 2xx decision. The payment is settled and
  // access is granted; asking Stripe to redeliver because an email bounced
  // would re-run everything above for a problem retrying cannot fix.
  return NextResponse.json({ received: true, granted: true });
}
