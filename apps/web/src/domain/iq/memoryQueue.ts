import type { Item } from './types';

/**
 * Builds the running order: one screen per item, two for a memory item.
 *
 * THE ORDER IT IS GIVEN IS THE ORDER IT KEEPS. This used to re-sort by
 * `ordem`, which silently undid the type interleaving done by the caller —
 * the items arrived spread out and left grouped again. Sorting belongs to
 * whoever decides the sequence, not to the step builder.
 *
 * RECALL COMES IMMEDIATELY AFTER THE STIMULUS. It did not: interference
 * questions used to sit in between, per `gap_itens` in the bank, because that
 * is what makes a span task measure working memory rather than reading. In
 * testing it did not survive contact with a person — the recall arrived so far
 * from the stimulus that it read as an unrelated question, and one word recall
 * was missed entirely. A question nobody connects to what they saw measures
 * nothing at all, so the delay bought less than it cost.
 *
 * What that costs, stated plainly: the forward spans now measure immediate
 * span — how much is held at once — rather than how much survives
 * interference. MEM-07, which asks for the digits backwards, still requires
 * holding and manipulating, which is working memory under any definition.
 * `gap_itens` in the bank is no longer read by anything.
 */

export type Step =
  | { kind: 'question'; item: Item }
  | { kind: 'memory-show'; item: Item }
  | { kind: 'memory-recall'; item: Item };

export function buildRunOrder(items: Item[]): Step[] {
  const steps: Step[] = [];

  for (const item of items) {
    if (item.dimensao === 'memoria_trabalho' && item.memoria) {
      steps.push({ kind: 'memory-show', item });
      steps.push({ kind: 'memory-recall', item });
      continue;
    }

    steps.push({ kind: 'question', item });
  }

  return steps;
}

/** How many screens the run has, for the progress indicator. */
export const stepCount = (steps: Step[]) => steps.length;

/** Screens that count as an answered item — a shown stimulus is not answered. */
export const answerableCount = (steps: Step[]) =>
  steps.filter((s) => s.kind !== 'memory-show').length;
