'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { PublicItem } from '@/domain/iq/bank';

/**
 * Shows a working-memory stimulus for five seconds, then moves on.
 *
 * WHAT TO MEMORISE, THE THING ITSELF, AND HOW LONG IS LEFT.
 *
 * The digits count down: five seconds is short enough that knowing how much
 * is left changes how a person spends them, and a stimulus that vanished
 * unannounced would test whether they happened to be looking.
 *
 * A word gets a sentence instead of a clock — it is asked about twenty
 * questions later, or at the very end, so counting down to its disappearance
 * would promise a question that is not coming next.
 *
 * WHEN THE CLOCK HITS ZERO THE NEXT SCREEN IS ALREADY THERE. No button, and no
 * screen in between: this used to hold an empty "•••" for a beat, meant as
 * punctuation, and it read as a rest stop on the way to somewhere else. The
 * stimulus disappearing IS the punctuation.
 *
 * The clock is read from timestamps rather than counted down by interval. A
 * backgrounded tab throttles timers, and a counter would leave the stimulus on
 * screen for as long as the person was away.
 */
export function MemoryShow({
  item,
  onDone,
  copy,
}: {
  item: PublicItem;
  onDone: () => void;
  copy: {
    hint: string;
    seconds: (n: number) => ReactNode;
    /** Used instead of the two above for a word, which is asked much later. */
    wordHint: string;
    wordNote: string;
  };
}) {
  const isWord = item.tipo === 'span_palavra';
  const total = item.memoria?.exibir_ms ?? 5000;
  const [remaining, setRemaining] = useState(total);

  // Held in a ref so the countdown does not depend on the callback's identity.
  // As a dependency it restarted the five seconds every time the parent
  // re-rendered, and the stimulus stayed up for as long as that kept
  // happening — the exposure has to be the same for everyone or the item
  // measures nothing comparable.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const startedAt = Date.now();
    // Read from timestamps rather than counted down: a backgrounded tab
    // throttles timers, and a counter would leave the stimulus on screen for
    // as long as the person was away.
    const tick = window.setInterval(() => {
      const left = total - (Date.now() - startedAt);
      if (left > 0) {
        setRemaining(left);
        return;
      }

      window.clearInterval(tick);
      doneRef.current();
    }, 100);

    return () => window.clearInterval(tick);
  }, [total, item.id]);

  // Rounded up, so the last full second still reads "1" instead of "0".
  const seconds = Math.max(1, Math.ceil(remaining / 1000));

  return (
    <div className="iq-memory-show">
      <p className="iq-memory-hint">{isWord ? copy.wordHint : copy.hint}</p>
      <p className="iq-memory-stimulus">{item.memoria?.estimulo}</p>
      <p className="iq-memory-note" aria-live="off">
        {isWord ? copy.wordNote : copy.seconds(seconds)}
      </p>
    </div>
  );
}
