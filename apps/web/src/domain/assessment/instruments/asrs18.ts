import type { AssessmentDefinition } from '../types';

/**
 * ASRS-v1.1 / ASRS-18 — Adult ADHD Self-Report Scale.
 *
 * Copyright World Health Organization, developed with Harvard Medical School
 * (Kessler, Adler, Spencer et al.). Free to use, including commercially, with
 * attribution; no modification other than producing an electronic version is
 * permitted. That restriction is why the prompts below are reproduced rather
 * than rewritten, and why locales without an officially validated translation
 * get no items at all instead of one we made up.
 *
 * Portuguese items come from the Brazilian adaptation (Mattos et al.), as
 * distributed by ABDA.
 *
 * ---------------------------------------------------------------------------
 * Part A thresholds were read from the shading in the published tables. They
 * are NOT uniform, which is the detail most implementations get wrong: items
 * 1-3 count from "De vez em quando", items 4-6 only from "Quase sempre". A
 * single cutoff across all six produces a different result from the scale.
 *
 * Part B is recorded as flagged items, never as a score. The instrument states
 * it has no minimum score, and it must not move the Part A result — so it can
 * only say which symptoms were answered in a clinically relevant range.
 *
 * OPEN QUESTION — q4. The shading table supplied for this edition marks q4 from
 * "Quase nunca" (value 1), which is what is encoded. The widely published
 * ASRS-v1.1 marks q4 from "Quase sempre" (value 3), like q5 and q6. The
 * difference is not cosmetic: at value 1 almost any answer other than "Nunca"
 * counts, which raises the positive count and therefore the share of people
 * told to seek assessment. Confirm against the source before launch; changing
 * it is a one-line edit plus a scoringVersion bump.
 *
 * Also still to confirm: the prompts were transcribed from a PDF text layer.
 * ---------------------------------------------------------------------------
 */

const SCALE_ID = 'asrs-frequency';

/** Part A carries the screening validity; Part B is descriptive detail. */
const PART_A = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;
const PART_B = ['q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18'] as const;

/** DSM-IV-TR symptom domains, used for the Part B subscales. */
const INATTENTION = ['q1', 'q2', 'q3', 'q4', 'q7', 'q8', 'q9', 'q10', 'q11'];
const HYPERACTIVITY = ['q5', 'q6', 'q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18'];

export const asrs18: AssessmentDefinition = {
  assessmentId: 'attention',
  version: 'asrs-v1.1',
  scoringVersion: 'partA-2026-08',

  provenance: {
    instrument: 'ASRS-v1.1 (Adult ADHD Self-Report Scale), 18 items',
    authors: 'World Health Organization with Harvard Medical School',
    licence: 'Free use including commercial, attribution required, no modification',
    validatedFor: 'Adults 18+. Brazilian Portuguese adaptation by Mattos et al.',
  },

  scales: [
    {
      id: SCALE_ID,
      choices: [
        { id: 'never', value: 0 },
        { id: 'rarely', value: 1 },
        { id: 'sometimes', value: 2 },
        { id: 'often', value: 3 },
        { id: 'very-often', value: 4 },
      ],
    },
  ],

  questions: [
    ...PART_A.map((id) => ({ id, type: 'likert' as const, block: 'partA', scaleId: SCALE_ID })),
    ...PART_B.map((id) => ({ id, type: 'likert' as const, block: 'partB', scaleId: SCALE_ID })),
  ],

  rules: [
    {
      kind: 'threshold-count',
      id: 'partA-screen',
      questionIds: [...PART_A],
      // Shading rules supplied for this edition of the instrument. They are
      // NOT uniform, and q4 is the outlier: it counts from "Quase nunca",
      // while q1-q3 count from "De vez em quando" and q5-q6 only from
      // "Quase sempre". See the header note about q4.
      positiveAt: { q1: 2, q2: 2, q3: 2, q4: 1, q5: 3, q6: 3 },
      cutoff: 4,
      bands: [
        { from: 0, to: 3, key: 'notElevated' },
        { from: 4, to: 6, key: 'highlyConsistent' },
      ],
    },
    {
      // Descriptive only: Part B has no minimum score and must not move the
      // Part A result. It names which symptoms were answered in a clinically
      // relevant range, which is what the in-depth report is built on.
      kind: 'flagged-items',
      id: 'partB-detail',
      questionIds: [...PART_B],
      positiveAt: {
        q7: 2, q8: 2, q9: 3, q10: 2, q11: 2, q12: 3,
        q13: 3, q14: 3, q15: 3, q16: 2, q17: 3, q18: 2,
      },
    },
    { kind: 'sum', id: 'inattention', questionIds: INATTENTION },
    { kind: 'sum', id: 'hyperactivity', questionIds: HYPERACTIVITY },
  ],
};

/**
 * Item prompts, per locale. Only locales with an officially validated
 * translation appear here: translating a validated instrument ourselves would
 * void the validation and breach the licence.
 */
export const asrs18Prompts: Record<string, Record<string, string>> = {
  'pt-br': {
    q1: 'Com que frequência você deixa um projeto pela metade depois de já ter feito as partes mais difíceis?',
    q2: 'Com que frequência você tem dificuldade para fazer um trabalho que exige organização?',
    q3: 'Com que frequência você tem dificuldade para lembrar de compromissos ou obrigações?',
    q4: 'Quando você precisa fazer algo que exige muita concentração, com que frequência você evita ou adia o início?',
    q5: 'Com que frequência você fica se mexendo na cadeira ou balançando as mãos ou os pés quando precisa ficar sentado(a) por muito tempo?',
    q6: 'Com que frequência você se sente ativo(a) demais e necessitando fazer coisas, como se estivesse com um motor ligado?',
    q7: 'Com que frequência você comete erros bobos por falta de atenção quando tem de trabalhar num projeto chato ou difícil?',
    q8: 'Com que frequência você tem dificuldade para manter a atenção quando está fazendo um trabalho chato ou repetitivo?',
    q9: 'Com que frequência você tem dificuldade para se concentrar no que as pessoas dizem, mesmo quando elas estão falando diretamente com você?',
    q10: 'Com que frequência você coloca as coisas fora do lugar ou tem dificuldade de encontrar as coisas em casa ou no trabalho?',
    q11: 'Com que frequência você se distrai com atividades ou barulho a sua volta?',
    q12: 'Com que frequência você se levanta da cadeira em reuniões ou em outras situações onde deveria ficar sentado(a)?',
    q13: 'Com que frequência você se sente inquieto(a) ou agitado(a)?',
    q14: 'Com que frequência você tem dificuldade para sossegar e relaxar quando tem tempo livre para você?',
    q15: 'Com que frequência você se pega falando demais em situações sociais?',
    q16: 'Quando você está conversando, com que frequência você se pega terminando as frases das pessoas antes delas?',
    q17: 'Com que frequência você tem dificuldade para esperar nas situações onde cada um tem a sua vez?',
    q18: 'Com que frequência você interrompe os outros quando eles estão ocupados?',
  },
};

/** Choice labels, per locale. Same rule as the prompts. */
export const asrs18ChoiceLabels: Record<string, Record<string, string>> = {
  'pt-br': {
    never: 'Nunca',
    rarely: 'Quase nunca',
    sometimes: 'De vez em quando',
    often: 'Quase sempre',
    'very-often': 'Sempre',
  },
};

/** Locales the instrument can actually be offered in today. */
export const asrs18Locales = Object.keys(asrs18Prompts);
