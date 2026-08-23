import { defineRouting } from 'next-intl/routing';

/**
 * URL segments are lowercase by product decision (`/pt-br/...`), so the locale
 * id and the BCP-47 tag are not the same string. `LOCALE_META` maps between
 * them for `<html lang>`, `og:locale` and `hreflang`.
 */
export const locales = ['pt-br', 'en', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'pt-br';

export const LOCALE_META: Record<Locale, { lang: string; ogLocale: string; label: string }> = {
  'pt-br': { lang: 'pt-BR', ogLocale: 'pt_BR', label: 'Português (Brasil)' },
  en: { lang: 'en', ogLocale: 'en_US', label: 'English' },
  es: { lang: 'es', ogLocale: 'es_ES', label: 'Español' },
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
});
