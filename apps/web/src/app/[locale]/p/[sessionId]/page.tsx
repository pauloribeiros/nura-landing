import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, Check } from 'lucide-react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { routing, type Locale } from '@/i18n/routing';
import { SiteHeader } from '@/components/SiteHeader';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { CheckoutAccordion } from '@/components/iq/CheckoutAccordion';
import { FocusMode } from '@/components/FocusMode';
import { Link } from '@/i18n/navigation';
import { reportIsSellable, reportPath } from '@/content/landing';
import { getStripe } from '@/lib/payments/stripe';
import { abrirIntentsDaCobranca } from '@/lib/payments/intents';

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
 *
 * OS INTENTS NASCEM AQUI, e não no navegador. Antes a página carregava,
 * hidratava, e só então pedia o intent numa chamada que refazia a autenticação
 * e três consultas antes de falar com o Stripe: eram segundos de "carregando"
 * no lugar dos campos de cartão. Agora a criação começa junto com o render e o
 * segredo chega como promessa — a página aparece na hora, e o formulário monta
 * assim que o Stripe responde, sem uma ida ao servidor no meio.
 */

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string; sessionId: string }>;
type Busca = Promise<{ pago?: string }>;

export default async function PaginaDePagamento({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Busca;
}) {
  const { locale, sessionId } = await params;
  const { pago } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  if (!supabaseConfigured) notFound();

  const cookieStore = await cookies();
  const comoVisitante = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });

  /**
   * As quatro leituras de uma vez, e não uma esperando a outra.
   *
   * Todas dependem só do id da sessão, então encadeá-las custava três idas ao
   * banco em fila para nada — tempo que a página inteira esperava antes de
   * existir. A RLS continua fazendo o trabalho: uma sessão que não é do
   * visitante não volta de nenhuma delas.
   */
  const [
    { data: auth },
    { data: sessao },
    { data: resultado },
    { data: lead },
    { data: jaPago },
  ] = await Promise.all([
    comoVisitante.auth.getUser(),
    comoVisitante.from('assessment_sessions').select('id, assessment_id').eq('id', sessionId).maybeSingle(),
    comoVisitante.from('assessment_results').select('session_id').eq('session_id', sessionId).maybeSingle(),
    // O e-mail que a pessoa deu na tela anterior, para o recibo do Stripe e
    // para o envio do relatório — ela não digita duas vezes.
    comoVisitante.from('assessment_leads').select('email').eq('session_id', sessionId).maybeSingle(),
    comoVisitante.from('assessment_entitlements').select('id').eq('session_id', sessionId).maybeSingle(),
  ]);

  if (!sessao) notFound();
  if (!resultado) notFound();

  const t = await getTranslations({ locale, namespace: 'iq_checkout' });

  /**
   * Avaliacao sem relatorio escrito nao mostra pagamento.
   *
   * As rotas de `/api` ja recusam, entao ninguem consegue pagar por aqui de
   * qualquer forma — mas uma pagina que oferece um botao que o servidor vai
   * negar e pior do que nao oferecer nada. Aqui a pessoa le o que aconteceu.
   */
  const aVenda = reportIsSellable(sessao.assessment_id);

  /**
   * A criação começa aqui e NÃO É ESPERADA: a promessa vai para a tela, que a
   * resolve depois de hidratar. Esperar por ela seguraria o HTML pelo tempo de
   * duas chamadas ao Stripe, trocando um "carregando" no formulário por uma
   * página em branco — pior, porque a página em branco não explica nada.
   *
   * Uma corrida já paga não abre intent: cobrar duas vezes e estornar depois é
   * pior do que não cobrar.
   */
  const stripe = getStripe();
  const segredosIniciais =
    stripe && aVenda && !pago && auth.user && !jaPago
      ? abrirIntentsDaCobranca(stripe, {
          sessionId,
          userId: auth.user.id,
          assessmentId: sessao.assessment_id,
          locale,
          email: lead?.email ?? undefined,
        })
      : null;
  // O que esta sendo vendido muda com a avaliacao; o resto da pagina nao.
  const inclui =
    sessao.assessment_id === 'attention'
      ? (['atencao1', 'atencao2', 'atencao3', 'atencao4'] as const)
      : (['inclui1', 'inclui2', 'inclui3', 'inclui4'] as const);

  return (
    <>
      {/* A conexao com o Stripe aberta antes de alguem precisar dela. O
          formulario de cartao sao iframes servidos por estes dois dominios, e
          sem isto o DNS e o TLS de cada um so comecam quando o script do
          Stripe roda — algumas centenas de milissegundos de espera no celular,
          gastas depois da pagina ja estar na tela. */}
      <link rel="preconnect" href="https://js.stripe.com" />
      <link rel="preconnect" href="https://m.stripe.network" />
      <FocusMode />
      <SiteHeader locale={locale as Locale} />
      <main className="page page-dark">
        <section className="runner pay-page">
          <div className="wrap runner-inner">
            <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
            {/* O título é a recompensa de vinte minutos de teste: chega com um
                brilho e uma entrada de uma vez só. O subtítulo carrega a
                instrução, para a comemoração não custar clareza. */}
            {/* Sem nada a venda, a comemoracao e o "escolha como prefere
                pagar" contradiziam o aviso logo abaixo. */}
            <h1 className="pay-title">{aVenda ? t('title') : t('pendingHead')}</h1>
            <p className="runner-lead pay-subtitle">{aVenda ? t('subtitle') : t('pendingLead')}</p>

            {!aVenda ? (
              <div className="pay-pending">
                <p className="pay-pending-title">{t('pendingTitle')}</p>
                <p>{t('pendingBody')}</p>
                <p className="pay-pending-note">{t('pendingNote')}</p>
              </div>
            ) : (
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

              {pago ? (
                <div className="pay-done">
                  <p className="pay-done-title">{t('doneTitle')}</p>
                  <p>{t('doneBody')}</p>
                  {/* O CAMINHO PARA O RELATORIO NAO PODE DEPENDER SO DO E-MAIL.
                      Uma falha de envio e engolida de proposito — a compra nao
                      pode falhar porque o e-mail falhou — mas ate agora esta
                      tela nao oferecia nada, entao quem nao recebesse o e-mail
                      tinha pago e ficado sem caminho, em silencio dos dois
                      lados. Este navegador acabou de comprar: o cookie dele ja
                      abre o relatorio, sem token nenhum. */}
                  <Link
                    className="button button-primary"
                    href={reportPath(locale as Locale, sessionId).replace(`/${locale}`, '')}
                  >
                    {t('doneCta')}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <p className="pay-done-note">{t('doneLink')}</p>
                </div>
              ) : (
                <CheckoutAccordion
                  sessionId={sessionId}
                  email={lead?.email ?? undefined}
                  segredosIniciais={segredosIniciais}
                />
              )}
            </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
