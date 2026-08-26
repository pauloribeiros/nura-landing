import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { CURRENCY, PRICE_CENTS, getStripe } from '@/lib/payments/stripe';
import { SITE_URL } from '@/lib/site';
import { reportPath } from '@/content/landing';
import { routing, type Locale } from '@/i18n/routing';

/**
 * Starts a checkout for one assessment run.
 *
 * Everything that decides WHAT is being sold is read here, server side, from
 * the session id alone. Nothing about price, product or ownership comes from
 * the request body — a browser that could name its own price would be the
 * oldest bug in commerce.
 *
 * Ownership is settled by RLS: the session is read as the caller, so one that
 * is not theirs returns nothing and the request 404s, the same answer a
 * non-existent session gets.
 *
 * The Stripe session carries `sessionId` and `userId` in metadata, and those
 * are what the webhook turns into an entitlement. They are set from values
 * this route verified, never echoed from the client.
 */

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !supabaseConfigured) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  let body: { sessionId?: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const sessionId = body.sessionId;
  if (!sessionId) return NextResponse.json({ error: 'bad-request' }, { status: 400 });

  const locale: Locale = routing.locales.includes(body.locale as Locale)
    ? (body.locale as Locale)
    : routing.defaultLocale;

  const cookieStore = await cookies();
  const asCaller = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });

  const { data: auth } = await asCaller.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const { data: session } = await asCaller
    .from('assessment_sessions')
    .select('id, assessment_id')
    .eq('id', sessionId)
    .maybeSingle();

  // Not yours and not real give the same answer, so ids cannot be probed.
  if (!session) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  // Selling a report for a run that was never scored would take money for
  // something that cannot be delivered.
  const { data: result } = await asCaller
    .from('assessment_results')
    .select('session_id')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!result) return NextResponse.json({ error: 'not-scored' }, { status: 409 });

  const { data: already } = await asCaller
    .from('assessment_entitlements')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (already) {
    // Already paid for. Send them to what they bought rather than charging
    // twice — the unique index would refuse the second grant anyway.
    return NextResponse.json({ url: `${SITE_URL}${reportPath(locale, sessionId)}` });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    // Payment methods come from the Stripe dashboard rather than being listed
    // here, so enabling Pix later needs no deploy.
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: {
            name: 'NURA — Relatório completo',
            description: 'Interpretação detalhada das suas respostas na avaliação de atenção.',
          },
        },
      },
    ],
    // Read back by the webhook. Both values were verified above.
    metadata: { sessionId, userId: auth.user.id, assessmentId: session.assessment_id },
    // `{CHECKOUT_SESSION_ID}` is substituted by Stripe. The report page uses
    // it to confirm payment directly, so a redirect that outruns the webhook
    // does not land a paying customer on a 404.
    success_url: `${SITE_URL}${reportPath(locale, sessionId)}?pago={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/${locale}`,
  });

  if (!checkout.url) {
    return NextResponse.json({ error: 'checkout-failed' }, { status: 502 });
  }

  return NextResponse.json({ url: checkout.url });
}
