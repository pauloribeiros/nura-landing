import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ReportView } from '@/components/assessment/ReportView';
import { IqReportView } from '@/components/iq/IqReportView';
import { assessmentOfSession, loadReport } from '@/lib/assessment/loadReport';
import { confirmCheckout } from '@/lib/payments/confirmCheckout';
import { asrs18ChoiceLabels, asrs18Prompts } from '@/domain/assessment/instruments/asrs18';

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
type Search = Promise<{ pago?: string; acesso?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, sessionId } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  /**
   * O TITULO SEGUE A AVALIACAO. Ele vinha fixo do catalogo do TDAH, entao a
   * aba de um relatorio de raciocinio dizia "Seus padroes de atencao, em
   * detalhe" — e e o titulo que a pessoa ve ao salvar em PDF ou favoritar.
   *
   * A leitura e sem portao de proposito: um id inexistente ou de outra pessoa
   * cai no titulo generico, e a pagina abaixo continua respondendo 404. Nada
   * aqui revela conteudo — so escolhe entre dois titulos.
   */
  const qual = await assessmentOfSession(sessionId);
  const t = await getTranslations({
    locale,
    namespace: qual === 'cognition' ? 'iq_report' : 'report',
  });

  // Someone's report is theirs. Nothing about it belongs in an index.
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale, sessionId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const loc = locale as Locale;
  setRequestLocale(loc);

  // Arriving straight from checkout: confirm with Stripe before deciding, so
  // a redirect that beat the webhook does not show a 404 to someone who paid.
  const { pago, acesso } = await searchParams;
  if (pago) await confirmCheckout(pago, sessionId);

  // `acesso` comes from the emailed link and stands in for the cookie of the
  // browser that bought — see loadReport.
  const plan = await loadReport(sessionId, acesso);
  // Not found and not yours give the same answer on purpose — see loadReport.
  if (!plan) notFound();

  return (
    <>
      <SiteHeader locale={loc} />
      <main className="page page-dark">
        {/* CADA AVALIACAO TEM O SEU RELATORIO. Ate aqui esta rota passava os
            enunciados da ASRS para qualquer sessao, entao uma corrida de
            raciocinio renderizava as perguntas de TDAH com as secoes vazias.
            O tipo discriminado que `loadReport` devolve tornou isso impossivel
            de escrever sem o compilador reclamar. */}
        {plan.kind === 'iq' ? (
          <IqReportView plan={plan.plan} />
        ) : (
          /* The instrument only has published wording in pt-br, so a reader in
             another locale still sees the items as published rather than a
             translation NURA invented. */
          <ReportView
            plan={plan.plan}
            prompts={asrs18Prompts[loc] ?? asrs18Prompts['pt-br']}
            choiceLabels={asrs18ChoiceLabels[loc] ?? asrs18ChoiceLabels['pt-br']}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
