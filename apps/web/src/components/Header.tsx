'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SECTION_IDS } from '@/content/landing';
import { useLanding } from './LandingProvider';
import { CtaLink } from './CtaLink';
import { LocaleSwitcher } from './LocaleSwitcher';
import { scrollToId } from './scroll';

export function NuraLogo({ light = true }: { light?: boolean }) {
  const t = useTranslations('brand');
  return (
    <a
      className={`brand ${light ? '' : 'footer-brand'}`}
      href={`#${SECTION_IDS.top}`}
      aria-label={t('backToTop')}
    >
      <span className="brand-mark" aria-hidden="true" />
      {t('name')}
    </a>
  );
}

export function Header() {
  const t = useTranslations('nav');
  const tf = useTranslations('feedback');
  const { notify } = useLanding();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 28);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Escape closes the panel and returns focus to the control that opened it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const go = (id: string) => scrollToId(id, () => setOpen(false));

  const links = [
    { id: SECTION_IDS.assessments, label: t('assessments'), mobileLabel: t('assessments') },
    { id: SECTION_IDS.howItWorks, label: t('howItWorks'), mobileLabel: t('howItWorks') },
    { id: SECTION_IDS.profile, label: t('profile'), mobileLabel: t('profile') },
    { id: SECTION_IDS.trust, label: t('about'), mobileLabel: t('aboutPrivacy') },
  ];

  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="wrap header-inner">
          <NuraLogo />
          <nav className="nav" aria-label={t('label')}>
            {links.map((l) => (
              <a key={l.id} href={`#${l.id}`}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <LocaleSwitcher />
            <button type="button" className="header-login" onClick={() => notify(tf('loginSoon'))}>
              {t('login')}
            </button>
            {/* The menu, not one door — same reasoning as SiteHeader. */}
            <CtaLink to="catalog" withIcon={false}>
              {t('start')} <span className="desktop-only">{t('startFreeSuffix')}</span>
            </CtaLink>
            <button
              ref={toggleRef}
              type="button"
              className="menu-button"
              aria-label={open ? t('closeMenu') : t('openMenu')}
              aria-expanded={open}
              aria-controls="nura-mobile-nav"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <>
          <div className="mobile-nav-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav
            id="nura-mobile-nav"
            ref={panelRef}
            className="mobile-nav"
            aria-label={t('mobileLabel')}
          >
            {links.map((l) => (
              <a key={l.id} href={`#${l.id}`} onClick={() => go(l.id)}>
                {l.mobileLabel}
              </a>
            ))}
            <div className="mobile-nav-locale">
              <LocaleSwitcher variant="footer" />
            </div>
          </nav>
        </>
      ) : null}
    </>
  );
}
