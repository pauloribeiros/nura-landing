import { describe, expect, it } from 'vitest';
import ptBr from '../../messages/pt-br.json';
import en from '../../messages/en.json';
import es from '../../messages/es.json';

/**
 * Section 15 of the product master doc forbids diagnostic language in anything
 * touching ADHD, autism and neurodivergence. That rule is easy to hold while
 * writing and easy to lose three copy edits later, so it is enforced here
 * rather than left to review.
 *
 * These patterns are the ones the document names explicitly, plus the obvious
 * translations. A match is not always wrong in isolation — "diagnóstico" is
 * fine inside "não constitui diagnóstico" — so the assertions target the
 * claim shapes, not the words.
 */

const CATALOGUES = { 'pt-br': ptBr, en, es } as Record<string, unknown>;

function allStrings(value: unknown, path: string[] = []): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path: path.join('.'), text: value }];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => allStrings(v, [...path, k]));
  }
  return [];
}

/** Claims that assert the person has, or does not have, a condition. */
const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: 'tells the person they have it', pattern: /\bvoc[êe]\s+tem\s+TDAH\b/i },
  { name: 'tells the person they are autistic', pattern: /\bvoc[êe]\s+[ée]\s+autista\b/i },
  { name: 'you have ADHD', pattern: /\byou\s+have\s+ADHD\b/i },
  { name: 'you are autistic', pattern: /\byou\s+are\s+autistic\b/i },
  { name: 'tienes TDAH', pattern: /\btienes\s+TDAH\b/i },
  { name: 'instant diagnosis', pattern: /diagn[oó]stico\s+(instant[âa]neo|imediato)/i },
  { name: 'definitive result', pattern: /resultado\s+(definitivo|conclusivo)/i },
  { name: 'definitive result (en)', pattern: /\bdefinitive\s+result\b/i },
  { name: 'promises a diagnosis', pattern: /(receba|obtenha|descubra)\s+seu\s+diagn[oó]stico/i },
  { name: 'claims accuracy', pattern: /\d+\s*%\s*de\s*(precis[ãa]o|acerto)/i },
];

describe('responsible language', () => {
  for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
    const strings = allStrings(catalogue);

    it(`${locale} makes no diagnostic claim`, () => {
      const offences = strings.flatMap(({ path, text }) =>
        FORBIDDEN.filter(({ pattern }) => pattern.test(text)).map(({ name }) => `${path}: ${name}`),
      );
      expect(offences).toEqual([]);
    });

    it(`${locale} keeps a disclaimer wherever a result is described`, () => {
      // Any screen that reports an outcome has to carry the limit with it.
      const disclaimer = strings.find((s) => s.path === 'result_screen.disclaimer');
      expect(disclaimer?.text).toMatch(/(diagn[oó]stic|diagnosis)/i);
      // pt "não constitui", es "no constituye", en "is not a diagnosis"
      expect(disclaimer?.text).toMatch(/(n[ãa]?o\s+constitu[iy]e?|is not a diagnosis)/i);
    });
  }

  it('offers no assessment copy in a locale without an official instrument', async () => {
    const { asrs18Locales } = await import('@/domain/assessment/instruments/asrs18');
    expect(asrs18Locales).toContain('pt-br');
  });
});
