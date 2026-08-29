'use client';

import { useEffect, useRef } from 'react';
import type { PublicItem } from '@/domain/iq/bank';

/**
 * Shows a working-memory stimulus for five seconds, then moves on.
 *
 * WHAT TO MEMORISE, AND THE THING ITSELF. Nothing else for a digit span: it
 * is asked about on the very next screen, so there is nothing to warn anyone
 * about, and a line explaining that only stands between the person and four
 * digits they have five seconds to hold.
 *
 * A word is different — it is asked about twenty questions later, or at the
 * very end — so that screen keeps one line saying so. That sentence is the
 * task, not decoration.
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
    /** Used instead of `hint` for a word, plus the line about when it returns. */
    wordHint: string;
    wordNote: string;
  };
}) {
  const isWord = item.tipo === 'span_palavra';
  const total = item.memoria?.exibir_ms ?? 5000;

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
      if (Date.now() - startedAt < total) return;
      window.clearInterval(tick);
      doneRef.current();
    }, 100);

    return () => window.clearInterval(tick);
  }, [total, item.id]);

  return (
    <div className="iq-memory-show">
      <p className="iq-memory-hint">{isWord ? copy.wordHint : copy.hint}</p>
      <p className="iq-memory-stimulus">{item.memoria?.estimulo}</p>
      {isWord ? <p className="iq-memory-note">{copy.wordNote}</p> : null}
    </div>
  );
}
