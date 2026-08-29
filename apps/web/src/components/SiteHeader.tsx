'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { catalogPath } from '@/content/landing';
import { LocaleSwitcher } from './LocaleSwitcher';

/**
 * Header for inner pages. The home page uses `Header`, which additionally
 * carries the section anchors and the scroll-driven CTA state; those make no
 * sense once the visitor has left the landing.
 *
 * "Começar" goes to the catalogue — the page that asks what the visitor would
 * like to find out and lists what is available. It used to go straight to the
 * featured assessment, which decided for them; from anywhere that is not that
 * assessment's page, being handed a menu beats being handed one door.
 *
 * `ctaHref` overrides it for pages that know better. An assessment's own
 * landing passes its start path: there, "Começar" means start THIS one, and
 * the default would have been a link to the page the visitor is already on —
 * a dead tap, and on a phone the whole funnel, since the hero CTA sits below
 * the fold at 375x812 and the header button is the one reached first.
 */
export function SiteHeader({ locale, ctaHref }: { locale: Locale; ctaHref?: string }) {
  const t = useTranslations('nav');
  const tb = useTranslations('brand');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 28);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const strip = (path: string) => path.replace(`/${locale}`, '') || '/';

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="wrap header-inner">
        <Link className="brand" href="/" aria-label={tb('backToTop')}>
          <span className="brand-mark" aria-hidden="true" />
          {tb('name')}
        </Link>
        <nav className="nav" aria-label={t('label')}>
          <Link href={strip(catalogPath(locale))}>{t('assessments')}</Link>
        </nav>
        <div className="header-actions">
          <LocaleSwitcher />
          <Link
            className="button button-primary"
            href={ctaHref ?? strip(catalogPath(locale))}
          >
            {t('start')} <span className="desktop-only">{t('startFreeSuffix')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
