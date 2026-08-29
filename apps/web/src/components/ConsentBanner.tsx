'use client';

import { useEffect, useRef, useState } from 'react';
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
 *
 * IT IS AN OVERLAY, SO IT PAYS FOR ITS OWN SPACE. Fixed to the bottom of the
 * screen, it was sitting on top of the page — on a phone that meant the intro
 * screen's own "Começar" button, and the answers to the first question, were
 * underneath it. The banner measures itself and publishes its height as
 * `--consent-height`, which the layout turns into bottom padding: nothing ends
 * up unreachable behind a card asking about cookies.
 *
 * Measured rather than a magic number, because the text wraps to a different
 * number of lines in each of the three locales, and to two more on a narrow
 * phone. While someone is answering a question the banner hides entirely —
 * see `useFocusMode`.
 */
export function ConsentBanner() {
  const t = useTranslations('consent');
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storedConsent() === null) {
      setVisible(true);
    } else {
      restoreAnalyticsConsent();
    }
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!visible || !card) return;

    const publish = () => {
      const height = card.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--consent-height', `${Math.ceil(height)}px`);
      document.body.classList.add('has-consent');
    };

    publish();
    // Rotating the phone or switching locale changes how the text wraps.
    const observer = new ResizeObserver(publish);
    observer.observe(card);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--consent-height');
      document.body.classList.remove('has-consent');
    };
  }, [visible]);

  if (!visible) return null;

  const decide = (grant: boolean) => {
    if (grant) grantAnalyticsConsent();
    else denyAnalyticsConsent();
    setVisible(false);
  };

  return (
    <div
      className="consent-banner"
      ref={cardRef}
      role="dialog"
      aria-live="polite"
      aria-label={t('ariaLabel')}
    >
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
