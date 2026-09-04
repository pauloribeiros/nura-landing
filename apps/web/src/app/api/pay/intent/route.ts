import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { getStripe } from '@/lib/payments/stripe';
import { abrirIntent, type MetodoDePagamento } from '@/lib/payments/intents';
import { reportIsSellable } from '@/content/landing';

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
 *
 * ESTA ROTA HOJE É A SAÍDA DE EMERGÊNCIA. O caminho normal é a própria página
 * de pagamento abrir os intents no render e entregar o segredo pronto — ver
 * `abrirIntentsDaCobranca`. A tela só chega aqui quando aquilo falhou, e é por
 * isso que a rota continua verificando tudo por conta própria: ela não pode
 * confiar em quem a chamou.
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

  // Uma avaliacao cujo relatorio ainda nao foi escrito nao entra em cobranca.
  // A checagem e aqui, no servidor, e nao so na tela: e o unico ponto por onde
  // o dinheiro passa, e uma tela pode ser contornada.
  if (!reportIsSellable(sessao.assessment_id)) {
    return NextResponse.json({ error: 'report-not-ready' }, { status: 409 });
  }

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

  const metodo: MetodoDePagamento | undefined =
    body.metodo === 'card' || body.metodo === 'pix' ? body.metodo : undefined;

  const segredo = await abrirIntent(stripe, metodo, {
    sessionId,
    userId: auth.user.id,
    assessmentId: sessao.assessment_id,
    locale: body.locale,
    email: typeof body.email === 'string' ? body.email : undefined,
  });

  if (!segredo) {
    return NextResponse.json({ error: 'intent-failed' }, { status: 502 });
  }

  return NextResponse.json(segredo);
}
