'use client';

import { useEffect, useState } from 'react';
import type { PublicItem } from '@/domain/iq/bank';

/**
 * Shows a working-memory stimulus, then takes it away.
 *
 * The countdown is visible on purpose. A stimulus that vanishes without
 * warning turns the item into a test of luck — whether the person happened to
 * be looking — rather than of memory. Telling them how long they have is part
 * of the task, not a kindness.
 *
 * Once the time is up the stimulus is gone and cannot be brought back. There
 * is no "show again": the run order guarantees the recall comes later, and
 * going back is blocked for these items, because either would hand the answer
 * over.
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
  copy: { hint: string; seconds: (n: number) => string; continueLabel: string };
}) {
  const total = item.memoria?.exibir_ms ?? 4000;
  const [remaining, setRemaining] = useState(total);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const left = total - (Date.now() - startedAt);
      if (left <= 0) {
        window.clearInterval(tick);
        setRemaining(0);
        setHidden(true);
      } else {
        setRemaining(left);
      }
    }, 100);

    return () => window.clearInterval(tick);
  }, [total]);

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="iq-memory-show">
      <p className="iq-memory-hint">{copy.hint}</p>

      {hidden ? (
        <div className="iq-memory-gone" aria-live="polite">
          <span aria-hidden="true">•••</span>
        </div>
      ) : (
        <>
          <p className="iq-memory-stimulus">{item.memoria?.estimulo}</p>
          <p className="iq-memory-countdown" aria-live="off">
            {copy.seconds(seconds)}
          </p>
        </>
      )}

      <button type="button" className="button button-primary" onClick={onDone} disabled={!hidden}>
        {copy.continueLabel}
      </button>
    </div>
  );
}
