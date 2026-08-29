/**
 * Illustrations for the break screens.
 *
 * Drawn here rather than borrowed. The reference screenshots come from another
 * product, and their art is theirs; what carries over is the idea that a break
 * screen wants a picture, not the pictures themselves.
 *
 * Line work in the brand's cyan on the dark page, matching the figures inside
 * the test rather than importing a flat-illustration style the rest of NURA
 * does not use. No gradients and no fills that would need a white ground —
 * these sit directly on the page.
 *
 * `aria-hidden` throughout: each one restates the heading beside it, so a
 * screen reader announcing them would read the same thing twice.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Warm-up done: a path of rising steps, the first three walked. */
export function ArtStart() {
  return (
    <svg viewBox="0 0 220 120" className="iq-art" aria-hidden="true">
      <g {...stroke}>
        <path d="M14 104h34V84h34V62h34V38h34V14h42" opacity="0.35" />
        <path d="M14 104h34V84h34V62h34" strokeWidth={3} />
        <circle cx="116" cy="52" r="7" strokeWidth={3} />
        <path d="M116 59v18M108 66h16M110 92l6-15M122 92l-6-15" strokeWidth={2.4} />
      </g>
    </svg>
  );
}

/** Halfway: a track with the marker at its midpoint. */
export function ArtMiddle() {
  return (
    <svg viewBox="0 0 220 120" className="iq-art" aria-hidden="true">
      <g {...stroke}>
        <path d="M20 74h180" opacity="0.3" strokeWidth={6} />
        <path d="M20 74h90" strokeWidth={6} />
        <circle cx="110" cy="74" r="15" strokeWidth={3} />
        <path d="M110 60V38" opacity="0.55" />
        <path d="M110 38h34v18h-34z" />
        <path d="M40 96h30M150 96h30" opacity="0.3" />
      </g>
    </svg>
  );
}

/** Final stretch: the last flag, close now. */
export function ArtEnd() {
  return (
    <svg viewBox="0 0 220 120" className="iq-art" aria-hidden="true">
      <g {...stroke}>
        <path d="M20 100h180" opacity="0.3" />
        <path d="M156 100V26" strokeWidth={3} />
        <path d="M156 30h44l-12 14 12 14h-44z" strokeWidth={2.4} />
        <circle cx="66" cy="70" r="8" strokeWidth={3} />
        <path d="M66 78v16M56 86h20M60 100l6-12M78 100l-6-12" strokeWidth={2.4} />
        <path d="M96 62h16M104 54v16" opacity="0.5" />
      </g>
    </svg>
  );
}

export const ART = { start: ArtStart, middle: ArtMiddle, end: ArtEnd } as const;
