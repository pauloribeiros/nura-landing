'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ESPECTRO_DOMINIOS, type EspectroDominio } from '@/domain/assessment/instruments/nuraEspectro40';
import type { ScoreResult } from '@/domain/assessment/types';
import { track } from '@/lib/analytics';
import { DomainSegments } from './DomainSegments';
import { UnlockButton } from './UnlockButton';

/**
 * O resultado da escala do espectro.
 *
 * NAO E O RESULTADO DO TDAH COM OUTRAS PALAVRAS, e a diferenca importa. La o
 * badge pode dizer "acima do ponto de corte" porque a ASRS tem um, publicado
 * pela OMS. Aqui nao ha ponto de corte clinico — ha tres faixas descritivas
 * sobre quantos dos quarenta territorios a pessoa reconheceu em si, e nenhuma
 * delas diz que ela tem ou nao tem alguma coisa.
 *
 * A FAIXA MAIS BAIXA NAO E UM ALIVIO E A MAIS ALTA NAO E UM VEREDITO. Tracos
 * do espectro aparecem em graus diferentes em toda a populacao; reconhecer
 * poucos nao descarta nada e reconhecer muitos nao diagnostica. O texto de
 * cada faixa carrega isso, porque e exatamente onde uma pessoa sozinha na
 * frente da tela tira a conclusao errada.
 *
 * A OFERTA E A MESMA PARA AS TRES FAIXAS, pelo mesmo motivo que no TDAH: quem
 * reconheceu poucos tracos tambem merece a leitura do que apareceu, do que nao
 * apareceu e do que mais poderia explicar o que ela sente.
 */
export function EspectroResult({
  result,
  sessionId,
  onRestart,
}: {
  result: ScoreResult;
  sessionId?: string;
  onRestart: () => void;
}) {
  const t = useTranslations('espectro_result');

  const faixa = result.bands['espectro-total'] ?? 'poucos';
  const total = result.scores['espectro-total'] ?? 0;

  useEffect(() => {
    track('result_viewed', { assessment: result.assessmentId, band: faixa });
    track('premium_offer_viewed', { assessment: result.assessmentId });
  }, [result.assessmentId, faixa]);

  const dominios = (Object.keys(ESPECTRO_DOMINIOS) as EspectroDominio[]).map((dominio) => ({
    dominio,
    reconhecidos: (result.flagged[`${dominio}-itens`] ?? []).length,
    total: ESPECTRO_DOMINIOS[dominio].length,
  }));

  /** O territorio com mais itens reconhecidos, para a leitura falar dele. */
  const maior = dominios.reduce((a, b) => (b.reconhecidos > a.reconhecidos ? b : a));

  return (
    <section className="runner result-screen">
      <div className="wrap runner-inner">
        <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
        <h1>{t('title')}</h1>

        <div className={`result-band is-${faixa}`}>
          <div className="result-band-head">
            <p className="result-band-label">{t('scaleLabel')}</p>
            <span className={`badge badge-${faixa}`}>{t(`badge.${faixa}`)}</span>
          </div>
          <p className="result-band-count">{t('count', { count: total })}</p>
          {/* No lugar onde o TDAH cita o ponto de corte do instrumento, aqui
              vai o motivo de nao haver um. */}
          <p className="result-band-cutoff">{t('noCutoff')}</p>
          <h2>{t(`bandTitle.${faixa}`)}</h2>
          <p>{t(`bandBody.${faixa}`)}</p>
        </div>

        <div className="result-domains">
          <h2>{t('domainsTitle')}</h2>
          <p className="runner-lead">{t('domainsLead')}</p>
          <ul>
            {dominios.map(({ dominio, reconhecidos, total: quantos }) => (
              <li key={dominio}>
                <div className="result-domain-head">
                  <span>{t(`domains.${dominio}`)}</span>
                  <b>
                    {reconhecidos === 0
                      ? t('domainNone')
                      : t('domainCount', { flagged: reconhecidos, total: quantos })}
                  </b>
                </div>
                <DomainSegments
                  filled={reconhecidos}
                  total={quantos}
                  label={t('domainSegmentsLabel', {
                    domain: t(`domains.${dominio}`),
                    flagged: reconhecidos,
                    total: quantos,
                  })}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="result-next">
          <h2>{t('nextTitle')}</h2>
          <p>{t(`next.${faixa}`)}</p>
          {maior.reconhecidos > 0 ? (
            <p className="result-context-note">
              {t('strongest', { domain: t(`domains.${maior.dominio}`) })}
            </p>
          ) : null}
        </div>

        <div className="result-premium">
          <p className="result-premium-finding">{t('premiumFinding', { count: total })}</p>
          <h2>{t('premiumTitle')}</h2>
          <p className="runner-lead">{t('premiumLead')}</p>

          <ol className="report-sections">
            {['s1', 's2', 's3', 's4', 's5', 's6'].map((chave, i) => (
              <li key={chave}>
                <span className="report-section-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="report-section-name">{t(`reportSections.${chave}`)}</span>
              </li>
            ))}
          </ol>

          <UnlockButton sessionId={sessionId} assessmentId={result.assessmentId} />
          <p className="result-delivery">{t('deliveryNote')}</p>
        </div>

        <p className="runner-disclaimer">{t('disclaimer')}</p>

        <div className="runner-actions">
          <button type="button" className="button button-ghost" onClick={onRestart}>
            <RotateCcw size={15} aria-hidden="true" /> {t('restart')}
          </button>
        </div>
      </div>
    </section>
  );
}
