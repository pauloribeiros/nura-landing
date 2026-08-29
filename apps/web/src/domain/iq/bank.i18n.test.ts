import { describe, expect, it } from 'vitest';
import { ITEMS, bankLocales, itemsIn, publicItems } from './bank';

/**
 * A translated bank can be wrong in a way nothing else notices: the test still
 * runs, the score still comes out, and it is scored against the wrong option.
 *
 * `correta` is an INDEX. The scorer reads it from the Portuguese bank while the
 * person answers in English, so the two arrays have to line up position for
 * position. That is what most of this file is about.
 */

const translated = bankLocales.filter((l) => l !== 'pt-br');
const hasLetters = (s: string) => /[A-Za-zÀ-ÿ]/.test(s);

describe.each(translated)('bank in %s', (locale) => {
  const items = itemsIn(locale);
  const byId = new Map(items.map((i) => [i.id, i]));

  it('has every item, once', () => {
    expect(items).toHaveLength(ITEMS.length);
    expect(new Set(items.map((i) => i.id)).size).toBe(ITEMS.length);
  });

  it('keeps the options in the same order, so the answer key still points at the answer', () => {
    for (const original of ITEMS) {
      const item = byId.get(original.id)!;
      expect(item.alternativas, original.id).toHaveLength(original.alternativas.length);
      expect(item.correta, original.id).toBe(original.correta);
    }
  });

  it('never repeats the correct option among the distractors', () => {
    // Two identical options where one is marked correct would mark a right
    // answer wrong — the failure a careless translation produces first.
    for (const item of items) {
      if (item.correta === null || item.formato_alternativas !== 'texto') continue;
      const correct = item.alternativas[item.correta];
      expect(
        item.alternativas.filter((a) => a === correct),
        `${item.id} repeats its answer`,
      ).toHaveLength(1);
    }
  });

  it('translates every question and every piece of text a person reads', () => {
    for (const original of ITEMS) {
      const item = byId.get(original.id)!;
      expect(item.enunciado, `${original.id} enunciado`).not.toBe(original.enunciado);

      // A numeric series reads the same everywhere; only wording with letters
      // in it has anything to translate.
      if (original.formato_estimulo === 'texto' && hasLetters(original.estimulo ?? '')) {
        expect(item.estimulo, `${original.id} estimulo`).not.toBe(original.estimulo);
      }

      if (original.formato_alternativas === 'texto' && hasLetters(original.alternativas[0])) {
        expect(item.alternativas, `${original.id} alternativas`).not.toEqual(original.alternativas);
      }
    }
  });

  it('keeps the figures shared rather than copied per language', () => {
    for (const original of ITEMS) {
      const item = byId.get(original.id)!;
      if (original.formato_estimulo === 'svg') expect(item.estimulo).toBe(original.estimulo);
      if (original.formato_alternativas === 'svg') {
        expect(item.alternativas).toEqual(original.alternativas);
      }
    }
  });

  it('asks for the word it actually showed', () => {
    // The word-span items are the only ones whose stimulus is language, and a
    // recall that lists six English words after showing a Portuguese one is
    // unanswerable.
    for (const item of items.filter((i) => i.tipo === 'span_palavra')) {
      expect(item.memoria, item.id).toBeTruthy();
      expect(item.alternativas, `${item.id} does not offer the word it showed`).toContain(
        item.memoria!.estimulo,
      );
      expect(item.alternativas[item.correta!], item.id).toBe(item.memoria!.estimulo);
    }
  });

  it('still hides the answer key', () => {
    const payload = JSON.stringify(publicItems(locale));
    expect(payload).not.toContain('"correta"');
    expect(payload).not.toContain('"regra"');
  });
});

describe('unknown locales', () => {
  it('fall back to the language the bank is written in', () => {
    // Wrong language beats a blank question: it is still answerable.
    expect(itemsIn('fr').map((i) => i.enunciado)).toEqual(ITEMS.map((i) => i.enunciado));
  });
});
