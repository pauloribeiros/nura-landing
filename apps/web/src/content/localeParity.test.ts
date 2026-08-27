import { describe, expect, it } from 'vitest';
import ptBr from '../../messages/pt-br.json';
import en from '../../messages/en.json';
import es from '../../messages/es.json';

/**
 * The app's own text, complete and consistent across the three locales.
 *
 * This covers NURA's strings only. The instrument's items are the WHO's and
 * live in the instrument file under their own rule — they are not translated
 * here and must not be. See `wording.test.ts`.
 *
 * Two failures this catches, both of which ship silently:
 *
 *  - A key present in one locale and missing in another. next-intl renders the
 *    key path itself, so a visitor sees `result_screen.premiumCta` where a
 *    button label belongs — and only in one language, which is exactly the one
 *    nobody is looking at.
 *  - A placeholder that exists in one locale and not another. `{count}` missing
 *    from the Spanish string means the number simply never appears, and the
 *    sentence reads as though it were written wrong rather than broken.
 */

const CATALOGUES = { 'pt-br': ptBr, en, es } as Record<string, unknown>;

function flatten(value: unknown, path: string[] = []): Record<string, string> {
  if (typeof value === 'string') return { [path.join('.')]: value };
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, string>>(
      (acc, [k, v]) => Object.assign(acc, flatten(v, [...path, k])),
      {},
    );
  }
  return {};
}

const flat = Object.fromEntries(
  Object.entries(CATALOGUES).map(([locale, cat]) => [locale, flatten(cat)]),
);

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('locale parity', () => {
  const everyKey = new Set(Object.values(flat).flatMap((f) => Object.keys(f)));

  it('has a meaningful number of keys', () => {
    // If flattening silently returned nothing, the rest of this file would
    // pass while checking an empty set.
    expect(everyKey.size).toBeGreaterThan(200);
  });

  for (const locale of Object.keys(CATALOGUES)) {
    it(`${locale} has every key the others have`, () => {
      const missing = [...everyKey].filter((k) => !(k in flat[locale])).sort();
      expect(missing).toEqual([]);
    });

    it(`${locale} has no empty string`, () => {
      const empty = Object.entries(flat[locale])
        .filter(([, v]) => v.trim() === '')
        .map(([k]) => k);
      expect(empty).toEqual([]);
    });
  }

  it('uses the same placeholders in every locale', () => {
    const offenders: string[] = [];
    for (const key of everyKey) {
      const base = placeholders(flat['pt-br'][key] ?? '');
      for (const locale of ['en', 'es']) {
        const got = placeholders(flat[locale][key] ?? '');
        if (got !== base) offenders.push(`${key}: pt-br[${base}] ${locale}[${got}]`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
