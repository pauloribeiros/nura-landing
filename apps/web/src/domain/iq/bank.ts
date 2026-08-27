import raw from './data/bank.json';
import type { Dimensao, Item } from './types';

/**
 * The item bank.
 *
 * Loaded from JSON rather than written as TypeScript so the generator that
 * produced it stays the source of truth. `regra` is calibration documentation
 * and must never reach a screen — it says what the item measures, which is the
 * answer.
 *
 * The bank is 135 KB, most of it SVG. It is imported by a SERVER component and
 * handed to the client as props, so it travels once in the page payload rather
 * than sitting in the JavaScript bundle of every visitor who never opens the
 * test.
 */

export const ITEMS: Item[] = (raw as Item[]).slice().sort((a, b) => a.ordem - b.ordem);

export const DIMENSOES: Dimensao[] = [
  'reconhecimento_padroes',
  'pensamento_analitico',
  'raciocinio_abstrato',
  'orientacao_espacial',
  'percepcao_visual',
  'memoria_trabalho',
];

export const byId = (id: string) => ITEMS.find((i) => i.id === id);

export const itemsOf = (dimensao: Dimensao) => ITEMS.filter((i) => i.dimensao === dimensao);

/**
 * What the runner needs, and nothing that answers it.
 *
 * Two fields are stripped rather than merely not rendered:
 *
 *  - `correta` is the answer key. In the browser it sits in the page source,
 *    one devtools panel away from every question.
 *  - `regra` says what rule the item tests, which for most items IS the answer.
 *
 * The consequence is that scoring cannot happen in the browser, and that is
 * the right trade for a test whose result unlocks something paid: the answers
 * are submitted and the server decides, exactly as the ADHD assessment does.
 * The cost is one round trip at the end of a test that already takes minutes.
 */
export type PublicItem = Omit<Item, 'regra' | 'correta'>;

export const publicItems = (): PublicItem[] =>
  ITEMS.map(({ regra: _regra, correta: _correta, ...rest }) => rest);
