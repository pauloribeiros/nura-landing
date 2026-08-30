'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { track } from '@/lib/analytics';

/**
 * Sends the reader to the payment page.
 *
 * Para a nossa pagina, nao direto ao Stripe: e la que a pessoa ve o que esta
 * comprando ao lado da escolha do meio de pagamento, e e la que os campos do
 * cartao aparecem sem ela sair do site. A pagina resolve dono e preco do lado
 * do servidor a partir do id da sessao, entao nao ha nada aqui para adulterar.
 *
 * Disabled without a session id, which happens when a result is rendered from
 * a local run that never reached the database — there would be nothing to buy
 * a report against.
 */
export function UnlockButton({ sessionId }: { sessionId?: string }) {
  const t = useTranslations('result_screen');
  const locale = useLocale();
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');

  const start = async () => {
    if (!sessionId) return;
    setState('sending');
    track('checkout_started', { assessment: 'attention' });
    window.location.href = `/${locale}/p/${sessionId}`;
  };

  return (
    <>
      <button
        type="button"
        className="button button-primary"
        onClick={start}
        disabled={!sessionId || state === 'sending'}
      >
        {state === 'sending' ? t('premiumSending') : t('premiumCta')}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      {state === 'error' ? <p className="runner-hint">{t('premiumError')}</p> : null}
    </>
  );
}
