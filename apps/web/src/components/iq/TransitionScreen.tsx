'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TransitionArt } from '../TransitionArt';

/**
 * A breather between blocks of questions.
 *
 * Forty-five items is long enough that the middle is where people leave, and a
 * screen that marks progress is the cheapest thing that helps. It also does
 * something for the measurement: a moment of pause between blocks reduces the
 * carry-over from a hard item into the next one.
 *
 * WHAT IT DOES NOT SAY is "you are ahead of 23% of participants in Brazil".
 * That screen exists in the products this one is modelled on, and it is the
 * single most persuasive thing on it — which is exactly why it is not here.
 * There are no measured participants to be ahead of. The number would be
 * invented, about someone's mind, in a product they may pay for.
 *
 * What IS here is true and, it turns out, says the same thing: the profile is
 * being built as they answer, and here is how much of it exists so far —
 * questions answered, and which of the six dimensions have already appeared.
 * `MIN_SAMPLE_FOR_PERCENTILE` in the scoring config is the switch that makes a
 * real comparison possible; until enough runs exist, there is nothing to
 * compare against.
 */
export function TransitionScreen({
  answered,
  total,
  variant,
  dimensoes,
  onContinue,
}: {
  answered: number;
  total: number;
  /** Which encouragement to show — they differ by how far in the person is. */
  variant: 'start' | 'middle' | 'end';
  /** Dimensions already touched by the answers given, in the order they came. */
  dimensoes: string[];
  onContinue: () => void;
}) {
  const t = useTranslations('iq');
  const pct = Math.round((answered / total) * 100);
  const nomes = dimensoes.map((d) => t(`dimensions.${d}`));
  // Arithmetic, not a claim: how much is done and how much is left.
  const numeros = { restantes: total - answered, pct };

  return (
    <div className="iq-transition">
      <TransitionArt variant={variant} />
      <p className="eyebrow eyebrow-light">{t(`transition.${variant}.eyebrow`)}</p>
      <h2>{t(`transition.${variant}.title`, numeros)}</h2>

      <div className="iq-transition-meter" role="img" aria-label={t('progress', { answered, total })}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="iq-transition-count">{t('progress', { answered, total })}</p>

      <p className="runner-lead">{t(`transition.${variant}.body`, numeros)}</p>

      {/* The one measured fact available mid-test, and the reason the copy
          above can honestly say a profile is taking shape. */}
      {nomes.length > 0 ? (
        <p className="iq-transition-dimensions">
          {t('transitionDimensions', {
            n: nomes.length,
            lista: new Intl.ListFormat(undefined, { style: 'long', type: 'conjunction' }).format(
              nomes,
            ),
          })}
        </p>
      ) : null}

      <button type="button" className="button button-primary" onClick={onContinue}>
        {t('continue')} <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
