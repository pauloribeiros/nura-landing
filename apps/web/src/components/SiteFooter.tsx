'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';

/** Compact footer for inner pages. */
export function SiteFooter() {
  const t = useTranslations('footer');
  const tb = useTranslations('brand');

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Link className="brand footer-brand" href="/" aria-label={tb('backToTop')}>
              <span className="brand-mark" aria-hidden="true" />
              {tb('name')}
            </Link>
            <p className="footer-copy">{t('copy')}</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t('rights', { year: new Date().getFullYear() })}</span>
          <span>{t('tagline')}</span>
          {/* Required by the Storyset licence: the break-screen illustrations
              are free for commercial use only while this credit is visible.
              See TransitionArt. */}
          <a className="footer-credit" href="https://storyset.com" target="_blank" rel="noopener noreferrer">
            {t('credits')}
          </a>
          <LocaleSwitcher variant="footer" />
        </div>
      </div>
    </footer>
  );
}
