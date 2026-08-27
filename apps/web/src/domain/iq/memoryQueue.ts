import type { Item } from './types';

/**
 * Builds the running order, with each memory recall placed after interference.
 *
 * A working-memory item is two screens, not one: the stimulus is shown and
 * hidden, other questions pass, and only then is it recalled. Without the
 * questions in between there is no memory to test — the answer would still be
 * on screen a second ago.
 *
 * THE COLLISION THIS EXISTS TO PREVENT. In the bank as delivered, MEM-02 sits
 * at ordem 10 with a gap of 1, and MEM-04 sits at ordem 11. Taken literally,
 * the interference between one stimulus and its recall is ANOTHER stimulus —
 * so the person holds two spans at once. That is a dual task: much harder than
 * either item was calibrated for, and it measures something else. Same shape
 * at MEM-05 (ordem 31) and MEM-06 (ordem 32).
 *
 * So interference is counted in REASONING items only. A memory stimulus never
 * counts towards another item's gap, and a recall is pushed further down the
 * list rather than landing on one.
 */

export type Step =
  | { kind: 'question'; item: Item }
  | { kind: 'memory-show'; item: Item }
  | { kind: 'memory-recall'; item: Item };

export function buildRunOrder(items: Item[]): Step[] {
  const ordered = items.slice().sort((a, b) => a.ordem - b.ordem);

  const steps: Step[] = [];
  // Recalls waiting for their interference to elapse, with how many reasoning
  // questions still have to pass.
  const pending: { item: Item; remaining: number }[] = [];

  const placeReady = () => {
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      if (pending[i].remaining <= 0) {
        steps.push({ kind: 'memory-recall', item: pending[i].item });
        pending.splice(i, 1);
      }
    }
  };

  for (const item of ordered) {
    if (item.dimensao === 'memoria_trabalho' && item.memoria) {
      // A stimulus is not interference — it does not decrement anything.
      steps.push({ kind: 'memory-show', item });
      pending.push({ item, remaining: Math.max(1, item.memoria.gap_itens) });
      continue;
    }

    steps.push({ kind: 'question', item });
    for (const p of pending) p.remaining -= 1;
    placeReady();
  }

  // Anything still waiting when the reasoning items run out is recalled at the
  // end, in the order it was shown. Dropping it would silently lose an item.
  for (const p of pending) steps.push({ kind: 'memory-recall', item: p.item });

  return steps;
}

/** How many screens the run has, for the progress indicator. */
export const stepCount = (steps: Step[]) => steps.length;

/** Screens that count as an answered item — a shown stimulus is not answered. */
export const answerableCount = (steps: Step[]) =>
  steps.filter((s) => s.kind !== 'memory-show').length;
