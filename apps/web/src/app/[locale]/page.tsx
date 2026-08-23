import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import { FAQ_IDS } from '@/content/landing';
import { LandingProvider } from '@/components/LandingProvider';
import { Header } from '@/components/Header';
import { MobileStickyCta } from '@/components/MobileStickyCta';
import { WebGLScene } from '@/components/webgl/WebGLScene';
import {
  AssessmentPaths,
  Faq,
  FeaturedAssessment,
  FinalCta,
  Footer,
  Hero,
  HowItWorks,
  NuraProfile,
  PremiumSection,
  ResultPreview,
  Statement,
  TrustSection,
} from '@/components/sections/Sections';

/** Built from the same messages the FAQ renders, so the two cannot drift. */
async function faqJsonLd(locale: string) {
  const t = await getTranslations({ locale, namespace: 'faq' });
  const tm = await getTranslations({ locale, namespace: 'meta' });

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'NURA',
        url: `${SITE_URL}/${locale}`,
        description: tm('description'),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/${locale}`,
        name: 'NURA',
        inLanguage: locale,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/${locale}#faq`,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: FAQ_IDS.map((id) => ({
          '@type': 'Question',
          name: t(`${id}.question`),
          acceptedAnswer: { '@type': 'Answer', text: t(`${id}.answer`) },
        })),
      },
    ],
  };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const jsonLd = await faqJsonLd(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingProvider>
        <main className="nura-page">
          <WebGLScene />
          <Header />
          <Hero />
          <Statement />
          <FeaturedAssessment />
          <AssessmentPaths />
          <HowItWorks />
          <NuraProfile />
          <ResultPreview />
          <PremiumSection />
          <TrustSection />
          <Faq />
          <FinalCta />
          <Footer />
          <MobileStickyCta />
        </main>
      </LandingProvider>
    </>
  );
}
