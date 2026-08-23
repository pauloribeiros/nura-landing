'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { FEATURED_ASSESSMENT, assessmentLandingPath, catalogPath } from '@/content/landing';
import { LocaleSwitcher } from './LocaleSwitcher';

/**
 * Header for inner pages. The home page uses `Header`, which additionally
 * carries the section anchors and the scroll-driven CTA state; those make no
 * sense once the visitor has left the landing.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
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
            href={strip(assessmentLandingPath(locale, FEATURED_ASSESSMENT))}
          >
            {t('start')} <span className="desktop-only">{t('startFreeSuffix')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
