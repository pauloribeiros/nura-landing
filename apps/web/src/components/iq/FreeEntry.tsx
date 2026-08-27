'use client';

import type { PublicItem } from '@/domain/iq/bank';

/**
 * Free entry for the digit-span items.
 *
 * `inputMode="numeric"` rather than `type="number"`: a number input on a phone
 * brings a spinner, accepts a minus sign and an exponent, and strips leading
 * zeros — none of which belong in "type the digits you saw". A text field with
 * a numeric keypad gives the right keyboard and keeps the string as typed.
 *
 * Spacing is not corrected as the person types. The scorer ignores whitespace,
 * so "4 9 2" and "492" are the same answer, and fighting the input while
 * someone is recalling from memory would cost them the thing being measured.
 */
export function FreeEntry({
  item,
  value,
  onChange,
  copy,
}: {
  item: PublicItem;
  value: string;
  onChange: (value: string) => void;
  copy: { label: string; placeholder: string; hint: string };
}) {
  const digits = item.memoria?.estimulo.replace(/\s+/g, '').length ?? 6;

  return (
    <div className="iq-free-entry">
      <label className="iq-free-entry-field">
        <span>{copy.label}</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          // Room for the digits plus the spaces someone may type between them.
          maxLength={digits * 2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={copy.placeholder}
        />
      </label>
      <p className="runner-hint">{copy.hint}</p>
    </div>
  );
}
