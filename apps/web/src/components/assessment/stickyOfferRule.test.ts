import { describe, expect, it } from 'vitest';
import { shouldShowStickyOffer } from './stickyOfferRule';

/**
 * Exercised with the page's real measurements, taken from the built result
 * screen at 375x812 on the elevated branch:
 *
 *   free result      272 .. 1191
 *   locked preview  1257 .. 1803
 *   offer block     1837 .. 2633
 *   offer CTA       2309 .. 2540   (price, button, note)
 *   document 3738 tall, so the furthest scroll is 2926.
 *
 * These are the numbers that caught the first version of the rule, which
 * hid against the whole offer block: the gap between the result ending and
 * the block starting is shorter than the viewport, so the bar could never
 * appear before the offer — only after it had been scrolled past.
 */

const VIEWPORT = 812;
const RESULT_BOTTOM = 1191;
const CTA = { top: 2309, bottom: 2540 };
const MAX_SCROLL = 2926;

const atScroll = (y: number) =>
  shouldShowStickyOffer({
    resultBottom: RESULT_BOTTOM - y,
    ctaTop: CTA.top - y,
    ctaBottom: CTA.bottom - y,
    viewportHeight: VIEWPORT,
  });

describe('sticky offer visibility', () => {
  it('stays hidden while the free result is being read', () => {
    expect(atScroll(0)).toBe(false);
    expect(atScroll(600)).toBe(false);
    expect(atScroll(1100)).toBe(false); // last lines still on screen
  });

  it('appears once the result is behind the reader', () => {
    // Reading the locked preview, offer still below the fold. This window is
    // the whole point of the bar and the first implementation had none.
    expect(atScroll(1250)).toBe(true);
    expect(atScroll(1450)).toBe(true);
  });

  it('steps aside while the real call to action is reachable', () => {
    expect(atScroll(1550)).toBe(false); // CTA entering from below
    expect(atScroll(2000)).toBe(false);
    expect(atScroll(2400)).toBe(false); // CTA filling the screen
  });

  it('returns after the call to action is scrolled past', () => {
    expect(atScroll(2600)).toBe(true);
    expect(atScroll(MAX_SCROLL)).toBe(true);
  });

  it('opens a usable window before the offer, not only after it', () => {
    const before = [];
    for (let y = 0; y <= MAX_SCROLL; y += 10) {
      if (atScroll(y) && y < CTA.top) before.push(y);
    }
    // Roughly 1200..1490: enough scrolling to be worth having.
    expect(before.length).toBeGreaterThan(20);
    expect(Math.min(...before)).toBeGreaterThan(RESULT_BOTTOM);
  });
});
