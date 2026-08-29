'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * A breather between blocks of questions.
 *
 * Forty-five items is long enough that the middle is where people leave, and a
 * screen that marks progress is the cheapest thing that helps. It also does
 * something for the measurement: a moment of pause between blocks reduces the
 * carry-over from a hard item into the next one.
 *
 * WHAT IT DOES NOT SAY is "you are faster than 78% of participants". The
 * source document asked for that, derived from a mock curve. There are no
 * measured participants to be faster than, so the sentence would be invented —
 * and inventing a comparison about someone's mind, in a product they may pay
 * for, is the line this project does not cross. What is said here is true from
 * the data at hand: how far along they are, and how much is left.
 */
export function TransitionScreen({
  answered,
  total,
  variant,
  onContinue,
}: {
  answered: number;
  total: number;
  /** Which encouragement to show — they differ by how far in the person is. */
  variant: 'start' | 'middle' | 'end';
  onContinue: () => void;
}) {
  const t = useTranslations('iq');
  const pct = Math.round((answered / total) * 100);

  return (
    <div className="iq-transition">
      <p className="eyebrow eyebrow-light">{t(`transition.${variant}.eyebrow`)}</p>
      <h2>{t(`transition.${variant}.title`)}</h2>

      <div className="iq-transition-meter" role="img" aria-label={t('progress', { answered, total })}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="iq-transition-count">{t('progress', { answered, total })}</p>

      <p className="runner-lead">{t(`transition.${variant}.body`)}</p>

      <button type="button" className="button button-primary" onClick={onContinue}>
        {t('continue')} <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * After how many ANSWERS a break appears.
 *
 * Counted in answers rather than in screens: the run has more screens than
 * items, because a memory stimulus is a screen nobody answers, and a break
 * that landed between a stimulus and its recall would sit in the middle of the
 * interference it is supposed to be measuring.
 */
export const BREAKS: { after: number; variant: 'start' | 'middle' | 'end' }[] = [
  { after: 12, variant: 'start' },
  { after: 24, variant: 'middle' },
  { after: 36, variant: 'end' },
];
