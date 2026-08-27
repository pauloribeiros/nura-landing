import { describe, expect, it } from 'vitest';
import { ASRS_WORDING, asrs18, asrs18Locales } from './instruments/asrs18';

/**
 * A draft translation of a clinical instrument must never reach a person.
 *
 * The risk this guards is quiet: someone adds a locale to be helpful, the site
 * offers the test in it, and the answers are scored against thresholds
 * validated for wording that is not what the person read. Nothing crashes. The
 * result is simply wrong, for everyone in that language.
 */

describe('instrument wording', () => {
  it('offers only locales whose text is the published one', () => {
    for (const locale of asrs18Locales) {
      expect(ASRS_WORDING[locale].wording).toBe('published');
    }
  });

  it('keeps drafts out of the offered list', () => {
    const drafts = Object.entries(ASRS_WORDING)
      .filter(([, w]) => w.wording === 'draft')
      .map(([locale]) => locale);

    for (const locale of drafts) {
      expect(asrs18Locales).not.toContain(locale);
    }
  });

  it('says where every text came from', () => {
    for (const [locale, w] of Object.entries(ASRS_WORDING)) {
      expect(w.source, `${locale} has no source`).toBeTruthy();
      expect(w.source.length).toBeGreaterThan(10);
    }
  });

  it('has one prompt per item in every locale, drafts included', () => {
    // A locale missing an item would render a blank question rather than fail,
    // which is the kind of gap that ships.
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
    }
  });

  it('never leaves the instrument with no offered locale', () => {
    // Marking every locale a draft would silently take the product offline.
    expect(asrs18Locales.length).toBeGreaterThan(0);
  });
});
