'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALE_META, locales, type Locale } from '@/i18n/routing';
import { Flag } from './Flag';

/**
 * Switches locale while staying on the same route. `usePathname` from the
 * next-intl navigation helpers returns the path without the locale prefix, so
 * the equivalent page in the target language is what loads — not the home page.
 */
export function LocaleSwitcher({ variant = 'header' }: { variant?: 'header' | 'footer' }) {
  const t = useTranslations('nav');
  const active = useLocale() as Locale;
  const pathname = usePathname();
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
    if (locale !== active) router.replace(pathname, { locale });
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
