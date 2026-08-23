import type { MetadataRoute } from 'next';
import { locales, routing, LOCALE_META } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

/** One entry per locale. Assessment landings join this list as they ship. */
export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: locale === routing.defaultLocale ? 1 : 0.8,
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [LOCALE_META[l].lang, `${SITE_URL}/${l}`]),
      ),
    },
  }));
}
