import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Clock3, CreditCard, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LOCALE_META, locales, routing, type Locale } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import {
  ATTENTION_COVERS,
  AVAILABLE_ASSESSMENTS,
  FAQ_IDS,
  ROUTE_SEGMENTS,
  assessmentBySlug,
  assessmentLandingPath,
  catalogPath,
} from '@/content/landing';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { FaqList } from '@/components/FaqList';
import { AssessmentViewTracker } from '@/components/AssessmentViewTracker';

/** Only assessments that can actually be started get a landing page. */
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    AVAILABLE_ASSESSMENTS.map((a) => ({
      locale,
      catalog: ROUTE_SEGMENTS.catalog[locale],
      slug: a.slug[locale],
    })),
  );
}

type Params = Promise<{ locale: string; catalog: string; slug: string }>;

async function resolve(params: Params) {
  const { locale, catalog, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const loc = locale as Locale;
  if (ROUTE_SEGMENTS.catalog[loc] !== catalog) notFound();
  const assessment = assessmentBySlug(loc, slug);
  if (!assessment || !assessment.available) notFound();
  return { locale: loc, assessment };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, assessment } = await resolve(params);
  const t = await getTranslations({ locale, namespace: `assessments.${assessment.id}.landing` });
  const path = assessmentLandingPath(locale, assessment);

  return {
    metadataBase: new URL(SITE_URL),
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [LOCALE_META[l].lang, assessmentLandingPath(l, assessment)]),
        ),
        'x-default': assessmentLandingPath(routing.defaultLocale, assessment),
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'NURA',
      locale: LOCALE_META[locale].ogLocale,
      url: path,
      title: t('metaTitle'),
      description: t('metaDescription'),
      images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    },
  };
}

export default async function AssessmentLanding({ params }: { params: Params }) {
  const { locale, assessment } = await resolve(params);
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: `assessments.${assessment.id}.landing` });
  const tl = await getTranslations({ locale, namespace: 'assessmentLanding' });
  const tf = await getTranslations({ locale, namespace: 'featured' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const tq = await getTranslations({ locale, namespace: 'faq' });
  const tn = await getTranslations({ locale, namespace: 'nav' });

  const strip = (p: string) => p.replace(`/${locale}`, '') || '/';

  // Breadcrumbs want the page's short name, not its full <title>.
  const shortName = `${t('heroLine1')} ${t('heroLine2')}`.replace(/[.]\s*$/, '');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'NURA',
            item: `${SITE_URL}/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: tn('assessments'),
            item: `${SITE_URL}${catalogPath(locale)}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: shortName,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_IDS.map((id) => ({
          '@type': 'Question',
          name: tq(`${id}.question`),
          acceptedAnswer: { '@type': 'Answer', text: tq(`${id}.answer`) },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AssessmentViewTracker assessment={assessment.id} locale={locale} />
      <SiteHeader locale={locale} />

      <main className="page page-dark">
        <nav className="wrap breadcrumb" aria-label={tc('breadcrumb')}>
          <Link href="/">{tc('home')}</Link>
          <span aria-hidden="true">/</span>
          <Link href={strip(catalogPath(locale))}>{tn('assessments')}</Link>
        </nav>

        <div className="wrap assessment-hero">
          <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
          <h1>
            {t('heroLine1')}
            <br />
            <span>{t('heroLine2')}</span>
          </h1>
          <p className="assessment-lead">{t('lead')}</p>
          <p className="assessment-intro">{t('intro')}</p>

          <ul className="assessment-facts">
            <li>
              <Clock3 size={17} aria-hidden="true" />
              <b>{tf('durationValue')}</b>
              <span>{tl('durationLabel')}</span>
            </li>
            <li>
              <Sparkles size={17} aria-hidden="true" />
              <b>{tl('freeValue')}</b>
              <span>{tl('freeLabel')}</span>
            </li>
            <li>
              <CreditCard size={17} aria-hidden="true" />
              <b>{tl('cardValue')}</b>
              <span>{tl('cardLabel')}</span>
            </li>
          </ul>

          {/* The engine does not exist yet. Rather than a CTA that goes nowhere,
              the page states plainly where the assessment stands. */}
          <div className="assessment-upcoming">
            <h2>{tl('upcomingTitle')}</h2>
            <p>{tl('upcomingCopy')}</p>
          </div>

          <p className="assessment-disclaimer">{t('disclaimer')}</p>
        </div>

        <section className="section assessment-covers">
          <div className="wrap">
            <h2 className="section-title">{tl('coversTitle')}</h2>
            <div className="covers-grid">
              {ATTENTION_COVERS.map((cover) => (
                <article key={cover}>
                  <h3>{t(`covers.${cover}.title`)}</h3>
                  <p>{t(`covers.${cover}.copy`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section assessment-detail">
          <div className="wrap assessment-detail-grid">
            <div>
              <h2>{tl('forWhomTitle')}</h2>
              <p>{t('forWhom')}</p>
            </div>
            <div>
              <h2>{tl('methodologyTitle')}</h2>
              <p>{t('methodology')}</p>
            </div>
          </div>
        </section>

        <section className="section faq">
          <div className="wrap faq-layout">
            <div>
              <p className="eyebrow">{tl('faqTitle')}</p>
              <h2 className="section-title">{tq('title')}</h2>
            </div>
            <FaqList />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
