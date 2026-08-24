import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LOCALE_META, locales, routing, type Locale } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import {
  ASSESSMENTS,
  ROUTE_SEGMENTS,
  assessmentLandingPath,
} from '@/content/landing';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

/**
 * The catalog segment is localised (`/pt-br/testes`, `/en/tests`), so the route
 * is a dynamic `[catalog]` param validated against ROUTE_SEGMENTS rather than a
 * literal folder name.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale, section: ROUTE_SEGMENTS.catalog[locale] }));
}

function isCatalogSegment(locale: Locale, segment: string) {
  return ROUTE_SEGMENTS.catalog[locale] === segment;
}

type Params = Promise<{ locale: string; section: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, section } = await params;
  if (!hasLocale(routing.locales, locale) || !isCatalogSegment(locale, section)) notFound();

  const t = await getTranslations({ locale, namespace: 'catalog' });
  const path = `/${locale}/${section}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [LOCALE_META[l].lang, `/${l}/${ROUTE_SEGMENTS.catalog[l]}`]),
        ),
        'x-default': `/${routing.defaultLocale}/${ROUTE_SEGMENTS.catalog[routing.defaultLocale]}`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'NURA',
      locale: LOCALE_META[locale as Locale].ogLocale,
      url: path,
      title: t('metaTitle'),
      description: t('metaDescription'),
      images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    },
  };
}

export default async function CatalogPage({ params }: { params: Params }) {
  const { locale, section } = await params;
  if (!hasLocale(routing.locales, locale) || !isCatalogSegment(locale, section)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'catalog' });
  const ta = await getTranslations({ locale, namespace: 'assessments' });
  const loc = locale as Locale;

  const available = ASSESSMENTS.filter((a) => a.available);
  const upcoming = ASSESSMENTS.filter((a) => !a.available);

  return (
    <>
      <SiteHeader locale={loc} />
      <main className="page page-dark">
        <div className="wrap page-head">
          <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="page-intro">{t('intro')}</p>
        </div>

        <div className="wrap catalog-list">
          {available.map((item) => (
            <Link
              key={item.id}
              className="catalog-card"
              href={assessmentLandingPath(loc, item).replace(`/${locale}`, '')}
            >
              <span className="catalog-index">{item.index}</span>
              <div className="catalog-body">
                <span className="badge badge-available">{t('availableLabel')}</span>
                <h2>{ta(`${item.id}.title`)}</h2>
                <p>{ta(`${item.id}.description`)}</p>
              </div>
              <span className="catalog-go">
                {t('open')} <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>

        <div className="wrap catalog-upcoming">
          <h2 className="catalog-upcoming-title">{t('upcomingTitle')}</h2>
          <p className="catalog-upcoming-intro">{t('upcomingIntro')}</p>
          <ul className="catalog-upcoming-list">
            {upcoming.map((item) => (
              <li key={item.id}>
                <span className="catalog-index">{item.index}</span>
                <div>
                  <h3>{ta(`${item.id}.title`)}</h3>
                  <p>{ta(`${item.id}.description`)}</p>
                </div>
                <span className="badge badge-upcoming">{t('upcomingLabel')}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
