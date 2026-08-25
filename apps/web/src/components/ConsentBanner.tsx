'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  denyAnalyticsConsent,
  grantAnalyticsConsent,
  restoreAnalyticsConsent,
  storedConsent,
} from '@/lib/analytics';

/**
 * LGPD consent for analytics. Nothing is measured until the visitor says yes —
 * `track()` is a no-op without it — so this banner is what turns the funnel
 * on, one visitor at a time.
 *
 * Renders nothing until mounted (the choice lives in localStorage, which the
 * server cannot read), and nothing at all once a choice exists. Declining is a
 * single click and costs the visitor nothing: the assessment works identically
 * either way.
 */
export function ConsentBanner() {
  const t = useTranslations('consent');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (storedConsent() === null) {
      setVisible(true);
    } else {
      restoreAnalyticsConsent();
    }
  }, []);

  if (!visible) return null;

  const decide = (grant: boolean) => {
    if (grant) grantAnalyticsConsent();
    else denyAnalyticsConsent();
    setVisible(false);
  };

  return (
    <div className="consent-banner" role="dialog" aria-live="polite" aria-label={t('ariaLabel')}>
      <p>{t('text')}</p>
      <div className="consent-actions">
        <button type="button" className="button button-primary" onClick={() => decide(true)}>
          {t('accept')}
        </button>
        <button type="button" className="button button-ghost" onClick={() => decide(false)}>
          {t('decline')}
        </button>
      </div>
    </div>
  );
}
