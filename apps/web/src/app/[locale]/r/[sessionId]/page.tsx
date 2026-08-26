import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ReportView } from '@/components/assessment/ReportView';
import { loadReport } from '@/lib/assessment/loadReport';
import { asrs18Prompts } from '@/domain/assessment/instruments/asrs18';

/**
 * A person's report.
 *
 * Its own route rather than a branch of `[section]`, because its rendering
 * mode is the opposite of everything else there. The marketing pages and the
 * assessment are prerendered from `generateStaticParams`; this one is read at
 * request time from the caller's cookies, so that RLS can decide whether the
 * session is theirs. Sharing a route made Next attempt to prerender it and
 * fail on `cookies()` — the two modes genuinely do not belong together.
 *
 * The segment is `r` and not a localised word: the URL is private, carries no
 * SEO value and is never indexed, so there is no reader for a pretty path.
 */

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string; sessionId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'report' });
  // Someone's report is theirs. Nothing about it belongs in an index.
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function ReportPage({ params }: { params: Params }) {
  const { locale, sessionId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const loc = locale as Locale;
  setRequestLocale(loc);

  const plan = await loadReport(sessionId);
  // Not found and not yours give the same answer on purpose — see loadReport.
  if (!plan) notFound();

  return (
    <>
      <SiteHeader locale={loc} />
      <main className="page page-dark">
        {/* The instrument only has published wording in pt-br, so a reader in
            another locale still sees the items as published rather than a
            translation NURA invented. */}
        <ReportView plan={plan} prompts={asrs18Prompts[loc] ?? asrs18Prompts['pt-br']} />
      </main>
      <SiteFooter />
    </>
  );
}
