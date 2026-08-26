'use client';

/**
 * One segment per item, filled where the answer landed in the clinical range.
 *
 * This replaced a gradient bar, and the reason is not only that it looks
 * better. The underlying data is a count of discrete items — 9 per domain,
 * each either flagged or not. A continuous bar draws a ratio and implies a
 * spectrum the data does not have; segments draw exactly what was measured,
 * and the reader can count them without reading the label.
 *
 * Plain elements rather than SVG: nine boxes in a flex row need no viewBox
 * maths, scale with the type, and stay legible when a browser zooms text.
 */
export function DomainSegments({
  filled,
  total,
  label,
}: {
  filled: number;
  total: number;
  /** Announced instead of the segments, which are decorative individually. */
  label: string;
}) {
  return (
    <div className="domain-segments" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`domain-segment ${i < filled ? 'is-filled' : ''}`} />
      ))}
    </div>
  );
}
