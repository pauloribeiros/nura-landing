import type { ItemResponse } from '@/domain/assessment/report';

/**
 * The report's figures.
 *
 * Every one of them encodes magnitude by LENGTH or COUNT, in a single hue.
 * That is not a stylistic preference: this page sits on a near-black surface,
 * and a sequential colour ramp there puts its low steps below 3:1 against the
 * background — the validator flags exactly that. Length does not have the
 * problem, needs no legend, and survives greyscale printing, which matters for
 * a document someone may take to an appointment.
 *
 * Nothing here compares the reader to a population. NURA holds no normative
 * sample, so a percentile or a "higher than X% of people" would be invented.
 * The figures show what the person answered and where the instrument's own
 * cutoff falls, and stop there.
 *
 * Plain elements rather than SVG wherever a box will do: they scale with the
 * type, survive a browser zoom, and print without a viewBox fight.
 */

/**
 * Part A against its cutoff — one ratio against a limit, so a meter and not a
 * chart. The cutoff is drawn ON the track, because the number only means
 * something relative to it.
 */
export function ScreeningMeter({
  count,
  total,
  cutoff,
  label,
  cutoffLabel,
}: {
  count: number;
  total: number;
  cutoff: number;
  label: string;
  cutoffLabel: string;
}) {
  const reached = count >= cutoff;

  return (
    <figure className="fig fig-meter">
      <div className="meter-head">
        <span className="meter-value">
          {count}
          <span className="meter-of">/{total}</span>
        </span>
        <span className="meter-label">{label}</span>
      </div>

      <div className="meter-track" role="img" aria-label={`${count} de ${total}. ${cutoffLabel}`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`meter-cell ${i < count ? 'is-on' : ''}`} />
        ))}
        {/* The cutoff sits between cells, so it is positioned on the gap
            rather than inside a cell — a marker inside would read as
            belonging to that item. */}
        <span className="meter-cut" style={{ left: `${(cutoff / total) * 100}%` }} aria-hidden="true">
          <span className="meter-cut-line" />
        </span>
      </div>

      <figcaption className={reached ? 'is-reached' : ''}>{cutoffLabel}</figcaption>
    </figure>
  );
}

/**
 * Every item and the frequency chosen for it.
 *
 * Five cells per item, filled to the answer. The same shape the free result
 * uses for domains, so a reader who saw that one already knows how to read
 * this. Flagged items carry a mark, which is the secondary encoding that keeps
 * "in range" from resting on colour alone.
 */
export function ItemProfile({
  responses,
  prompts,
  scaleLabels,
  flaggedLabel,
}: {
  responses: ItemResponse[];
  prompts: Record<string, string>;
  /** The instrument's five frequency labels, in order. */
  scaleLabels: string[];
  flaggedLabel: string;
}) {
  return (
    <div className="fig fig-items">
      {responses.map((r) => (
        <div key={r.id} className={`item-row ${r.flagged ? 'is-flagged' : ''}`}>
          <p className="item-text">
            {prompts[r.id]}
            {r.part === 'A' ? <span className="item-part">A</span> : null}
          </p>
          <div className="item-scale">
            <div
              className="item-cells"
              role="img"
              aria-label={`${scaleLabels[r.value]}${r.flagged ? `. ${flaggedLabel}` : ''}`}
            >
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`item-cell ${i <= r.value ? 'is-on' : ''}`} />
              ))}
            </div>
            <span className="item-answer">{scaleLabels[r.value]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * How the 18 answers spread across the five frequencies.
 *
 * A real distribution, so a real bar chart — and the only figure here that is
 * one. Bars are horizontal because the category names are words, not numbers.
 */
export function FrequencyDistribution({
  distribution,
  scaleLabels,
  title,
  itemsLabel,
}: {
  distribution: number[];
  scaleLabels: string[];
  title: string;
  itemsLabel: string;
}) {
  const max = Math.max(...distribution, 1);
  const total = distribution.reduce((a, b) => a + b, 0);

  return (
    <figure className="fig fig-dist">
      <figcaption className="fig-title">{title}</figcaption>
      <div className="dist-rows">
        {distribution.map((n, i) => (
          <div key={i} className="dist-row">
            <span className="dist-label">{scaleLabels[i]}</span>
            <div className="dist-track">
              {/* Zero is drawn as an empty track rather than nothing, so the
                  category is still visibly present at zero. */}
              <span className="dist-bar" style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className="dist-value">{n}</span>
          </div>
        ))}
      </div>
      <p className="fig-note">
        {total} {itemsLabel}
      </p>
    </figure>
  );
}

/**
 * What a screening is and is not.
 *
 * Not a chart — a diagram, and the most important figure in the report. The
 * single most common misreading of a positive screen is treating it as a
 * diagnosis, and a picture of the three stages does more against that than
 * another paragraph saying so.
 */
export function ScreeningStages({
  title,
  stages,
  here,
}: {
  title: string;
  stages: { label: string; body: string }[];
  /** Index of the stage the reader is at. */
  here: number;
}) {
  return (
    <figure className="fig fig-stages">
      <figcaption className="fig-title">{title}</figcaption>
      <ol className="stages">
        {stages.map((s, i) => (
          <li key={s.label} className={i === here ? 'is-here' : ''}>
            <span className="stage-dot" aria-hidden="true" />
            <div>
              <p className="stage-label">{s.label}</p>
              <p className="stage-body">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}

/**
 * The two dimensions side by side.
 *
 * Two headline numbers, so stat tiles rather than a two-bar chart. The bar
 * under each is context for its own number, not a comparison axis — which is
 * why they share a scale and are labelled with it.
 */
export function DomainStats({
  domains,
  ofLabel,
}: {
  domains: { label: string; flagged: number; total: number }[];
  ofLabel: string;
}) {
  return (
    <div className="fig fig-domains">
      {domains.map((d) => (
        <div key={d.label} className="domain-tile">
          <p className="domain-tile-value">
            {d.flagged}
            <span className="domain-tile-of">
              {' '}
              {ofLabel} {d.total}
            </span>
          </p>
          <p className="domain-tile-label">{d.label}</p>
          <div className="domain-tile-track" aria-hidden="true">
            <span style={{ width: `${(d.flagged / d.total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
