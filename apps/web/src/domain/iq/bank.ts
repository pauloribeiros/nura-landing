import raw from './data/bank.json';
import textEn from './data/text.en.json';
import textEs from './data/text.es.json';
import type { Dimensao, Item } from './types';
import { ITENS_INTERATIVOS } from './itensInterativos';

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

/**
 * Os itens interativos entram no banco como qualquer outro.
 *
 * A ALTERNATIVA SERIA UM CAMINHO PARALELO, e ela custaria caro: ordem,
 * traducao, pontuacao e contagem de progresso teriam que aprender que existe
 * um segundo tipo de item, cada uma a seu modo. Entrando aqui, eles herdam
 * tudo isso — o que muda e so quem desenha a pergunta.
 *
 * Sem alternativas e sem indice de correta: nao ha o que marcar. `correta`
 * fica null e quem decide acerto e a regra do dominio, a partir do que a
 * pessoa desenhou.
 */
const INTERATIVOS: Item[] = ITENS_INTERATIVOS.map((item) => ({
  id: item.id,
  ordem: item.ordem,
  dimensao: item.dimensao,
  tipo: item.tipo,
  dificuldade: item.dificuldade,
  enunciado: item.enunciado,
  estimulo: null,
  formato_estimulo: 'none',
  alternativas: [],
  formato_alternativas: 'interativo',
  correta: null,
  interativo: item.config,
  regra: item.regra,
}));

export const ITEMS: Item[] = [...(raw as Item[]), ...INTERATIVOS]
  .slice()
  .sort((a, b) => a.ordem - b.ordem);

export const DIMENSOES: Dimensao[] = [
  'reconhecimento_padroes',
  'pensamento_analitico',
  'raciocinio_abstrato',
  'orientacao_espacial',
  'percepcao_visual',
  'memoria_trabalho',
];

/**
 * The wording of an item in a language other than the one the bank is written
 * in. Figures are never in here: an SVG of a rotated cube is the same question
 * everywhere, and duplicating 135 KB of markup per locale to change nothing
 * would be absurd.
 *
 * ORDER IS THE CONTRACT. `correta` is an index into `alternativas`, so a
 * translation that reorders the options silently marks the wrong answer right.
 * `bank.i18n.test.ts` pins the length and the pt-br position of the key.
 */
interface ItemText {
  enunciado?: string;
  estimulo?: string;
  alternativas?: string[];
  /** Only for the word-span items: the word itself has to be in the language. */
  memoria?: string;
}

const TEXT: Record<string, Record<string, ItemText>> = {
  en: textEn as Record<string, ItemText>,
  es: textEs as Record<string, ItemText>,
};

/** The locales whose item wording exists. Everything else falls back to pt-br. */
export const bankLocales = ['pt-br', ...Object.keys(TEXT)];

/**
 * The bank as read in `locale`.
 *
 * Falls back item by item rather than all or nothing: a missing entry shows
 * the Portuguese wording, which is wrong but answerable, where a crash or a
 * blank question is neither.
 */
export function itemsIn(locale: string): Item[] {
  const table = TEXT[locale];
  if (!table) return ITEMS;

  return ITEMS.map((item) => {
    const text = table[item.id];
    if (!text) return item;

    return {
      ...item,
      enunciado: text.enunciado ?? item.enunciado,
      estimulo: text.estimulo ?? item.estimulo,
      alternativas: text.alternativas ?? item.alternativas,
      memoria:
        item.memoria && text.memoria
          ? { ...item.memoria, estimulo: text.memoria }
          : item.memoria,
    };
  });
}

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

export const publicItems = (locale = 'pt-br'): PublicItem[] =>
  itemsIn(locale).map(({ regra: _regra, correta: _correta, ...rest }) => rest);
