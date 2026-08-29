import { describe, expect, it } from 'vitest';
import { ITEMS } from './bank';
import { interleaveByType } from './interleave';
import { answerableCount, buildRunOrder, type Step } from './memoryQueue';

/**
 * Two things can go wrong here and neither looks like a failure at runtime:
 * a stimulus shown but never asked about (the person memorises for nothing),
 * and the caller's ordering being quietly discarded.
 */

const steps = buildRunOrder(ITEMS);
const idsOf = (s: Step[], kind: Step['kind']) => s.filter((x) => x.kind === kind).map((x) => x.item.id);

describe('run order', () => {
  it('keeps every item, and every memory item twice', () => {
    const memory = ITEMS.filter((i) => i.dimensao === 'memoria_trabalho');
    const reasoning = ITEMS.length - memory.length;

    expect(steps.filter((s) => s.kind === 'question')).toHaveLength(reasoning);
    expect(steps.filter((s) => s.kind === 'memory-show')).toHaveLength(memory.length);
    expect(steps.filter((s) => s.kind === 'memory-recall')).toHaveLength(memory.length);
  });

  it('recalls every stimulus that was shown', () => {
    expect(idsOf(steps, 'memory-recall').sort()).toEqual(idsOf(steps, 'memory-show').sort());
  });

  it('asks for a digit span on the very next screen', () => {
    // Nothing between seeing it and being asked: that is the task.
    steps.forEach((step, i) => {
      if (step.kind !== 'memory-show' || step.item.tipo === 'span_palavra') return;
      expect(steps[i + 1]?.kind, `${step.item.id}`).toBe('memory-recall');
      expect(steps[i + 1]?.item.id).toBe(step.item.id);
    });
  });

  it('holds a word back for the gap the item asks for', () => {
    for (const step of steps) {
      if (step.kind !== 'memory-show' || step.item.tipo !== 'span_palavra') continue;

      const from = steps.indexOf(step);
      const to = steps.findIndex((s) => s.kind === 'memory-recall' && s.item.id === step.item.id);
      const between = steps.slice(from + 1, to).filter((s) => s.kind === 'question').length;

      // Capped at what is actually left: the second word asks for a gap
      // nothing can reach, which is how it ends up last.
      const questionsLeft = steps.slice(from + 1).filter((s) => s.kind === 'question').length;
      expect(between, `${step.item.id}`).toBe(
        Math.min(step.item.memoria!.gap_itens, questionsLeft),
      );
    }
  });

  it('asks the last word last', () => {
    // "We will ask about it during the test" is a promise the end keeps.
    expect(steps[steps.length - 1].kind).toBe('memory-recall');
    expect(steps[steps.length - 1].item.tipo).toBe('span_palavra');
  });

  it('preserves the order it is given', () => {
    // The regression this exists to catch: an internal sort here undid the
    // type interleaving, so the runner ran the grouped order anyway.
    const spread = interleaveByType(ITEMS);
    const fromSteps = buildRunOrder(spread)
      .filter((s) => s.kind !== 'memory-recall')
      .map((s) => s.item.id);

    expect(fromSteps).toEqual(spread.map((i) => i.id));
  });

  it('has one screen per answer plus one per stimulus', () => {
    expect(answerableCount(steps)).toBe(ITEMS.length);
    expect(steps).toHaveLength(
      ITEMS.length + ITEMS.filter((i) => i.dimensao === 'memoria_trabalho').length,
    );
  });
});
