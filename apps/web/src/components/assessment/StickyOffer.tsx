'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { shouldShowStickyOffer } from './stickyOfferRule';

/**
 * A bar that carries the offer while the reader explores the result.
 *
 * The result page is 4.6 screens on a 375x812 phone and the offer block starts
 * 2.3 screens down. Someone convinced by the free result would have to go
 * hunting for the button; this follows them instead.
 *
 * It appears once the free result is behind them, and hides again while the
 * real offer is on screen, so two CTAs for the same action never compete.
 *
 * Both conditions are read from element geometry on scroll rather than from an
 * IntersectionObserver. The observer version was equivalent for users but
 * impossible to verify — observers do not fire at all while a tab is not being
 * composited, so the bar could not be exercised in a headless check. Rect
 * comparisons are the same rule, measurable, and free of threshold subtleties
 * when a block is taller than the viewport, which the offer block is.
 */
export function StickyOffer({
  watchRef,
  ctaRef,
  onActivate,
}: {
  /** Once the bottom of this is above the viewport, the result has been read. */
  watchRef: React.RefObject<HTMLElement | null>;
  /** The offer's own price and button. The bar hides while these are reachable. */
  ctaRef: React.RefObject<HTMLElement | null>;
  onActivate: () => void;
}) {
  const t = useTranslations('result_screen');
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const evaluate = () => {
      const watch = watchRef.current;
      const cta = ctaRef.current;
      if (!watch || !cta) return;

      const ctaRect = cta.getBoundingClientRect();
      setVisible(
        shouldShowStickyOffer({
          resultBottom: watch.getBoundingClientRect().bottom,
          ctaTop: ctaRect.top,
          ctaBottom: ctaRect.bottom,
          viewportHeight: window.innerHeight,
        }),
      );
    };

    // Deliberately not throttled through requestAnimationFrame. rAF is paused
    // while a tab is not being composited, which leaves the bar showing the
    // state from before the tab was backgrounded until the next scroll. Two
    // rect reads per scroll event cost far less than that inconsistency, and
    // the browser already coalesces scroll events.
    //
    // Evaluated once up front so a restored scroll position settles without
    // waiting for the reader to move.
    evaluate();

    window.addEventListener('scroll', evaluate, { passive: true });
    window.addEventListener('resize', evaluate);
    return () => {
      window.removeEventListener('scroll', evaluate);
      window.removeEventListener('resize', evaluate);
    };
  }, [watchRef, ctaRef]);

  // Reserve the bar's height on the page so it never covers the last lines of
  // content — a fixed element hiding the disclaimer would be a poor trade.
  useEffect(() => {
    const height = visible ? (barRef.current?.offsetHeight ?? 0) : 0;
    document.body.style.paddingBottom = height ? `${height}px` : '';
    return () => {
      document.body.style.paddingBottom = '';
    };
  }, [visible]);

  return (
    <div
      ref={barRef}
      className={`sticky-offer ${visible ? 'is-visible' : ''}`}
      aria-hidden={!visible}
    >
      <div className="sticky-offer-inner">
        <div className="sticky-offer-copy">
          <span className="sticky-offer-name">{t('stickyName')}</span>
          <span className="sticky-offer-price">{t('premiumPrice')}</span>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={onActivate}
          tabIndex={visible ? 0 : -1}
        >
          {t('stickyCta')} <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
