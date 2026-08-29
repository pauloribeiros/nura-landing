'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DIMENSOES } from '@/domain/iq/bank';

/**
 * The screen between the last answer and the result.
 *
 * WHY IT EXISTS AT ALL. Scoring takes a fraction of a second, so this could be
 * a blink. It is not, and the reason is not theatre: someone who just spent
 * twenty minutes answering needs to see that the twenty minutes turned into
 * something. A result that appears instantly reads as a lookup; one that is
 * assembled in front of you reads as work — and here the work is real, listed
 * by name, one line per dimension the scorer actually computes.
 *
 * WHAT IT DOES NOT SAY is "our AI is analysing your answers". Nothing here is
 * AI: the scorer is arithmetic over an answer key, and saying otherwise would
 * be inventing a capability to impress. The lines it does show — memory,
 * speed, pattern recognition — are the six dimensions in `DIMENSOES`, and each
 * one is genuinely part of the score.
 *
 * THE FLOOR AND THE CEILING. The list advances on a timer so it can be read,
 * but the screen never finishes before the server answers, and never lingers
 * once it has: `pronto` gates the last step. A progress bar that completes
 * while the request is still in flight is a lie that gets caught the moment
 * the next screen fails to appear.
 */

/** How long each line takes to tick. Six lines, so the floor is ~3.6s. */
const PASSO_MS = 600;

export function IqCalculating({ pronto, onDone }: { pronto: boolean; onDone: () => void }) {
  const t = useTranslations('iq');
  const [passo, setPasso] = useState(0);
  const [perguntou, setPerguntou] = useState(false);

  useEffect(() => {
    // The last step waits for the real result; everything before it is just
    // slow enough to read.
    if (passo >= DIMENSOES.length) return;
    if (passo === DIMENSOES.length - 1 && !pronto) return;

    const id = window.setTimeout(() => setPasso((p) => p + 1), PASSO_MS);
    return () => window.clearTimeout(id);
  }, [passo, pronto]);

  useEffect(() => {
    if (passo < DIMENSOES.length || !pronto) return;
    const id = window.setTimeout(onDone, 450);
    return () => window.clearTimeout(id);
  }, [passo, pronto, onDone]);

  const pct = Math.round((passo / DIMENSOES.length) * 100);

  return (
    <section className="runner iq-calc">
      <div className="wrap runner-inner">
        <p className="eyebrow eyebrow-light">{t('calcEyebrow')}</p>
        <h1>{t('calcTitle')}</h1>
        <p className="runner-lead">{t('calcLead')}</p>

        <div className="iq-calc-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="iq-calc-pct">{pct}%</p>

        <ul className="iq-calc-list">
          {DIMENSOES.map((d, i) => (
            <li key={d} className={i < passo ? 'is-done' : ''}>
              <span className="iq-calc-box" aria-hidden="true">
                {i < passo ? <Check size={13} strokeWidth={3} /> : null}
              </span>
              {t(`dimensions.${d}`)}
            </li>
          ))}
        </ul>
      </div>

      {/* Asked here rather than before the test: at the start it is one more
          thing between the person and the first question, and the answer
          changes nothing about how the test is scored. */}
      {passo >= 2 && !perguntou ? (
        <div className="iq-ask" role="dialog" aria-modal="true" aria-label={t('calcAsk')}>
          <div className="iq-ask-card">
            <p>{t('calcAsk')}</p>
            <div className="iq-ask-actions">
              <button type="button" className="button button-ghost" onClick={() => setPerguntou(true)}>
                {t('calcNo')}
              </button>
              <button type="button" className="button button-primary" onClick={() => setPerguntou(true)}>
                {t('calcYes')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
