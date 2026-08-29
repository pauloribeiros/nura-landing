'use client';

import { useEffect } from 'react';

/**
 * Marks the page as "a test is running", which hides the site footer.
 *
 * While someone is answering, the page is one task. The footer is ~295px of
 * site navigation sitting directly under the choices — on a phone it was the
 * single largest reason a question did not fit the screen, and it offers
 * nothing to a person mid-question. It comes back on the intro and the result,
 * which is where anyone would go looking for it.
 *
 * A body class rather than not rendering the footer: it belongs to the root
 * layout, and a running test is a state of the page, not a different page.
 * Both runners use this, so the two tests cannot drift apart on it.
 */
export function useFocusMode(active: boolean) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add('is-running-test');
    return () => document.body.classList.remove('is-running-test');
  }, [active]);
}
