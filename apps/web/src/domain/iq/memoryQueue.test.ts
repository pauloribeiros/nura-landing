import { describe, expect, it } from 'vitest';
import { ITEMS } from './bank';
import { answerableCount, buildRunOrder, type Step } from './memoryQueue';

/**
 * The run order is where a working-memory item stops being a memory item.
 *
 * If a recall lands next to its own stimulus, the answer is still on screen a
 * second ago and the item measures reading, not memory. If interference is
 * itself a memory stimulus, the person holds two spans at once and the item
 * measures something harder than it was calibrated for. Neither failure looks
 * like a failure — the test runs, the score comes out, and it means less than
 * it claims.
 */

const steps = buildRunOrder(ITEMS);
const at = (s: Step) => `${s.kind}:${s.item.id}`;

describe('run order', () => {
  it('keeps every item, and every memory item twice', () => {
    const memory = ITEMS.filter((i) => i.dimensao === 'memoria_trabalho');
    const reasoning = ITEMS.length - memory.length;

    expect(steps.filter((s) => s.kind === 'question')).toHaveLength(reasoning);
    expect(steps.filter((s) => s.kind === 'memory-show')).toHaveLength(memory.length);
    expect(steps.filter((s) => s.kind === 'memory-recall')).toHaveLength(memory.length);
  });

  it('recalls every stimulus that was shown', () => {
    const shown = steps.filter((s) => s.kind === 'memory-show').map((s) => s.item.id);
    const recalled = steps.filter((s) => s.kind === 'memory-recall').map((s) => s.item.id);
    expect(recalled.sort()).toEqual(shown.sort());
  });

  it('never recalls before showing', () => {
    for (const id of steps.filter((s) => s.kind === 'memory-show').map((s) => s.item.id)) {
      const shownAt = steps.findIndex((s) => s.kind === 'memory-show' && s.item.id === id);
      const recalledAt = steps.findIndex((s) => s.kind === 'memory-recall' && s.item.id === id);
      expect(recalledAt).toBeGreaterThan(shownAt);
    }
  });

  it('puts at least one reasoning question between a stimulus and its recall', () => {
    for (const id of steps.filter((s) => s.kind === 'memory-show').map((s) => s.item.id)) {
      const from = steps.findIndex((s) => s.kind === 'memory-show' && s.item.id === id);
      const to = steps.findIndex((s) => s.kind === 'memory-recall' && s.item.id === id);
      const between = steps.slice(from + 1, to).filter((s) => s.kind === 'question');

      expect(between.length, `${id} has no interference`).toBeGreaterThanOrEqual(1);
    }
  });

  it('counts only reasoning questions as interference', () => {
    // The collision in the delivered bank: MEM-02 at ordem 10 with gap 1, and
    // MEM-04 at ordem 11. If a stimulus counted, MEM-02 would be recalled with
    // nothing but another stimulus in between.
    for (const id of steps.filter((s) => s.kind === 'memory-show').map((s) => s.item.id)) {
      const from = steps.findIndex((s) => s.kind === 'memory-show' && s.item.id === id);
      const to = steps.findIndex((s) => s.kind === 'memory-recall' && s.item.id === id);
      const item = ITEMS.find((i) => i.id === id)!;
      const reasoning = steps.slice(from + 1, to).filter((s) => s.kind === 'question').length;

      expect(reasoning, `${id} wanted ${item.memoria?.gap_itens} reasoning items`)
        .toBeGreaterThanOrEqual(Math.max(1, item.memoria?.gap_itens ?? 1));
    }
  });

  it('never places two recalls with nothing between them for the same person to confuse', () => {
    // Two recalls back to back is legal but reads as one question with two
    // answers; this pins the current behaviour so a change is deliberate.
    const backToBack = steps.filter(
      (s, i) => s.kind === 'memory-recall' && steps[i - 1]?.kind === 'memory-recall',
    );
    expect(backToBack.map(at)).toEqual([]);
  });

  it('has one screen per answer plus one per stimulus', () => {
    expect(answerableCount(steps)).toBe(ITEMS.length);
    expect(steps).toHaveLength(ITEMS.length + ITEMS.filter((i) => i.dimensao === 'memoria_trabalho').length);
  });
});
