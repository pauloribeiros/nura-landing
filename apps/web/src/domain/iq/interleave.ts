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
  /**
   * Alguns itens declaram onde querem estar e saem da distribuicao por banda.
   *
   * A REGRA GERAL CONTINUA VALENDO PARA TODO O RESTO: a banda decide a ordem, e
   * e isso que mantem a rampa de dificuldade. O que este bloco abre e uma
   * excecao nomeada, para o caso em que a presenca do item cedo E o ponto — um
   * formato inedito precisa aparecer enquanto a pessoa ainda esta decidindo se
   * o teste e serio, e no fim da fila ele nao cumpre esse papel para ninguem.
   * Sem isto, a unica forma de adiantar um item seria baixar a `dificuldade`
   * dele, o que mudaria junto o peso na pontuacao — mentir sobre quanto vale
   * para consertar onde aparece.
   */
  const fixos = items
    .filter((i) => typeof i.posicaoFixa === 'number')
    .sort((a, b) => a.posicaoFixa! - b.posicaoFixa!);
  const distribuiveis = fixos.length > 0 ? items.filter((i) => typeof i.posicaoFixa !== 'number') : items;

  const byDifficulty = new Map<number, Item[]>();
  for (const item of distribuiveis.slice().sort((a, b) => a.ordem - b.ordem)) {
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

  // Inseridos depois, em ordem crescente, para que uma posicao nao empurre a
  // seguinte: com duas fixas em 3 e 5, a segunda ja conta com a primeira no
  // lugar. Fora do intervalo, entra na ponta mais proxima em vez de sumir.
  for (const item of fixos) {
    const alvo = Math.min(Math.max(0, item.posicaoFixa! - 1), out.length);
    out.splice(alvo, 0, item);
  }

  return out;
}

/** How many places in a list are preceded by an item of the same type. */
export function consecutiveRepeats(items: Item[]): number {
  return items.filter((item, i) => i > 0 && items[i - 1].tipo === item.tipo).length;
}
