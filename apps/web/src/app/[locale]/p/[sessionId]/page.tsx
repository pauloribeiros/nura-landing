import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check } from 'lucide-react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { routing, type Locale } from '@/i18n/routing';
import { SiteHeader } from '@/components/SiteHeader';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { CheckoutAccordion } from '@/components/iq/CheckoutAccordion';

/**
 * A página de pagamento, na nossa casa em vez da do Stripe.
 *
 * Own route, like the report: it reads the caller's cookies to check the run
 * is theirs, so it cannot be prerendered. The segment is `p` and not a
 * localised word for the same reason as `r` — the URL is private, carries no
 * SEO value and nobody reads it.
 *
 * O QUE ELA NÃO FAZ é receber dados de cartão. Não há campo de cartão aqui e
 * não vai haver: número digitado numa página nossa é responsabilidade nossa
 * perante o PCI, e o Stripe já resolve isso sem custo. O que esta página
 * controla é tudo o que decide a compra — o que está sendo vendido, por quanto,
 * e a escolha do meio de pagamento. O passo final acontece no Stripe.
 *
 * OWNERSHIP: a sessão é lida como o próprio visitante, então uma que não seja
 * dele simplesmente não existe. Sem resultado gravado também não há o que
 * vender, e a página some — vender um relatório para uma corrida que nunca foi
 * pontuada seria receber por algo que não dá para entregar.
 */

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string; sessionId: string }>;

export default async function PaginaDePagamento({ params }: { params: Params }) {
  const { locale, sessionId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  if (!supabaseConfigured) notFound();

  const cookieStore = await cookies();
  const comoVisitante = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });

  const { data: sessao } = await comoVisitante
    .from('assessment_sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!sessao) notFound();

  const { data: resultado } = await comoVisitante
    .from('assessment_results')
    .select('session_id')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (!resultado) notFound();

  const t = await getTranslations({ locale, namespace: 'iq_checkout' });
  const inclui = ['inclui1', 'inclui2', 'inclui3', 'inclui4'] as const;

  return (
    <>
      <SiteHeader locale={locale as Locale} />
      <main className="page page-dark">
        <section className="runner pay-page">
          <div className="wrap runner-inner">
            <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
            <h1>{t('title')}</h1>

            <div className="pay-grid">
              {/* O que está sendo comprado, ao lado de como pagar: a pessoa
                  não precisa lembrar de cor o que viu na tela anterior. */}
              <aside className="pay-summary">
                <h2>{t('summaryTitle')}</h2>
                <ul>
                  {inclui.map((chave) => (
                    <li key={chave}>
                      <Check size={15} aria-hidden="true" />
                      {t(chave)}
                    </li>
                  ))}
                </ul>
                <p className="pay-total">
                  <span>{t('total')}</span>
                  <b>{t('price')}</b>
                </p>
                <p className="pay-once">{t('once')}</p>
              </aside>

              <CheckoutAccordion sessionId={sessionId} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
