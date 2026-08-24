import { createElement, type CSSProperties, type ReactNode } from 'react';

interface Props {
  /** One entry per visual line. Order is the reveal order. */
  lines: ReactNode[];
  /** Index from which lines take the accent colour. */
  accentFrom?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
  className?: string;
}

/**
 * Display headline whose lines rise out from behind their own mask.
 *
 * Each line is a block with `overflow: hidden` wrapping an inner block that
 * starts pushed down, so the text emerges from the line above instead of
 * fading in. Server component: the effect is pure CSS, and the only client
 * work is the shared IntersectionObserver adding `.visible`.
 *
 * Built with `createElement` rather than a `<Tag>` in JSX because a dynamic
 * `ElementType` collapses the children type to `never`.
 */
export function RevealLines({ lines, accentFrom, as = 'h2', className }: Props) {
  return createElement(
    as,
    { className: `reveal-lines ${className ?? ''}`.trim() },
    lines.map((line, i) =>
      createElement(
        'span',
        { className: 'reveal-line', key: i },
        createElement(
          'span',
          {
            className: accentFrom !== undefined && i >= accentFrom ? 'accent' : undefined,
            style: { '--line-index': i } as CSSProperties,
          },
          line,
        ),
      ),
    ),
  );
}
