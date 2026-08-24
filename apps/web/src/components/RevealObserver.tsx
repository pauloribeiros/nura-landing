'use client';

import { useEffect } from 'react';

const TARGETS = '.reveal, .reveal-lines, .reveal-display, .reveal-group';

/**
 * Adds `.visible` to reveal targets as they enter the viewport.
 *
 * Mounted in the locale layout, not in a page. It used to live inside
 * LandingProvider — a home-page concern that also owns the toast — so any other
 * route reusing a component with `.reveal` rendered it at `opacity: 0` forever.
 * That is exactly what happened to the assessment landing.
 *
 * It also re-runs per pathname because App Router navigations swap the tree
 * without remounting the layout.
 */
export function RevealObserver() {
  useEffect(() => {
    const reveal = (el: Element) => el.classList.add('visible');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll(TARGETS).forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        }),
      { threshold: 0.12 },
    );

    const observeAll = () => document.querySelectorAll(TARGETS).forEach((el) => observer.observe(el));
    observeAll();

    // Anything added later — a route change, an accordion, a lazy island —
    // still gets picked up.
    const mutation = new MutationObserver(observeAll);
    mutation.observe(document.body, { childList: true, subtree: true });

    // Last resort: if an element never intersects (zero-height parent, a
    // browser that throttles the observer), it must not stay invisible.
    const failsafe = window.setTimeout(
      () => document.querySelectorAll(TARGETS).forEach(reveal),
      4000,
    );

    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return null;
}
