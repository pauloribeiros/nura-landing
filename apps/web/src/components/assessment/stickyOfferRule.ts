/**
 * When the floating offer bar should be on screen.
 *
 * Extracted from the component so the rule can be tested against real
 * geometry. The browser environment used for checks does not composite the
 * page, which pauses IntersectionObserver and requestAnimationFrame alike —
 * so a rule that only exists inside an effect cannot be exercised at all. A
 * pure function can, and doing so immediately caught the mistake below.
 *
 * The bar hides against the offer's OWN call to action, not against the whole
 * offer block. Measuring the block looked equivalent and was not: the block
 * runs 1835..2653 while the free result ends at 1190, and the locked preview
 * between them is only 545px — shorter than the 812px viewport. There is
 * therefore no scroll position where the result is above the fold and the
 * block is below it, so the bar could only ever have appeared after the reader
 * had already scrolled past the offer entirely. Which is precisely when it is
 * least useful.
 *
 * Hiding against the call to action also states the rule honestly: this bar
 * exists to keep a button within reach, so it steps aside exactly while the
 * real button is reachable.
 *
 * All values are viewport-relative, as `getBoundingClientRect` reports them.
 */
export interface StickyOfferGeometry {
  /** Bottom of the free result block. Negative once it is above the fold. */
  resultBottom: number;
  /** The offer's price and button, not the whole offer block. */
  ctaTop: number;
  ctaBottom: number;
  viewportHeight: number;
}

export function shouldShowStickyOffer({
  resultBottom,
  ctaTop,
  ctaBottom,
  viewportHeight,
}: StickyOfferGeometry): boolean {
  // The reader has the free result behind them — offering before that would
  // interrupt the thing they came for.
  const resultRead = resultBottom < 0;

  const ctaOnScreen = ctaTop < viewportHeight && ctaBottom > 0;

  return resultRead && !ctaOnScreen;
}
