import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, Clock3, FileText, UserRound } from 'lucide-react';
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
  assessmentStartPath,
  canRunAssessment,
  catalogPath,
  sectionKind,
} from '@/content/landing';
import { asrs18, asrs18ChoiceLabels, asrs18Prompts } from '@/domain/assessment/instruments/asrs18';
import { nuraEspectro40 } from '@/domain/assessment/instruments/nuraEspectro40';
import { AssessmentRunner } from '@/components/assessment/AssessmentRunner';
import { IqIntro } from '@/components/iq/IqIntro';
import { publicItems } from '@/domain/iq/bank';
import { AssessmentUnavailable } from '@/components/assessment/AssessmentUnavailable';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { FaqList } from '@/components/FaqList';
import { AssessmentViewTracker } from '@/components/AssessmentViewTracker';
import { RevealLines } from '@/components/RevealLines';

/**
 * Next cannot have two sibling dynamic segments, so the catalog and the
 * assessment share one `[section]` param and this route dispatches on it. Both
 * shapes are prerendered.
 */
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    AVAILABLE_ASSESSMENTS.flatMap((a) => [
      { locale, section: ROUTE_SEGMENTS.catalog[locale], slug: a.slug[locale] },
      { locale, section: ROUTE_SEGMENTS.assessment[locale], slug: a.slug[locale] },
    ]),
  );
}

type Params = Promise<{ locale: string; section: string; slug: string }>;

async function resolve(params: Params) {
  const { locale, section, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const loc = locale as Locale;
  const kind = sectionKind(loc, section);
  if (!kind) notFound();

  const assessment = assessmentBySlug(loc, slug);
  if (!assessment || !assessment.available) notFound();
  return { locale: loc, assessment, kind };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, assessment, kind } = await resolve(params);

  const t = await getTranslations({ locale, namespace: `assessments.${assessment.id}.landing` });
  const path = assessmentLandingPath(locale, assessment);

  // The run itself is a tool with no content to rank, and indexing it would
  // compete with the landing for the same query.
  if (kind === 'assessment') {
    return { title: t('metaTitle'), robots: { index: false, follow: true } };
  }

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

export default async function AssessmentPage({ params }: { params: Params }) {
  const { locale, assessment, kind } = await resolve(params);
  setRequestLocale(locale);

  if (kind === 'assessment') {
    /**
     * Os enunciados do espectro vivem no catalogo de mensagens, e nao num
     * modulo TypeScript como os da ASRS — eles sao nossos, entao traduzi-los e
     * trabalho de tradutor, nao de quem transcreve um instrumento publicado.
     * Lidos aqui porque a escolha do runner e sincrona.
     */
    const te = await getTranslations({ locale, namespace: 'espectro' });
    const espectroPrompts = Object.fromEntries(
      nuraEspectro40.questions.map((q) => [q.id, te(`prompts.${q.id}`)]),
    );
    const espectroBlocos = Object.fromEntries(
      ['e1', 'e2', 'e3', 'e4'].map((b) => [b, te(`blocks.${b}`)]),
    );
    // Tres pausas para quatro etapas. Guardadas por indice porque next-intl
    // nao trabalha com arrays no catalogo.
    const espectroPausas = ['0', '1', '2'].map((i) => ({
      eyebrow: te(`transitions.${i}.eyebrow`),
      title: te(`transitions.${i}.title`),
      lead: te(`transitions.${i}.lead`),
    }));
    const espectroLabels = Object.fromEntries(
      nuraEspectro40.scales[0].choices
        .map((c) => [c.id, te(`choices.${c.id}`)])
        .concat([
          ['low', te('poles.low')],
          ['high', te('poles.high')],
        ]),
    );

    // Which runner belongs to which assessment. A questionnaire and a timed
    // reasoning test have almost nothing in common beyond the URL, so the
    // dispatch is explicit rather than an abstraction over both.
    const runner = () => {
      if (!canRunAssessment(locale, assessment)) {
        return (
          <AssessmentUnavailable
            fallbackHref={assessmentLandingPath(routing.defaultLocale, assessment)}
          />
        );
      }

      if (assessment.id === 'cognition') {
        // The bank is read on the server and handed over already stripped of
        // the answer key, so it travels in the page payload rather than in the
        // JavaScript bundle of every visitor who never opens the test.
        return <IqIntro items={publicItems(locale)} />;
      }

      if (assessment.id === 'autism') {
        return (
          <AssessmentRunner
            definition={nuraEspectro40}
            prompts={espectroPrompts}
            choiceLabels={espectroLabels}
            locale={locale}
            blockLabels={espectroBlocos}
            transitions={espectroPausas}
            transitionArt={['start', 'middle', 'end']}
          />
        );
      }

      if (assessment.id === 'attention') {
        return (
          <AssessmentRunner
            definition={asrs18}
            prompts={asrs18Prompts[locale]}
            choiceLabels={asrs18ChoiceLabels[locale]}
            locale={locale}
          />
        );
      }

      /**
       * SEM PADRAO SILENCIOSO. Ate aqui qualquer avaliacao que nao fosse o QI
       * caia na ASRS — a mesma classe de erro que fazia o relatorio de QI sair
       * com as perguntas do TDAH. Uma avaliacao sem runner proprio diz que nao
       * esta disponivel, em vez de servir outro questionario.
       */
      return (
        <AssessmentUnavailable
          fallbackHref={assessmentLandingPath(routing.defaultLocale, assessment)}
        />
      );
    };

    return (
      <>
        <SiteHeader locale={locale} />
        <main className="page page-dark">{runner()}</main>
        <SiteFooter />
      </>
    );
  }

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
      {/* On this page the default header CTA would link to this page. Send it
          to the assessment itself so "Começar" always advances the funnel. */}
      <SiteHeader
        locale={locale}
        ctaHref={assessmentStartPath(locale, assessment).replace(`/${locale}`, '')}
      />

      <main className="page page-dark">
        <nav className="wrap breadcrumb" aria-label={tc('breadcrumb')}>
          <Link href="/">{tc('home')}</Link>
          <span aria-hidden="true">/</span>
          <Link href={strip(catalogPath(locale))}>{tn('assessments')}</Link>
        </nav>

        <div className="wrap assessment-hero reveal-group">
          <p className="eyebrow eyebrow-light reveal-item">{t('eyebrow')}</p>
          <RevealLines
            as="h1"
            lines={[t('heroLine1'), t('heroLine2'), t('heroLine3')]}
            accentFrom={1}
          />
          <p className="assessment-lead reveal-item" style={{ '--i': 2 } as CSSProperties}>
            {t('lead')}
          </p>
          <p className="assessment-intro reveal-item" style={{ '--i': 3 } as CSSProperties}>
            {t('intro')}
          </p>

          <ul className="assessment-facts reveal-item" style={{ '--i': 4 } as CSSProperties}>
            <li>
              <Clock3 size={17} aria-hidden="true" />
              <b>{tf('durationValue')}</b>
              <span>{tl('durationLabel')}</span>
            </li>
            <li>
              <FileText size={17} aria-hidden="true" />
              <b>{tl('reportValue')}</b>
              <span>{tl('reportLabel')}</span>
            </li>
            <li>
              <UserRound size={17} aria-hidden="true" />
              <b>{tl('forYouValue')}</b>
              <span>{tl('forYouLabel')}</span>
            </li>
          </ul>

          <div className="reveal-item" style={{ '--i': 5 } as CSSProperties}>
            <Link
              className="button button-primary"
              href={assessmentStartPath(locale, assessment).replace(`/${locale}`, '')}
            >
              {tl('startCta')} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <p className="assessment-disclaimer reveal-item" style={{ '--i': 6 } as CSSProperties}>
            {t('disclaimer')}
          </p>
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
            <div>
              <h2>{tl('limitsTitle')}</h2>
              <p>{t('limits')}</p>
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
