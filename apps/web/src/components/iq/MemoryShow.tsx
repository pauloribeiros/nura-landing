'use client';

import { useEffect, useRef } from 'react';
import type { PublicItem } from '@/domain/iq/bank';

/**
 * Shows a working-memory stimulus for five seconds, then moves on.
 *
 * ONE SHAPE, TWO WORDINGS: what to memorise, the thing itself, and when it
 * will be asked about. A digit span is recalled on the very next screen and a
 * word twenty questions later, so only that last line differs.
 *
 * The warning is in the sentence rather than in a ticking counter. Both are
 * honest — a stimulus that vanishes unannounced would test whether the person
 * happened to be looking — but a live countdown next to a word held for later
 * counted down to nothing, and the same screen reading two different ways was
 * the confusing part.
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
    note: string;
    /** Used instead of the two above for a word, which is asked much later. */
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
      <p className="iq-memory-note">{isWord ? copy.wordNote : copy.note}</p>
    </div>
  );
}
