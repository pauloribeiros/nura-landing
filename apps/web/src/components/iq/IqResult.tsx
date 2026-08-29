'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { IqResult as IqResultData } from '@/domain/iq/scoring';

/**
 * The free result of the IQ test.
 *
 * The headline is a points total on NURA's own scale, labelled as such. It is
 * not an IQ and the screen says so twice — once beside the number, where
 * someone glancing will see it, and once in the disclaimer for someone
 * reading. A number this shaped invites being read as an IQ, so saying it
 * plainly costs a line and prevents a misunderstanding people carry around.
 *
 * NO PERCENTILE, and the absence is explained rather than left as a gap.
 * Telling someone they beat 78% of people requires having measured people; the
 * screen says what it will say once there are enough runs, which is both
 * honest now and true later.
 *
 * The profile encodes magnitude by LENGTH in one hue, for the same reason the
 * ADHD report does: a colour ramp on this near-black surface puts its low
 * steps under 3:1 against the background, and length survives greyscale
 * printing.
 */
export function IqResult({
  result,
  onRestart,
}: {
  result: IqResultData;
  onRestart: () => void;
}) {
  const t = useTranslations('iq');
  const tr = useTranslations('iq_result');

  const minutes = Math.floor(result.tempoTotal_ms / 60000);
  const seconds = Math.floor((result.tempoTotal_ms % 60000) / 1000);

  // Ordered by performance so the profile reads top to bottom as a ranking,
  // which is the question someone actually has about it.
  const ranked = result.perfil.slice().sort((a, b) => b.percentual - a.percentual);

  return (
    <section className="runner result-screen">
      <div className="wrap runner-inner">
        <p className="eyebrow eyebrow-light">{tr('eyebrow')}</p>
        <h1>{tr('title')}</h1>

        <div className="iq-score">
          <p className="iq-score-value">{result.pontos}</p>
          {/* Beside the number, not only in the small print. */}
          <p className="iq-score-scale">{tr('scaleNote')}</p>

          <div className="iq-score-facts">
            <span>
              <b>
                {result.acertos}/{result.total}
              </b>{' '}
              {tr('correct')}
            </span>
            <span>
              <b>
                {minutes}:{String(seconds).padStart(2, '0')}
              </b>{' '}
              {tr('elapsed')}
            </span>
          </div>
        </div>

        {/* The gap where a percentile would be, explained instead of hidden. */}
        <p className="iq-no-percentile">{tr('noPercentile')}</p>

        <div className="result-domains">
          <h2>{tr('profileTitle')}</h2>
          <p className="runner-lead">{tr('profileLead')}</p>
          <ul>
            {ranked.map((d) => (
              <li key={d.dimensao}>
                <div className="result-domain-head">
                  <span>{t(`dimensions.${d.dimensao}`)}</span>
                  <b>
                    {d.acertos}/{d.total}
                  </b>
                </div>
                <div className="iq-dimension-track" aria-hidden="true">
                  <span style={{ width: `${d.percentual}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="result-next">
          <h2>{tr('readingTitle')}</h2>
          <p>
            {tr('strengths', {
              a: t(`dimensions.${result.pontosFortes[0]}`),
              b: t(`dimensions.${result.pontosFortes[1]}`),
            })}
          </p>
          <p>
            {tr('weaknesses', {
              a: t(`dimensions.${result.pontosFracos[0]}`),
              b: t(`dimensions.${result.pontosFracos[1]}`),
            })}
          </p>
        </div>

        <p className="runner-disclaimer">{tr('disclaimer')}</p>

        <div className="runner-actions">
          <button type="button" className="button button-ghost" onClick={onRestart}>
            <RotateCcw size={15} aria-hidden="true" /> {tr('restart')}
          </button>
        </div>
      </div>
    </section>
  );
}
