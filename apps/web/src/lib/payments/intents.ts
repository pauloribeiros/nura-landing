import 'server-only';

import type Stripe from 'stripe';
import { CURRENCY, PRICE_CENTS } from './stripe';

/**
 * A criacao dos PaymentIntents de uma corrida, num lugar so.
 *
 * POR QUE ISTO SAIU DA ROTA: quem precisa do intent e a pagina de pagamento, e
 * ela ja sabe tudo o que a rota descobriria — dono, avaliacao, resultado. Ate
 * aqui o navegador carregava a pagina, hidratava, e SO ENTAO pedia o intent
 * numa chamada que refazia a autenticacao e tres consultas antes de falar com
 * o Stripe. Eram varios segundos entre a pagina aparecer e os campos de cartao
 * existirem, com um "carregando" no lugar deles.
 *
 * Agora a pagina abre os intents no proprio render e entrega o segredo pronto.
 * A rota continua de pe como saida de emergencia: se a criacao no servidor
 * falhar, a tela pede por ali, exatamente como antes.
 */

/** Um metodo do acordeao. Cada painel monta o seu Payment Element. */
export type MetodoDePagamento = 'card' | 'pix';

export interface SegredoDeMetodo {
  clientSecret?: string;
  /**
   * Falso quando a conta do Stripe nao processa aquele metodo. A tela precisa
   * SABER disso: sem o aviso, o painel do Pix acabaria mostrando um formulario
   * de cartao, que e pior do que nao oferecer Pix nenhum.
   */
  atendido: boolean;
}

export interface DadosDaCobranca {
  sessionId: string;
  userId: string;
  assessmentId: string;
  locale?: string;
  email?: string;
}

/**
 * Abre um intent para um metodo.
 *
 * NADA AQUI VEM DO NAVEGADOR alem do e-mail do recibo: preco, moeda e dono sao
 * decididos no servidor, porque um navegador que pudesse nomear o proprio
 * preco seria o bug mais antigo do comercio.
 */
export async function abrirIntent(
  stripe: Stripe,
  metodo: MetodoDePagamento | undefined,
  dados: DadosDaCobranca,
): Promise<SegredoDeMetodo | null> {
  const criar = (comMetodo: boolean) =>
    stripe.paymentIntents.create({
      amount: PRICE_CENTS,
      currency: CURRENCY,
      ...(comMetodo && metodo === 'card'
        ? { payment_method_types: ['card'] }
        : comMetodo && metodo === 'pix'
          ? { payment_method_types: ['pix'] }
          : { automatic_payment_methods: { enabled: true } }),
      ...(dados.email && dados.email.length <= 320 ? { receipt_email: dados.email } : {}),
      // Lidos de volta pelo webhook. Verificados por quem chamou.
      metadata: {
        sessionId: dados.sessionId,
        userId: dados.userId,
        assessmentId: dados.assessmentId,
        locale: dados.locale ?? '',
      },
    });

  let atendido = true;
  let intent: Stripe.PaymentIntent;
  try {
    intent = await criar(true);
  } catch (erro) {
    // Um metodo que a conta nao habilitou faz o Stripe recusar a criacao
    // inteira. Melhor abrir com o que a conta tem do que devolver erro para
    // quem ja decidiu pagar.
    const invalido =
      erro instanceof Error && 'type' in erro && erro.type === 'StripeInvalidRequestError';
    if (!invalido) throw erro;
    console.warn('[nura] metodo indisponivel na conta, usando o padrao', metodo);
    atendido = false;
    intent = await criar(false);
  }

  if (!intent.client_secret) return null;
  return { clientSecret: intent.client_secret, atendido };
}

/** O que a tela de pagamento precisa para montar os dois paineis. */
export type SegredosIniciais = Partial<Record<MetodoDePagamento, SegredoDeMetodo>>;

/**
 * Abre os dois intents de uma vez, em paralelo.
 *
 * NUNCA REJEITA. Um erro aqui viraria uma pagina de pagamento que nao carrega,
 * quando o certo e uma pagina que carrega e pede o intent pela rota — o
 * caminho antigo, que continua funcionando. Por isso cada lado e resolvido em
 * separado: se o Pix falhar, o cartao ainda chega pronto.
 */
export async function abrirIntentsDaCobranca(
  stripe: Stripe,
  dados: DadosDaCobranca,
): Promise<SegredosIniciais> {
  const tentar = async (metodo: MetodoDePagamento) => {
    try {
      return await abrirIntent(stripe, metodo, dados);
    } catch (erro) {
      console.error('[nura] falha ao abrir intent no servidor', metodo, erro);
      return null;
    }
  };

  const [card, pix] = await Promise.all([tentar('card'), tentar('pix')]);
  return {
    ...(card ? { card } : {}),
    ...(pix ? { pix } : {}),
  };
}
