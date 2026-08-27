'use client';

import { useEffect, useState } from 'react';

/**
 * Elapsed time, counting up.
 *
 * Read from the difference between two timestamps rather than accumulated by
 * an interval. A backgrounded tab throttles timers to once a second or worse,
 * so a counter would silently lose time — and this number feeds the score.
 *
 * Rendered only after mount. The server has no clock the client agrees with,
 * and printing one would be a hydration mismatch on every load.
 */
export function Timer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    setNow(Date.now() - start);
    const tick = window.setInterval(() => setNow(Date.now() - start), 1000);
    return () => window.clearInterval(tick);
  }, [startedAt]);

  if (now === null) return <span className="iq-timer" aria-hidden="true" />;

  const seconds = Math.floor(now / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    // `aria-hidden` because a screen reader announcing the clock every second
    // would bury the question. The time is not something to act on.
    <span className="iq-timer" aria-hidden="true">
      {mm}:{ss}
    </span>
  );
}
