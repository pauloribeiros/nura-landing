import type { MetadataRoute } from 'next';
import { locales, routing, LOCALE_META, type Locale } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import { AVAILABLE_ASSESSMENTS, assessmentLandingPath, catalogPath } from '@/content/landing';

/**
 * Derived from the same content module the routes are, so a new assessment
 * enters the sitemap the moment it is marked available — never by hand.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: (locale: Locale) => string; priority: number }[] = [
    { path: (l) => `/${l}`, priority: 1 },
    { path: (l) => catalogPath(l), priority: 0.8 },
    ...AVAILABLE_ASSESSMENTS.map((a) => ({
      path: (l: Locale) => assessmentLandingPath(l, a),
      priority: 0.9,
    })),
  ];

  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${SITE_URL}${page.path(locale)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: locale === routing.defaultLocale ? page.priority : page.priority - 0.1,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [LOCALE_META[l].lang, `${SITE_URL}${page.path(l)}`]),
        ),
      },
    })),
  );
}
