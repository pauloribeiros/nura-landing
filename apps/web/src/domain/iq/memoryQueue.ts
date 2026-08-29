import type { Item } from './types';

/**
 * Builds the running order: one screen per item, two for a memory item.
 *
 * THE ORDER IT IS GIVEN IS THE ORDER IT KEEPS. This used to re-sort by
 * `ordem`, which silently undid the type interleaving done by the caller —
 * items arrived spread out and left grouped again. Sorting belongs to whoever
 * decides the sequence, not to the step builder.
 *
 * DIGITS ARE RECALLED IMMEDIATELY, WORDS ARE NOT. A digit span asks how much
 * you can hold at once, and questions in between turned it into an unrelated
 * question about a number nobody remembered seeing. A word is the opposite:
 * "we will ask about this later" is the task, and asking on the next screen
 * measures nothing but reading. So a word waits `gap_itens` reasoning
 * questions — twenty for the first, which puts it a third of the way in, and
 * a number nothing can reach for the second, which lands it at the very end.
 *
 * Interference is counted in REASONING questions only. A memory stimulus is
 * not interference: counting one would let a recall land between another
 * stimulus and its own recall, which makes the person hold two things at once
 * — a dual task, harder than either item was calibrated for.
 */

export type Step =
  | { kind: 'question'; item: Item }
  | { kind: 'memory-show'; item: Item }
  | { kind: 'memory-recall'; item: Item };

/** Held over from a stimulus until enough questions have gone by. */
interface Pending {
  item: Item;
  remaining: number;
}

const isDeferred = (item: Item) => item.tipo === 'span_palavra';

export function buildRunOrder(items: Item[]): Step[] {
  const steps: Step[] = [];
  const pending: Pending[] = [];

  const placeReady = () => {
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      if (pending[i].remaining <= 0) {
        steps.push({ kind: 'memory-recall', item: pending[i].item });
        pending.splice(i, 1);
      }
    }
  };

  for (const item of items) {
    if (item.dimensao === 'memoria_trabalho' && item.memoria) {
      steps.push({ kind: 'memory-show', item });

      if (isDeferred(item)) pending.push({ item, remaining: Math.max(1, item.memoria.gap_itens) });
      else steps.push({ kind: 'memory-recall', item });

      continue;
    }

    steps.push({ kind: 'question', item });
    for (const p of pending) p.remaining -= 1;
    placeReady();
  }

  // Whatever is still waiting when the questions run out is asked at the end,
  // in the order it was shown. Dropping it would lose an item silently — and
  // for the second word, the end is exactly where it belongs.
  for (const p of pending) steps.push({ kind: 'memory-recall', item: p.item });

  return steps;
}

/** How many screens the run has, for the progress indicator. */
export const stepCount = (steps: Step[]) => steps.length;

/** Screens that count as an answered item — a shown stimulus is not answered. */
export const answerableCount = (steps: Step[]) =>
  steps.filter((s) => s.kind !== 'memory-show').length;
