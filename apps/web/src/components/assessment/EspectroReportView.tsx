import { useTranslations } from 'next-intl';
import type { EspectroReportPlan } from '@/domain/assessment/espectroReport';
import { DomainSegments } from './DomainSegments';
import { PrintButton } from './PrintButton';

/**
 * O relatorio pago da escala do espectro.
 *
 * O HEROI E O MAPA, E NAO UM NUMERO. O relatorio de raciocinio abre com a
 * pontuacao em corpo grande porque la o numero e a medida. Aqui ele nao e: a
 * propria escala diz, em todas as telas, que nao tem ponto de corte clinico e
 * que as faixas descrevem em vez de classificar. Abrir com "27" em corpo 60
 * contradiria isso na primeira linha — o numero viraria nota, e nota pede
 * aprovacao ou reprovacao. Entao o total entra como legenda do mapa, e o mapa
 * dos quatro territorios e o que ocupa o alto da pagina.
 *
 * E O MESMO MAPA QUE A PESSOA VIU DE GRACA, de proposito. A tentacao seria
 * inventar uma visualizacao mais rica para justificar o preco. Mas ela ja
 * conhece a forma do proprio perfil, e reconhece-la aqui e o que diz "isto e
 * seu". O que se compra nao e outro grafico: e a leitura que agora aparece
 * debaixo de cada territorio, e as secoes que dizem o que aquilo descreve — e
 * o que nao descreve.
 *
 * OS LIMITES TEM SECAO PROPRIA, no fim e por extenso. Num relatorio pago sobre
 * autismo, enterrar "esta escala nao foi validada" num rodape de 11px seria
 * vender uma certeza que o instrumento nao tem.
 */
export function EspectroReportView({ plan }: { plan: EspectroReportPlan }) {
  const t = useTranslations('espectro_report');
  const tb = useTranslations('espectro_result.badge');

  /** As secoes de territorio; s1 e s6 leem o conjunto. */
  const numeroDe = (id: string) => id.replace('s', '').padStart(2, '0');

  return (
    <article className="report espectro-report">
      <div className="wrap report-inner">
        <header className="report-head">
          <div className="report-brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="report-brand-name">NURA</span>
          </div>
          <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="runner-lead">{t('lead')}</p>
          <p className="report-meta">{t('generatedOn', { versao: plan.scoringVersion })}</p>
          <PrintButton label={t('print')} />
          <p className="report-print-hint">{t('printHint')}</p>
        </header>

        {/* O mapa. A contagem vem junto, em corpo de legenda: ela situa o
            mapa sem virar o assunto. */}
        <section className="espectro-map" aria-labelledby="espectro-map-title">
          <h2 id="espectro-map-title">{t('profileTitle')}</h2>
          <p className="runner-lead">{t('profileLead')}</p>

          <p className="espectro-map-total">
            <b>{plan.total}</b> {t('totalLabel', { maximo: plan.maximo })}
            <span className="espectro-map-band">{tb(plan.faixa)}</span>
          </p>

          <ul className="espectro-map-list">
            {plan.dominios.map((d) => (
              <li key={d.dominio} className={`espectro-map-item is-${d.faixa}`}>
                <div className="result-domain-head">
                  <span>{t(`domains.${d.dominio}`)}</span>
                  <b>{t('domainCount', { reconhecidos: d.reconhecidos, total: d.total })}</b>
                </div>
                <DomainSegments
                  filled={d.reconhecidos}
                  total={d.total}
                  label={`${t(`domains.${d.dominio}`)}: ${d.reconhecidos}/${d.total}`}
                />
              </li>
            ))}
          </ul>
        </section>

        {plan.secoes.map((secao) => (
          <section key={secao.id} className="report-section">
            <h2>
              <span className="report-section-num">{numeroDe(secao.id)}</span>
              {t(`sections.${secao.id}`)}
            </h2>
            <p>{t(`${secao.id}.${secao.corpoKey}`, secao.params)}</p>
          </section>
        ))}

        <section className="report-section">
          <h2>{t('closingTitle')}</h2>
          <p>{t('closing')}</p>
        </section>

        {/* Nao e rodape. Quem comprou um relatorio sobre autismo precisa ler
            isto do mesmo tamanho que leu o resto. */}
        <section className="report-section">
          <h2>{t('limitsTitle')}</h2>
          <p>{t('limits')}</p>
        </section>

        <p className="runner-disclaimer">{t('disclaimer')}</p>
      </div>
    </article>
  );
}
