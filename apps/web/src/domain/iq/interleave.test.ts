import { describe, expect, it } from 'vitest';
import { ITEMS } from './bank';
import { consecutiveRepeats, interleaveByType } from './interleave';

/**
 * Two properties have to hold at once, and they pull against each other:
 * the same kind of puzzle must not run in a row, and the test must still get
 * harder as it goes. Either alone is easy; this pins both.
 */

const original = ITEMS.slice().sort((a, b) => a.ordem - b.ordem);
const spread = interleaveByType(ITEMS);

describe('interleaving', () => {
  it('keeps every item exactly once', () => {
    expect(spread).toHaveLength(original.length);
    expect(new Set(spread.map((i) => i.id)).size).toBe(original.length);
  });

  it('never lets difficulty go backwards', () => {
    // The constraint that makes moving items around safe at all.
    for (let i = 1; i < spread.length; i += 1) {
      expect(spread[i].dificuldade).toBeGreaterThanOrEqual(spread[i - 1].dificuldade);
    }
  });

  it('breaks up runs of the same puzzle type', () => {
    const before = consecutiveRepeats(original);
    const after = consecutiveRepeats(spread);
    expect(after).toBeLessThan(before);
  });

  it('leaves no long run of one type in the opening third', () => {
    // Where the complaint came from: four odd-one-out screens in a row read as
    // one question asked four times.
    const opening = spread.slice(0, 15);
    let run = 1;
    let worst = 1;
    for (let i = 1; i < opening.length; i += 1) {
      run = opening[i].tipo === opening[i - 1].tipo ? run + 1 : 1;
      worst = Math.max(worst, run);
    }
    expect(worst).toBeLessThanOrEqual(2);
  });

  it('is deterministic', () => {
    // Two runs of the same test must be comparable, which a shuffle would end.
    expect(interleaveByType(ITEMS).map((i) => i.id)).toEqual(spread.map((i) => i.id));
  });

  it('survives a band that holds only one type', () => {
    const single = ITEMS.filter((i) => i.tipo === ITEMS[0].tipo);
    expect(interleaveByType(single)).toHaveLength(single.length);
  });
});
