import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { abrirIntent, abrirIntentsDaCobranca } from './intents';
import { CURRENCY, PRICE_CENTS } from './stripe';

/**
 * O que estes testes protegem e o caminho do dinheiro na hora de abrir a
 * cobranca. Duas coisas nao podem sair errado aqui: o preco, que nunca vem do
 * navegador, e o comportamento diante de um metodo que a conta nao processa —
 * porque a saida ingenua, deixar o erro subir, apaga a pagina de pagamento
 * inteira de quem ja tinha decidido pagar.
 */

const DADOS = {
  sessionId: 'sess-1',
  userId: 'user-1',
  assessmentId: 'cognition',
  locale: 'pt-br',
  email: 'alguem@exemplo.com',
};

/** Um Stripe de mentira: so o que este modulo chama. */
function stripeFalso(create: ReturnType<typeof vi.fn>) {
  return { paymentIntents: { create } } as unknown as Stripe;
}

const ok = (secret = 'pi_1_secret') =>
  vi.fn().mockResolvedValue({ client_secret: secret } as Stripe.PaymentIntent);

class ErroDeMetodo extends Error {
  type = 'StripeInvalidRequestError';
}

describe('abrirIntent', () => {
  it('cobra o preco do servidor, na moeda do servidor', async () => {
    const create = ok();
    await abrirIntent(stripeFalso(create), 'card', DADOS);

    const args = create.mock.calls[0][0];
    expect(args.amount).toBe(PRICE_CENTS);
    expect(args.currency).toBe(CURRENCY);
  });

  it('leva a sessao e o dono nos metadados, que e o que o webhook le', async () => {
    const create = ok();
    await abrirIntent(stripeFalso(create), 'card', DADOS);

    expect(create.mock.calls[0][0].metadata).toMatchObject({
      sessionId: 'sess-1',
      userId: 'user-1',
      assessmentId: 'cognition',
    });
  });

  it('pede ao Stripe exatamente o metodo do painel', async () => {
    const cartao = ok();
    await abrirIntent(stripeFalso(cartao), 'card', DADOS);
    expect(cartao.mock.calls[0][0].payment_method_types).toEqual(['card']);

    const pix = ok();
    await abrirIntent(stripeFalso(pix), 'pix', DADOS);
    expect(pix.mock.calls[0][0].payment_method_types).toEqual(['pix']);
  });

  it('AVISA quando a conta nao processa o metodo, em vez de estourar', async () => {
    // Sem o `atendido: false`, o painel do Pix acabaria mostrando um
    // formulario de cartao — pior do que nao oferecer Pix nenhum.
    const create = vi
      .fn()
      .mockRejectedValueOnce(new ErroDeMetodo('pix nao habilitado'))
      .mockResolvedValueOnce({ client_secret: 'pi_2_secret' } as Stripe.PaymentIntent);

    const r = await abrirIntent(stripeFalso(create), 'pix', DADOS);
    expect(r).toEqual({ clientSecret: 'pi_2_secret', atendido: false });
    // A segunda tentativa nao pede metodo nenhum: usa o que a conta tem.
    expect(create.mock.calls[1][0].payment_method_types).toBeUndefined();
  });

  it('deixa passar um erro que nao e de metodo, sem virar cobranca torta', async () => {
    const create = vi.fn().mockRejectedValue(new Error('rede caiu'));
    await expect(abrirIntent(stripeFalso(create), 'card', DADOS)).rejects.toThrow('rede caiu');
  });

  it('nao aceita um e-mail absurdo como recibo', async () => {
    const create = ok();
    await abrirIntent(stripeFalso(create), 'card', { ...DADOS, email: 'a'.repeat(400) });
    expect(create.mock.calls[0][0].receipt_email).toBeUndefined();
  });

  it('devolve nulo quando o Stripe nao deu segredo', async () => {
    const create = vi.fn().mockResolvedValue({ client_secret: null } as unknown as Stripe.PaymentIntent);
    expect(await abrirIntent(stripeFalso(create), 'card', DADOS)).toBeNull();
  });
});

describe('abrirIntentsDaCobranca', () => {
  it('abre os dois de uma vez', async () => {
    const create = ok();
    const r = await abrirIntentsDaCobranca(stripeFalso(create), DADOS);
    expect(r.card?.clientSecret).toBe('pi_1_secret');
    expect(r.pix?.clientSecret).toBe('pi_1_secret');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('NUNCA REJEITA: uma falha vira ausencia, e a tela pede pela rota', async () => {
    // Rejeitar aqui derrubaria a pagina de pagamento inteira. O certo e a
    // pagina carregar e o caminho antigo — `/api/pay/intent` — assumir.
    const create = vi.fn().mockRejectedValue(new Error('stripe fora do ar'));
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});

    const r = await abrirIntentsDaCobranca(stripeFalso(create), DADOS);
    expect(r).toEqual({});
    espia.mockRestore();
  });

  it('a falha de um metodo nao leva o outro junto', async () => {
    const create = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve({ client_secret: 'pi_card' }))
      .mockImplementationOnce(() => Promise.reject(new Error('pix fora')));
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});

    const r = await abrirIntentsDaCobranca(stripeFalso(create), DADOS);
    expect(r.card?.clientSecret).toBe('pi_card');
    expect(r.pix).toBeUndefined();
    espia.mockRestore();
  });
});
