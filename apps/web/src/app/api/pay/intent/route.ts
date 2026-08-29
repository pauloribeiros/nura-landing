import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { CURRENCY, PRICE_CENTS, getStripe } from '@/lib/payments/stripe';

/**
 * Abre um PaymentIntent para uma corrida.
 *
 * A diferença para `/api/checkout` é onde o pagamento acontece: lá a pessoa vai
 * para uma página do Stripe, aqui ela fica na nossa e os campos do cartão são
 * iframes do Stripe dentro do nosso desenho. O dado do cartão continua sem
 * passar por nós — é o que torna isso possível sem assumir PCI.
 *
 * O QUE DECIDE A COMPRA CONTINUA AQUI, no servidor, a partir do id da sessão:
 * preço, moeda e dono. Nada disso vem do corpo da requisição, porque um
 * navegador que pudesse nomear o próprio preço seria o bug mais antigo do
 * comércio.
 *
 * Ownership é resolvido pela RLS: a sessão é lida como o próprio visitante, e
 * uma que não seja dele não existe — a mesma resposta que um id inventado
 * recebe, para que ids não possam ser sondados.
 *
 * IDEMPOTÊNCIA: uma corrida já paga não abre outro intent. O webhook também se
 * protege pelo índice único em (provider, provider_ref), mas cobrar duas vezes
 * e estornar depois é pior do que não cobrar.
 */

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !supabaseConfigured) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  let body: { sessionId?: string; locale?: string; email?: string; metodo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const sessionId = body.sessionId;
  if (!sessionId) return NextResponse.json({ error: 'bad-request' }, { status: 400 });

  const cookieStore = await cookies();
  const comoVisitante = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });

  const { data: auth } = await comoVisitante.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const { data: sessao } = await comoVisitante
    .from('assessment_sessions')
    .select('id, assessment_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!sessao) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  // Vender o relatório de uma corrida que nunca foi pontuada seria receber por
  // algo que não existe do outro lado.
  const { data: resultado } = await comoVisitante
    .from('assessment_results')
    .select('session_id')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (!resultado) return NextResponse.json({ error: 'not-scored' }, { status: 409 });

  const { data: jaPago } = await comoVisitante
    .from('assessment_entitlements')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (jaPago) return NextResponse.json({ error: 'already-paid' }, { status: 409 });

  /**
   * Mesmo cuidado do checkout: um metodo que a conta nao habilitou faz o
   * Stripe recusar a criacao inteira. Melhor abrir com o que a conta tem do
   * que devolver erro para quem ja decidiu pagar.
   */
  const criarIntent = (comMetodo: boolean) =>
    stripe.paymentIntents.create({
      amount: PRICE_CENTS,
      currency: CURRENCY,
    // Um intent por método, porque cada painel do acordeão monta o seu próprio
    // Payment Element e ele mostra o que o intent aceita. Só dois valores são
    // aceitos; qualquer outra coisa cai nos métodos configurados na conta.
      ...(comMetodo && body.metodo === 'card'
        ? { payment_method_types: ['card'] }
        : comMetodo && body.metodo === 'pix'
          ? { payment_method_types: ['pix'] }
          : { automatic_payment_methods: { enabled: true } }),
    // O endereço que a pessoa digitou antes de pagar. Serve ao recibo do
    // Stripe e é por onde o webhook manda o relatório — não é segredo e não
    // decide preço nem acesso, então vir do cliente é aceitável.
      ...(typeof body.email === 'string' && body.email.length <= 320
        ? { receipt_email: body.email }
        : {}),
      // Lidos de volta pelo webhook. Os dois foram verificados acima.
      metadata: {
        sessionId,
        userId: auth.user.id,
        assessmentId: sessao.assessment_id,
        locale: body.locale ?? '',
      },
    });

  let intent;
  try {
    intent = await criarIntent(true);
  } catch (erro) {
    const invalido =
      erro instanceof Error && 'type' in erro && erro.type === 'StripeInvalidRequestError';
    if (!invalido) throw erro;
    console.warn('[nura] metodo indisponivel na conta, usando o padrao', body.metodo);
    intent = await criarIntent(false);
  }

  if (!intent.client_secret) {
    return NextResponse.json({ error: 'intent-failed' }, { status: 502 });
  }

  return NextResponse.json({ clientSecret: intent.client_secret });
}
