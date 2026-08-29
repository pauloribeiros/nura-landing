'use client';

import { useState } from 'react';
import { Check, CreditCard, QrCode } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { track } from '@/lib/analytics';

/**
 * Escolha da forma de pagamento, um painel aberto por vez.
 *
 * A ALTURA É ANIMADA COM GRID, não com `height`. `height: auto` não é
 * animável, e a saída comum — medir o conteúdo com JS e escrever pixels — sai
 * errada assim que a fonte carrega, o texto quebra em outra largura ou o
 * painel muda de conteúdo. `grid-template-rows: 0fr -> 1fr` anima até a altura
 * real do que está lá dentro, sem medir nada e sem biblioteca.
 *
 * ACESSIBILIDADE: cada cabeçalho é um botão com `aria-expanded` e
 * `aria-controls`, e o painel é `role="region"` apontando de volta. Quem
 * navega por teclado ou leitor de tela recebe a mesma informação que o
 * desenho dá — o que está aberto e o que aquilo controla.
 *
 * QUEM DESLIGOU ANIMAÇÃO não vê o deslize: a transição inteira fica dentro de
 * `prefers-reduced-motion: no-preference`, no CSS. O painel continua abrindo e
 * fechando, só que instantaneamente.
 *
 * O PAGAMENTO EM SI é do Stripe. Nenhum campo de cartão vive nesta página, e
 * é de propósito: dado de cartão digitado numa página nossa é responsabilidade
 * nossa perante o PCI, e não há motivo para assumir isso quando o Stripe já
 * resolve. Este painel leva para o checkout com o método já escolhido.
 */

type Metodo = 'pix' | 'card';

export function CheckoutAccordion({ sessionId }: { sessionId: string }) {
  const t = useTranslations('iq_checkout');
  const locale = useLocale();
  const [aberto, setAberto] = useState<Metodo>('pix');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'erro'>('idle');

  const pagar = async (metodo: Metodo) => {
    if (estado === 'enviando') return;
    setEstado('enviando');
    track('checkout_started', { assessment: 'cognition' });

    try {
      const resposta = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, locale, metodo }),
      });
      if (!resposta.ok) {
        setEstado('erro');
        return;
      }
      const { url } = (await resposta.json()) as { url: string };
      window.location.href = url;
    } catch {
      setEstado('erro');
    }
  };

  const metodos: { id: Metodo; icone: React.ReactNode }[] = [
    { id: 'pix', icone: <QrCode size={18} aria-hidden="true" /> },
    { id: 'card', icone: <CreditCard size={18} aria-hidden="true" /> },
  ];

  return (
    <div className="pay-accordion">
      {metodos.map(({ id, icone }) => {
        const expandido = aberto === id;
        return (
          <section key={id} className={`pay-item ${expandido ? 'is-open' : ''}`}>
            <h3>
              <button
                type="button"
                className="pay-head"
                aria-expanded={expandido}
                aria-controls={`pay-panel-${id}`}
                id={`pay-head-${id}`}
                onClick={() => setAberto(id)}
              >
                <span className="pay-radio" aria-hidden="true">
                  {expandido ? <Check size={12} strokeWidth={3} /> : null}
                </span>
                {icone}
                <span className="pay-name">{t(`${id}.name`)}</span>
                <span className="pay-note">{t(`${id}.note`)}</span>
              </button>
            </h3>

            {/* O grid de uma linha é o que torna a altura animável. */}
            <div className="pay-panel" id={`pay-panel-${id}`} role="region" aria-labelledby={`pay-head-${id}`}>
              <div className="pay-panel-inner">
                <p>{t(`${id}.body`)}</p>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => pagar(id)}
                  disabled={estado === 'enviando'}
                  // Fora do painel aberto o botão sai da ordem de tabulação,
                  // senão o teclado passa por dentro de algo invisível.
                  tabIndex={expandido ? 0 : -1}
                >
                  {estado === 'enviando' ? t('sending') : t('cta', { preco: t('price') })}
                </button>
              </div>
            </div>
          </section>
        );
      })}

      {estado === 'erro' ? <p className="runner-hint">{t('error')}</p> : null}
      <p className="pay-secure">{t('secure')}</p>
    </div>
  );
}
