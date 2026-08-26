'use client';

import { Check, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * The screening outcome as a single visual signal, so the severity does not
 * have to be read out of a paragraph.
 *
 * TWO states, not three. The ASRS Part A defines one cutoff and two bands —
 * below 4, and 4 to 6 — and nothing else. A third "high" band at 6 out of 6
 * would be a severity gradation the instrument does not make: within the
 * positive band, a 6 is not validated as worse than a 4, only as also above
 * the line. Inventing one would be a change to how a licensed instrument is
 * interpreted, which is what `scoringVersion` exists to track, and it would be
 * a claim NURA cannot support.
 *
 * NOT a traffic light either. Green/amber/red is the colour language of
 * medical urgency, and painting a positive ADHD screen red frames
 * neurodivergence as an alarm — the opposite of "made to discover, not to
 * label". The positive state is amber-toned to say "look into this", the
 * negative one is cool and quiet. Neither says good or bad.
 *
 * The band is passed in rather than recomputed from the score: the scorer
 * already decided it, and two places deciding the same thing is one place too
 * many.
 */
export function StatusBadge({ band }: { band: string }) {
  const t = useTranslations('result_screen');
  const elevated = band === 'highlyConsistent';

  return (
    <p className={`status-badge ${elevated ? 'is-attention' : 'is-clear'}`}>
      {elevated ? (
        <Search size={14} aria-hidden="true" />
      ) : (
        <Check size={14} aria-hidden="true" />
      )}
      {t(elevated ? 'badgeAttention' : 'badgeClear')}
    </p>
  );
}
