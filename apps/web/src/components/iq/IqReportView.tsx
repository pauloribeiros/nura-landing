import { useTranslations } from 'next-intl';
import type { IqReportPlan } from '@/domain/iq/report';
import { PrintButton } from '../assessment/PrintButton';

/**
 * O relatorio pago de raciocinio.
 *
 * O QUE O DESENHO PRECISA CARREGAR aqui e diferente do relatorio de TDAH.
 * Ninguem le um relatorio destes de ponta a ponta na primeira passada: a
 * pessoa procura o numero, procura o proprio nome nas seis barras, e so
 * depois decide se le o resto. Entao o numero e o perfil vem primeiro e
 * inteiros, e o texto interpretativo vem depois, em secoes numeradas que dao
 * para ler fora de ordem.
 *
 * CADA BARRA CARREGA TRES COISAS: o que a dimensao mede, quanto a pessoa
 * acertou, e o que aquilo sugere na faixa dela. Sem a primeira, o nome da
 * dimensao nao diz nada; sem a terceira, a barra e so um numero colorido.
 *
 * A AUSENCIA DE PERCENTIL E DITA, nao omitida. E a primeira coisa que alguem
 * procura num teste destes, e nao ter e uma decisao — nao um esquecimento.
 */
export function IqReportView({ plan }: { plan: IqReportPlan }) {
  const t = useTranslations('iq_report');
  const td = useTranslations('iq.dimensions');

  const minutos = Math.floor(plan.tempoTotal_ms / 60000);
  const segundos = Math.floor((plan.tempoTotal_ms % 60000) / 1000);

  return (
    <article className="report iq-report">
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

        {/* O numero, e ao lado dele o que o sustenta. Sozinho ele viraria
            placar; acompanhado de acertos e tempo, vira medida. */}
        <div className="iq-report-score">
          <div className="iq-report-score-main">
            <p className="iq-report-points">{plan.pontos}</p>
            <p className="iq-report-scale">{t('scoreLabel')}</p>
          </div>
          <dl className="iq-report-facts">
            <div>
              <dt>{t('correctLabel', { total: plan.total })}</dt>
              <dd>{plan.acertos}</dd>
            </div>
            <div>
              <dt>{t('timeLabel')}</dt>
              <dd>
                {minutos}:{String(segundos).padStart(2, '0')}
              </dd>
            </div>
          </dl>
        </div>

        {plan.percentil === null ? (
          <p className="iq-report-no-percentile">{t('noPercentile')}</p>
        ) : null}

        {/* AS SECOES SAEM EM ORDEM. A primeira versao subia o perfil para o
            topo, por achar que era o que a pessoa procura primeiro — mas os
            numeros na tela ficavam 03, 01, 02, 04, que e pior do que qualquer
            ganho de ordem. O placar ja abre o documento; o grafico vem no
            lugar dele, com o texto que o explica ao lado. */}
        {plan.secoes.map((secao) => {
            const numero = secao.id.replace('q', '').padStart(2, '0');
            return (
              <section key={secao.id} className="report-section">
                <h2>
                  <span className="report-section-num">{numero}</span>
                  {t(`sections.${secao.id}`)}
                </h2>

                {secao.id === 'q3' ? <p className="runner-lead">{t('q3.lead')}</p> : null}
                {secao.id === 'q5' ? <p className="runner-lead">{t('q5.lead')}</p> : null}

                <p>
                  {/* A secao 04 cita os nomes das dimensoes, que so existem
                      traduzidos aqui — o plano e agnostico de idioma. */}
                  {secao.id === 'q4' && secao.corpoKey === 'doisEixos'
                    ? t('q4.doisEixos', {
                        forte1: td(plan.fortes[0]),
                        forte2: td(plan.fortes[1]),
                        fraco1: td(plan.fracos[0]),
                        fraco2: td(plan.fracos[1]),
                      })
                    : t(`${secao.id}.${secao.corpoKey}`, secao.params)}
                </p>

                {secao.id === 'q1' ? <p className="report-note">{t('q1.nota')}</p> : null}
                {secao.id === 'q6' ? <p className="report-note">{t('q6.nota')}</p> : null}

                {secao.id === 'q3' ? (
                  <ul className="iq-report-dimensions">
                    {plan.dimensoes.map((d) => (
                      <li key={d.dimensao} className={`iq-report-dimension is-${d.faixa}`}>
                        <div className="iq-report-dimension-head">
                          <span className="iq-report-dimension-name">{td(d.dimensao)}</span>
                          <span className="iq-report-dimension-score">
                            {d.acertos}/{d.total}
                          </span>
                        </div>

                        <div
                          className="iq-report-track"
                          role="img"
                          aria-label={`${td(d.dimensao)}: ${d.acertos} de ${d.total}`}
                        >
                          <span style={{ width: `${Math.max(2, d.percentual)}%` }} />
                        </div>

                        <p className="iq-report-dimension-means">
                          {t(`dimensionMeans.${d.dimensao}`)}
                        </p>
                        <p className="iq-report-dimension-reading">
                          {t(`reading.${d.dimensao}.${d.faixa}`)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}

        <section className="report-section">
          <h2>{t('closingTitle')}</h2>
          <p>{t('closing')}</p>
        </section>

        <p className="runner-disclaimer">{t('disclaimer')}</p>
      </div>
    </article>
  );
}
