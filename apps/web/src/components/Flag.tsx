import type { Locale } from '@/i18n/routing';

/**
 * Inline SVG rather than emoji: Windows ships no glyphs for regional-indicator
 * pairs, so 🇧🇷 renders as the letters "BR" there. Drawn to a shared 4:3 box so
 * the three read as one icon set instead of three different aspect ratios.
 */

const BOX = { width: 20, height: 15, viewBox: '0 0 20 15' } as const;

function Brazil() {
  return (
    <>
      <rect width="20" height="15" fill="#009B3A" />
      <path d="M10 1.6 18.2 7.5 10 13.4 1.8 7.5Z" fill="#FEDF00" />
      <circle cx="10" cy="7.5" r="3.1" fill="#002776" />
      <path
        d="M6.95 6.7a9.5 9.5 0 0 1 6.1 1.75"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="0.85"
      />
    </>
  );
}

function UnitedStates() {
  const stripe = 15 / 13;
  return (
    <>
      <rect width="20" height="15" fill="#FFFFFF" />
      <g fill="#B22234">
        {[0, 2, 4, 6, 8, 10, 12].map((i) => (
          <rect key={i} y={i * stripe} width="20" height={stripe} />
        ))}
      </g>
      <rect width="8.6" height={stripe * 7} fill="#3C3B6E" />
      <g fill="#FFFFFF">
        {[1.4, 4.05, 6.7].map((y) =>
          [1.2, 3.1, 5.0, 6.9].map((x) => <circle key={`a${x}-${y}`} cx={x} cy={y} r="0.48" />),
        )}
        {[2.7, 5.4].map((y) =>
          [2.15, 4.05, 5.95].map((x) => <circle key={`b${x}-${y}`} cx={x} cy={y} r="0.48" />),
        )}
      </g>
    </>
  );
}

function Spain() {
  return (
    <>
      <rect width="20" height="15" fill="#AA151B" />
      <rect y="3.75" width="20" height="7.5" fill="#F1BF00" />
    </>
  );
}

const FLAGS: Record<Locale, () => React.JSX.Element> = {
  'pt-br': Brazil,
  en: UnitedStates,
  es: Spain,
};

export function Flag({ locale, className }: { locale: Locale; className?: string }) {
  const Shape = FLAGS[locale];
  return (
    <svg
      {...BOX}
      className={`flag ${className ?? ''}`}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={`flag-clip-${locale}`}>
          <rect width="20" height="15" rx="2.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-clip-${locale})`}>
        <Shape />
      </g>
      <rect
        width="19"
        height="14"
        x="0.5"
        y="0.5"
        rx="2"
        fill="none"
        stroke="rgba(255,255,255,.28)"
        strokeWidth="1"
      />
    </svg>
  );
}
