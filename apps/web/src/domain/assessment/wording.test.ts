import { describe, expect, it } from 'vitest';
import { ASRS_WORDING, asrs18, asrs18Locales, asrs18UnofficialLocales } from './instruments/asrs18';

/**
 * The instrument's text, in every language it is offered in.
 *
 * The risk here is quiet rather than loud: a missing item renders a blank
 * question instead of failing, and answers get scored against thresholds
 * calibrated for wording the person never read. Nothing crashes — the result
 * is simply wrong, for everyone in that language.
 */

describe('instrument wording', () => {
  it('records where every text came from', () => {
    for (const [locale, w] of Object.entries(ASRS_WORDING)) {
      expect(w.source, `${locale} has no source`).toBeTruthy();
      expect(w.source.length).toBeGreaterThan(10);
    }
  });

  it('has one prompt per item in every locale', () => {
    for (const [locale, w] of Object.entries(ASRS_WORDING)) {
      for (const q of asrs18.questions) {
        expect(w.prompts[q.id], `${locale} is missing ${q.id}`).toBeTruthy();
      }
      expect(Object.keys(w.prompts)).toHaveLength(asrs18.questions.length);
    }
  });

  it('labels every choice in every locale', () => {
    const choiceIds = asrs18.scales[0].choices.map((c) => c.id);
    for (const [locale, w] of Object.entries(ASRS_WORDING)) {
      for (const id of choiceIds) {
        expect(w.choiceLabels[id], `${locale} is missing choice ${id}`).toBeTruthy();
      }
      expect(Object.keys(w.choiceLabels)).toHaveLength(choiceIds.length);
    }
  });

  it('offers every locale it has text for', () => {
    expect(asrs18Locales.sort()).toEqual(Object.keys(ASRS_WORDING).sort());
  });

  it('keeps the locales the app itself supports', () => {
    for (const locale of ['pt-br', 'en', 'es']) {
      expect(asrs18Locales).toContain(locale);
    }
  });

  it('surfaces which texts are not yet the published document', () => {
    // Not a failure — a list. Portuguese was transcribed from a PDF text layer
    // and has never been checked line by line, so it stays flagged until it is.
    expect(Array.isArray(asrs18UnofficialLocales)).toBe(true);
    for (const locale of asrs18UnofficialLocales) {
      expect(ASRS_WORDING[locale].official).toBe(false);
    }
  });

  it('never leaves the instrument with no locale at all', () => {
    expect(asrs18Locales.length).toBeGreaterThan(0);
  });
});
