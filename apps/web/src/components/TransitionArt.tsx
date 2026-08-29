/**
 * Illustrations for the break screens.
 *
 * The files are Storyset (Freepik), recoloured to the brand cyan on their
 * site before download. Their licence is free for commercial use ONLY with a
 * visible credit — that credit lives in the site footer, see `Footer`. If it
 * is ever removed, these have to go too, or the licence stops applying.
 *
 * Served from /public rather than inlined into the bundle. Together they are
 * ~100KB of markup; inlined, every visitor would download them to render the
 * first screen of the site, to show three pictures that appear twelve
 * questions into a twenty-minute test. As files they are fetched once, cached,
 * and never touch the people who do not take the test.
 *
 * `aria-hidden` throughout: each one restates the heading beside it, so a
 * screen reader announcing them would read the same thing twice.
 *
 * Shared by both tests, so a picture added for one is available to the other.
 */

/** Which picture belongs to which break, and what it shows. */
export const ART_SRC = {
  /** After 12 — a person and a lit bulb: the warm-up worked. */
  start: '/art/transicao-inicio.svg',
  /** After 24 — someone reading, settled in: the long middle. */
  middle: '/art/transicao-meio.svg',
  /** After 36 — two people raising a rising curve: the last stretch. */
  end: '/art/transicao-final.svg',
  /**
   * Between the ASRS screening block and the detail block. Currently a copy of
   * `transicao-meio.svg` — replacing that one file with a picture of its own
   * is the whole change; nothing here has to move.
   */
  tdah: '/art/transicao-tdah.svg',
} as const;

export type ArtVariant = keyof typeof ART_SRC;

export function TransitionArt({ variant }: { variant: ArtVariant }) {
  return (
    // A static SVG from /public: next/image cannot optimise it and would only
    // add a wrapper.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="transition-art"
      src={ART_SRC[variant]}
      alt=""
      width={500}
      height={500}
      aria-hidden="true"
      decoding="async"
    />
  );
}

/**
 * Fetches the three files early.
 *
 * A break screen is a reward, and a reward that renders as a blank gap for a
 * second is not one. The runner calls this on mount: by the time anyone gets
 * to question twelve the images have been sitting in the cache for minutes,
 * and on a phone with a bad connection that is the difference between the
 * screen appearing and the screen assembling itself.
 */
export function preloadTransitionArt() {
  for (const src of Object.values(ART_SRC)) {
    const img = new Image();
    img.src = src;
  }
}
