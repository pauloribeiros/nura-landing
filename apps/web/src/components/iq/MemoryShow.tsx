'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicItem } from '@/domain/iq/bank';

/**
 * Shows a working-memory stimulus for five seconds, then asks about it.
 *
 * The countdown is visible on purpose. A stimulus that vanishes without
 * warning turns the item into a test of luck — whether the person happened to
 * be looking — rather than of memory. Telling them how long they have is part
 * of the task, not a kindness.
 *
 * WHEN THE CLOCK HITS ZERO THE QUESTION IS ALREADY THERE. No button, and no
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
  copy: { hint: string; seconds: (n: number) => string };
}) {
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

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="iq-memory-show">
      <p className="iq-memory-hint">{copy.hint}</p>
      <p className="iq-memory-stimulus">{item.memoria?.estimulo}</p>
      <p className="iq-memory-countdown" aria-live="off">
        {copy.seconds(seconds)}
      </p>
    </div>
  );
}
