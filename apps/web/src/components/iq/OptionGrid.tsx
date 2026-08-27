'use client';

import { Check } from 'lucide-react';
import type { PublicItem } from '@/domain/iq/bank';

/**
 * The answer options, as radios.
 *
 * Real radio inputs rather than buttons with state: they give keyboard
 * navigation, screen-reader grouping and one-choice-per-question for free, and
 * they behave the way a form is expected to. The visible styling hangs off
 * `:checked`, so nothing about the interaction is reimplemented.
 *
 * Figures go two per row and text goes one per row, because a rotated cube is
 * read by shape and a sentence is read by line.
 */
export function OptionGrid({
  item,
  chosen,
  onChoose,
  letters,
}: {
  item: PublicItem;
  chosen: number | null | undefined;
  onChoose: (index: number) => void;
  /** Labels for the options — a letter per position, from the catalogue. */
  letters: string[];
}) {
  const isSvg = item.formato_alternativas === 'svg';

  return (
    <div className={`iq-options ${isSvg ? 'is-figures' : 'is-text'}`} role="radiogroup" aria-label={item.enunciado}>
      {item.alternativas.map((alternativa, index) => (
        <label key={index} className={`iq-option ${chosen === index ? 'is-chosen' : ''}`}>
          <input
            type="radio"
            name={item.id}
            value={index}
            checked={chosen === index}
            onChange={() => onChoose(index)}
          />
          <span className="iq-option-letter" aria-hidden="true">
            {letters[index] ?? index + 1}
          </span>

          {isSvg ? (
            <span className="iq-figure" dangerouslySetInnerHTML={{ __html: alternativa }} />
          ) : (
            <span className="iq-option-text">{alternativa}</span>
          )}

          {chosen === index ? <Check size={16} className="iq-option-check" aria-hidden="true" /> : null}
        </label>
      ))}
    </div>
  );
}
