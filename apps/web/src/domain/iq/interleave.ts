import type { Item } from './types';

/**
 * Spreads item types out so the same kind of puzzle never runs in a row.
 *
 * The bank is ordered by difficulty, which groups items of a kind together —
 * the four odd-one-out items sit at positions 2, 4, 6, 8, and four screens of
 * "five identical shapes, find the different one" reads as one question asked
 * four times. The person learns nothing new from the third, and the test feels
 * cheaper than it is.
 *
 * Difficulty order is preserved, and that constraint is what makes this safe:
 * items only move within their own difficulty band, so a level-1 item never
 * jumps ahead of a level-3 one. What changes is which KIND comes next, not
 * how hard it is.
 *
 * Deterministic. Two people with the same bank see the same order — a shuffled
 * test would make two runs incomparable, and comparing runs is the entire
 * point of eventually having a norm.
 */
export function interleaveByType(items: Item[]): Item[] {
  const byDifficulty = new Map<number, Item[]>();
  for (const item of items.slice().sort((a, b) => a.ordem - b.ordem)) {
    const band = byDifficulty.get(item.dificuldade) ?? [];
    band.push(item);
    byDifficulty.set(item.dificuldade, band);
  }

  const out: Item[] = [];

  for (const difficulty of [...byDifficulty.keys()].sort((a, b) => a - b)) {
    const remaining = byDifficulty.get(difficulty)!.slice();

    while (remaining.length > 0) {
      // Prefer an item whose type differs from the one just placed. Falling
      // back to the first is what makes this total: a band of a single type
      // still gets emitted, in order, rather than looping forever.
      const lastType = out[out.length - 1]?.tipo;
      const index = remaining.findIndex((i) => i.tipo !== lastType);
      const pick = index === -1 ? 0 : index;

      out.push(remaining[pick]);
      remaining.splice(pick, 1);
    }
  }

  return out;
}

/** How many places in a list are preceded by an item of the same type. */
export function consecutiveRepeats(items: Item[]): number {
  return items.filter((item, i) => i > 0 && items[i - 1].tipo === item.tipo).length;
}
