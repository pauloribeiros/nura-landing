import { describe, expect, it } from 'vitest';
import { DIMENSOES, ITEMS, publicItems } from './bank';

/**
 * What the bank must hold for the runner to be safe to write.
 *
 * Two of these are load-bearing elsewhere. `Stimulus` injects SVG as markup
 * and says the trust rests on a test rather than on the data being ours —
 * this is that test. And `publicItems` claims the answer key never reaches
 * the browser, which is only true while nothing puts it back.
 */

describe('item bank', () => {
  it('has 45 items in an unbroken order', () => {
    expect(ITEMS).toHaveLength(45);
    expect(ITEMS.map((i) => i.ordem)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
  });

  it('has unique ids', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });

  it('covers all six dimensions', () => {
    for (const d of DIMENSOES) {
      expect(ITEMS.filter((i) => i.dimensao === d).length).toBeGreaterThan(0);
    }
    expect(new Set(ITEMS.map((i) => i.dimensao))).toEqual(new Set(DIMENSOES));
  });

  it('gets harder as it goes', () => {
    const mean = (from: number, to: number) => {
      const slice = ITEMS.filter((i) => i.ordem >= from && i.ordem <= to);
      return slice.reduce((s, i) => s + i.dificuldade, 0) / slice.length;
    };
    expect(mean(16, 30)).toBeGreaterThan(mean(1, 15));
    expect(mean(31, 45)).toBeGreaterThan(mean(16, 30));
  });

  describe('answerability', () => {
    it('points at an option that exists, or asks for free entry', () => {
      for (const item of ITEMS) {
        if (item.formato_alternativas === 'entrada_livre') {
          expect(item.correta, `${item.id}`).toBeNull();
          expect(item.alternativas, `${item.id}`).toHaveLength(0);
          expect(item.memoria, `${item.id} needs a stimulus to compare against`).toBeTruthy();
          continue;
        }
        expect(item.correta, `${item.id}`).not.toBeNull();
        expect(item.correta!).toBeGreaterThanOrEqual(0);
        expect(item.correta!).toBeLessThan(item.alternativas.length);
        expect(item.alternativas.length, `${item.id}`).toBeGreaterThanOrEqual(2);
      }
    });

    it('never repeats the correct option among the distractors', () => {
      // Two identical options where one is marked correct would mark a right
      // answer wrong. Note this is NOT the same as distractors repeating each
      // other, which odd-one-out items do by design.
      for (const item of ITEMS) {
        if (item.correta === null) continue;
        const correct = item.alternativas[item.correta];
        expect(
          item.alternativas.filter((a) => a === correct),
          `${item.id} has the correct option more than once`,
        ).toHaveLength(1);
      }
    });
  });

  describe('no item is another item twice', () => {
    it('never repeats a stimulus with the same answer', () => {
      // What this caught: ABS-04, ABS-06 and ABS-08 shipped the same matrix
      // with the same correct figure, and ABS-03/ABS-07 likewise — only the
      // option order differed. Someone solved it once and collected the
      // difficulty-5 weight three times for free.
      const seen = new Map<string, string>();

      for (const item of ITEMS) {
        if (item.correta === null || !item.estimulo) continue;
        const fingerprint = `${item.estimulo}##${item.alternativas[item.correta]}`;
        const first = seen.get(fingerprint);
        expect(first, `${item.id} is ${first} again`).toBeUndefined();
        seen.set(fingerprint, item.id);
      }
    });

    it('never repeats a question with the same options', () => {
      const seen = new Map<string, string>();

      for (const item of ITEMS) {
        if (item.formato_alternativas === 'entrada_livre') continue;
        const fingerprint = `${item.enunciado}##${item.estimulo ?? ''}##${item.alternativas.join('|')}`;
        const first = seen.get(fingerprint);
        expect(first, `${item.id} is ${first} again`).toBeUndefined();
        seen.set(fingerprint, item.id);
      }
    });
  });

  describe('the opening', () => {
    it('does not spend the first ten screens on the easiest band', () => {
      // The first minutes decide whether someone believes the test measures
      // anything. Four-times-table sequences and doctor→hospital analogies
      // read as a warm-up for a toy, and that impression does not come back.
      const opening = ITEMS.slice(0, 10);
      const trivial = opening.filter((i) => i.dificuldade === 1);
      expect(trivial.length, 'too many difficulty-1 items in the opening').toBeLessThanOrEqual(4);
    });

    it('still opens with something answerable', () => {
      // The other failure: a wall on screen one. At least one gentle item has
      // to be in reach early.
      expect(ITEMS.slice(0, 6).some((i) => i.dificuldade === 1)).toBe(true);
    });
  });

  describe('memory items', () => {
    const memory = ITEMS.filter((i) => i.dimensao === 'memoria_trabalho');

    it('all carry a spec', () => {
      for (const item of memory) {
        expect(item.memoria, `${item.id}`).toBeTruthy();
        expect(item.memoria!.estimulo.trim().length).toBeGreaterThan(0);
        expect(item.memoria!.exibir_ms).toBeGreaterThanOrEqual(1000);
      }
    });

    it('asks for a position the stimulus actually has', () => {
      for (const item of memory) {
        const m = item.memoria!;
        if (m.cobrar !== 'posicional') continue;
        const digits = m.estimulo.replace(/\s+/g, '').length;
        expect(m.posicao, `${item.id}`).toBeDefined();
        expect(m.posicao!).toBeGreaterThanOrEqual(1);
        expect(m.posicao!).toBeLessThanOrEqual(digits);
      }
    });

    it('is the only dimension with a spec', () => {
      for (const item of ITEMS.filter((i) => i.dimensao !== 'memoria_trabalho')) {
        expect(item.memoria, `${item.id}`).toBeUndefined();
      }
    });
  });

  describe('figures', () => {
    const svgs = ITEMS.flatMap((i) => [
      ...(i.formato_estimulo === 'svg' && i.estimulo ? [[`${i.id}/stimulus`, i.estimulo] as const] : []),
      ...(i.formato_alternativas === 'svg'
        ? i.alternativas.map((a, k) => [`${i.id}/option-${k}`, a] as const)
        : []),
    ]);

    it('are all well-formed svg with a viewBox', () => {
      expect(svgs.length).toBeGreaterThan(0);
      for (const [where, svg] of svgs) {
        expect(svg.trim().startsWith('<svg'), where).toBe(true);
        expect(/viewBox=/.test(svg), where).toBe(true);
      }
    });

    it('carry nothing executable and reach nothing outside', () => {
      // This is what lets Stimulus and OptionGrid inject them as markup.
      const dangerous = /<script|\son\w+\s*=|javascript:|<foreignObject|<image|href\s*=\s*["']?https?:/i;
      for (const [where, svg] of svgs) {
        expect(dangerous.test(svg), `${where} carries something executable or external`).toBe(false);
      }
    });
  });

  describe('what reaches the browser', () => {
    it('carries no answer key and no calibration note', () => {
      for (const item of publicItems()) {
        expect(item, item.id).not.toHaveProperty('correta');
        expect(item, item.id).not.toHaveProperty('regra');
      }
      // Belt and braces: the serialised payload must not contain the field
      // names either, in case a nested object ever carries them.
      const payload = JSON.stringify(publicItems());
      expect(payload).not.toContain('"correta"');
      expect(payload).not.toContain('"regra"');
    });

    it('still carries everything the runner needs to render', () => {
      for (const item of publicItems()) {
        expect(item.enunciado.trim().length, item.id).toBeGreaterThan(0);
        expect(item.formato_alternativas, item.id).toBeTruthy();
        if (item.formato_alternativas !== 'entrada_livre') {
          expect(item.alternativas.length, item.id).toBeGreaterThan(1);
        }
      }
    });
  });
});
