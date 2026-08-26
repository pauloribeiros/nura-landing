'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { track } from '@/lib/analytics';

/**
 * Sends the reader to checkout.
 *
 * It knows only a session id. Price and product are decided server side from
 * that id alone, so there is nothing here worth tampering with.
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

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, locale }),
      });

      if (!response.ok) {
        setState('error');
        return;
      }

      const { url } = (await response.json()) as { url: string };
      // A full navigation rather than a router push: the destination is
      // Stripe's domain, not ours.
      window.location.href = url;
    } catch {
      setState('error');
    }
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
