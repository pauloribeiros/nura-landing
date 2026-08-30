'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, CreditCard, QrCode, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { track } from '@/lib/analytics';

/**
 * Escolha da forma de pagamento, um painel aberto por vez, e o pagamento
 * acontecendo dentro da própria página.
 *
 * OS CAMPOS DE CARTÃO SÃO DO STRIPE. Eles aparecem dentro do nosso painel e
 * usam a nossa tipografia e as nossas cores, mas cada campo é um iframe do
 * Stripe: o número do cartão nunca toca o nosso JavaScript nem o nosso
 * servidor. É o que permite ter o formulário aqui sem assumir PCI — e é
 * também por isso que não existe um `<input>` de cartão neste arquivo.
 *
 * A ALTURA É ANIMADA COM GRID, não com `height`. `height: auto` não é
 * animável, e a saída comum — medir o conteúdo com JS e escrever pixels — sai
 * errada assim que a fonte carrega ou o Payment Element termina de montar e
 * cresce. `grid-template-rows: 0fr -> 1fr` acompanha a altura real do que está
 * lá dentro, inclusive quando ela muda sozinha.
 *
 * UM INTENT POR MÉTODO, criado só quando o painel abre. O Payment Element
 * mostra o que o intent aceita, então é assim que o painel do cartão mostra
 * cartão e o do Pix mostra Pix — em vez de um acordeão do Stripe dentro do
 * nosso acordeão.
 *
 * ACESSIBILIDADE: `aria-expanded` e `aria-controls` no cabeçalho, `region`
 * apontando de volta, e o conteúdo de um painel fechado fora da ordem de
 * tabulação. A transição inteira vive dentro de `prefers-reduced-motion:
 * no-preference`.
 */

type Metodo = 'wallet' | 'card' | 'pix';

const chavePublica = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = chavePublica ? loadStripe(chavePublica) : null;

/** O visual do Stripe alinhado ao nosso, para não parecer um enxerto. */
const appearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#22d3e5',
    colorBackground: '#0d1220',
    colorText: '#f8faff',
    colorDanger: '#f0b23c',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
};

export function CheckoutAccordion({ sessionId, email }: { sessionId: string; email?: string }) {
  const t = useTranslations('iq_checkout');
  const locale = useLocale();
  // Pix aberto por padrao: no celular e o caminho mais curto — nada para
  // digitar, aprovacao na hora, e e o metodo que mais converte no Brasil.
  const [aberto, setAberto] = useState<Metodo>('pix');
  const [segredos, setSegredos] = useState<Partial<Record<'card' | 'pix', string>>>({});
  const [erro, setErro] = useState(false);
  // Metodos que a conta do Stripe nao processa: some do acordeao em vez de
  // abrir prometendo Pix e mostrando cartao.
  const [indisponiveis, setIndisponiveis] = useState<string[]>([]);
  const [carteiras, setCarteiras] = useState(false);

  /** Abre o intent daquele método uma vez só e guarda o segredo. */
  const pedirSegredo = useCallback(
    async (metodo: 'card' | 'pix') => {
      if (segredos[metodo]) return;
      try {
        const resposta = await fetch('/api/pay/intent', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId, locale, metodo, email }),
        });
        if (!resposta.ok) {
          setErro(true);
          return;
        }
        const { clientSecret, atendido } = (await resposta.json()) as {
          clientSecret: string;
          atendido?: boolean;
        };
        if (atendido === false) {
          setIndisponiveis((atual) => (atual.includes(metodo) ? atual : [...atual, metodo]));
          setAberto((atualAberto) => (atualAberto === metodo ? 'card' : atualAberto));
          return;
        }
        setSegredos((atual) => ({ ...atual, [metodo]: clientSecret }));
      } catch {
        setErro(true);
      }
    },
    [segredos, sessionId, locale, email],
  );

  // O Pix abre por padrão; o intent do cartão vem junto porque é ele que as
  // carteiras usam, e o Express Checkout precisa dele para saber se há
  // Apple Pay ou Google Pay neste aparelho.
  useEffect(() => {
    void pedirSegredo('pix');
    void pedirSegredo('card');
    // Uma vez: o segredo é guardado e `pedirSegredo` sai cedo depois disso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrir = (metodo: Metodo) => {
    setAberto(metodo);
    if (metodo === 'pix') void pedirSegredo('pix');
  };

  const itens: { id: Metodo; icone: React.ReactNode }[] = [
    ...(carteiras ? [{ id: 'wallet' as const, icone: <Wallet size={18} aria-hidden="true" /> }] : []),
    ...(indisponiveis.includes('pix')
      ? []
      : [{ id: 'pix' as const, icone: <QrCode size={18} aria-hidden="true" /> }]),
    { id: 'card', icone: <CreditCard size={18} aria-hidden="true" /> },
  ];

  const retorno =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/${locale}/p/${sessionId}?pago=1`;

  return (
    <div className="pay-accordion">
      {/* Fica montado fora do acordeão: é ele que diz se há Apple Pay ou
          Google Pay neste aparelho, e sem essa resposta o item não deve
          aparecer prometendo algo que não vai abrir. */}
      {stripePromise && segredos.card ? (
        <div className={carteiras ? 'pay-wallet-probe is-live' : 'pay-wallet-probe'}>
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: segredos.card, appearance, locale: locale as 'pt-BR' }}
          >
            <ExpressCheckoutElement
              onReady={({ availablePaymentMethods }) => {
                setCarteiras(Boolean(availablePaymentMethods));
              }}
              onConfirm={() => track('checkout_started', { assessment: 'cognition' })}
              options={{ buttonHeight: 48 }}
            />
          </Elements>
        </div>
      ) : null}

      {itens.map(({ id, icone }) => {
        const expandido = aberto === id;
        const segredo = id === 'pix' ? segredos.pix : segredos.card;

        return (
          <section key={id} className={`pay-item ${expandido ? 'is-open' : ''}`}>
            <h3>
              <button
                type="button"
                className="pay-head"
                aria-expanded={expandido}
                aria-controls={`pay-panel-${id}`}
                id={`pay-head-${id}`}
                onClick={() => abrir(id)}
              >
                <span className="pay-radio" aria-hidden="true">
                  {expandido ? <Check size={12} strokeWidth={3} /> : null}
                </span>
                {icone}
                <span className="pay-name">{t(`${id}.name`)}</span>
                <span className="pay-note">{t(`${id}.note`)}</span>
              </button>
            </h3>

            <div className="pay-panel" id={`pay-panel-${id}`} role="region" aria-labelledby={`pay-head-${id}`}>
              <div className="pay-panel-inner" inert={!expandido}>
                <p>{t(`${id}.body`)}</p>

                {id === 'wallet' ? null : !stripePromise ? (
                  <p className="runner-hint">{t('semChave')}</p>
                ) : segredo ? (
                  <Elements
                    key={id}
                    stripe={stripePromise}
                    options={{ clientSecret: segredo, appearance, locale: locale as 'pt-BR' }}
                  >
                    <Formulario
                      retorno={retorno}
                      rotulo={t('cta', { preco: t('price') })}
                      enviando={t('sending')}
                      aguardando={t('waiting')}
                    />
                  </Elements>
                ) : (
                  <p className="runner-hint">{t('carregando')}</p>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {erro ? <p className="runner-hint">{t('error')}</p> : null}
      <p className="pay-secure">{t('secure')}</p>
    </div>
  );
}

/**
 * Os campos do Stripe e o botão que confirma.
 *
 * `redirect: 'if_required'` mantém quem paga com cartão nesta página: só sai
 * dela quem escolheu um método que exige sair.
 *
 * O QUE O PIX ENSINOU: confirmar sem erro não quer dizer pago. No cartão o
 * pagamento acaba ali; no Pix ele nasce em `requires_action` e o Stripe mostra
 * o QR na própria tela, esperando o app do banco. A primeira versão daqui
 * navegava para a página de retorno assim que `confirmPayment` voltava sem
 * erro — e levava embora justamente o QR que a pessoa precisava ler. Agora
 * quem manda é o STATUS: só `succeeded` sai da página; `requires_action` e
 * `processing` ficam, com a tela do Stripe visível, e a página pergunta ao
 * Stripe de tempos em tempos se o pagamento caiu.
 */
function Formulario({
  retorno,
  rotulo,
  enviando,
  aguardando,
}: {
  retorno: string;
  rotulo: string;
  enviando: string;
  aguardando: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'aguardando'>('idle');
  const [mensagem, setMensagem] = useState<string | null>(null);

  const pagar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!stripe || !elements || estado === 'enviando') return;

    setEstado('enviando');
    setMensagem(null);
    track('checkout_started', { assessment: 'cognition' });

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: retorno },
      redirect: 'if_required',
    });

    if (error) {
      // A mensagem vem do Stripe já no idioma da pessoa e diz o que houve —
      // cartão recusado, dado inválido. Reescrever isso só perderia
      // informação.
      setMensagem(error.message ?? null);
      setEstado('idle');
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      window.location.href = retorno;
      return;
    }

    // Pix, boleto, qualquer coisa que dependa de um segundo passo: a tela do
    // Stripe com o QR fica onde está, e daqui a página só pergunta se caiu.
    setEstado('aguardando');
    const segredo = paymentIntent?.client_secret;
    if (!segredo) return;

    const relogio = window.setInterval(async () => {
      const { paymentIntent: atual } = await stripe.retrievePaymentIntent(segredo);
      if (atual?.status === 'succeeded') {
        window.clearInterval(relogio);
        window.location.href = retorno;
      }
    }, 3000);
  };

  return (
    <form onSubmit={pagar} className="pay-form">
      <PaymentElement options={{ layout: 'tabs' }} />
      {estado === 'aguardando' ? (
        <p className="pay-waiting">{aguardando}</p>
      ) : (
        <button type="submit" className="button button-primary" disabled={!stripe || estado === 'enviando'}>
          {estado === 'enviando' ? enviando : rotulo}
        </button>
      )}
      {mensagem ? <p className="runner-hint">{mensagem}</p> : null}
    </form>
  );
}
