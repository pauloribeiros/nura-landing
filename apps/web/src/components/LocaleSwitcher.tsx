'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LOCALE_META, locales, type Locale } from '@/i18n/routing';
import { Flag } from './Flag';

/**
 * Resolves the equivalent URL in another locale by reading the page's own
 * hreflang tags.
 *
 * Naively swapping the locale prefix does not work here: both the route
 * segment and the slug are localised, so /pt-br/testes/tdah is /en/tests/adhd,
 * not /en/testes/tdah. Every page already publishes that mapping for crawlers
 * through `alternates.languages`, so reading it back keeps one source of truth
 * — and any page added later gets a correct switcher for free.
 */
function alternateHref(locale: Locale): string {
  const tag = LOCALE_META[locale].lang;
  const link =
    document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${tag}"]`);
  if (link?.href) return new URL(link.href).pathname;
  // A page without alternates is not translated; the locale home is the
  // closest honest destination.
  return `/${locale}`;
}

export function LocaleSwitcher({ variant = 'header' }: { variant?: 'header' | 'footer' }) {
  const t = useTranslations('nav');
  const active = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const select = (locale: Locale) => {
    setOpen(false);
    if (locale !== active) router.replace(alternateHref(locale));
  };

  return (
    <div className={`locale-switcher locale-switcher-${variant}`} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="locale-trigger"
        aria-label={t('language')}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
      >
        <Flag locale={active} />
        <span>{t('languageShort')}</span>
      </button>

      {open ? (
        <ul className="locale-menu" role="listbox" aria-label={t('language')}>
          {locales.map((locale) => (
            <li key={locale}>
              <button
                type="button"
                role="option"
                aria-selected={locale === active}
                className={`locale-option ${locale === active ? 'is-active' : ''}`}
                lang={LOCALE_META[locale].lang}
                onClick={() => select(locale)}
              >
                <span className="locale-option-name">
                  <Flag locale={locale} />
                  {LOCALE_META[locale].label}
                </span>
                {locale === active ? <Check size={14} aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
