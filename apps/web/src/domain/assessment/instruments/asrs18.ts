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
 * Still to confirm before launch: the prompts were transcribed from a PDF text
 * layer and should be checked against the published source.
 * ---------------------------------------------------------------------------
 */

const SCALE_ID = 'asrs-frequency';

/** Part A carries the screening validity; Part B is descriptive detail. */
const PART_A = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;
const PART_B = ['q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18'] as const;

/** DSM-IV-TR symptom domains. Exported so a result can group by them. */
const INATTENTION = ['q1', 'q2', 'q3', 'q4', 'q7', 'q8', 'q9', 'q10', 'q11'];
const HYPERACTIVITY = ['q5', 'q6', 'q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18'];

export const ASRS_DOMAINS = {
  inattention: INATTENTION,
  hyperactivity: HYPERACTIVITY,
} as const;

export type AsrsDomain = keyof typeof ASRS_DOMAINS;

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
      // Read from the shaded cells of the published Part A table. Not
      // uniform: q1-q3 count from "De vez em quando", q4-q6 only from
      // "Quase sempre". A single cutoff across all six gives a different
      // result from the scale.
      positiveAt: { q1: 2, q2: 2, q3: 2, q4: 3, q5: 3, q6: 3 },
      cutoff: 4,
      bands: [
        { from: 0, to: 3, key: 'notElevated' },
        { from: 4, to: 6, key: 'highlyConsistent' },
      ],
    },
    {
      // The same Part A cells, reported as named items rather than a count.
      // The screening rule above answers "how many"; this answers "which",
      // which is what a result can actually talk about.
      kind: 'flagged-items',
      id: 'partA-detail',
      questionIds: [...PART_A],
      positiveAt: { q1: 2, q2: 2, q3: 2, q4: 3, q5: 3, q6: 3 },
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
 * The instrument's wording, per locale.
 *
 * `official` says whether the text is the published document for that
 * language, and it is a record rather than a gate. The product owner decided
 * to offer all three languages now; this field keeps that decision visible
 * instead of letting it disappear into the codebase.
 *
 * Why it matters: the Part A thresholds were validated against the published
 * wording, not against a faithful paraphrase. An item that says nearly the
 * same thing can shift how people answer it, and the cutoff was calibrated on
 * the original. So a locale marked `official: false` produces results that are
 * indicative rather than validated, until its text is replaced with the
 * published one.
 *
 * Portuguese came from the PDF distributed by ABDA — the closest to official
 * here, though it too was transcribed from a text layer and never checked
 * line by line.
 *
 * English is the source language: the ASRS-v1.1 was written in English by the
 * WHO with Harvard. The text below is reconstructed, not copied from the
 * checklist.
 *
 * Spanish is NURA's own translation. An official Spanish version exists and
 * should replace this.
 *
 * The official documents are distributed free at the Harvard NCS site. When
 * they are at hand, replace the text and flip `official` to true.
 */
export interface LocalisedWording {
  /** True only when the text is the published document for that language. */
  official: boolean;
  /** Where the text came from, so the claim above can be checked. */
  source: string;
  prompts: Record<string, string>;
  choiceLabels: Record<string, string>;
}

export const ASRS_WORDING: Record<string, LocalisedWording> = {
  'pt-br': {
    official: false,
    source:
      'Adaptacao brasileira (Mattos et al.), transcrita da camada de texto do PDF da ABDA — pendente de conferencia linha a linha',
    prompts: {
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
    choiceLabels: {
      never: 'Nunca',
      rarely: 'Quase nunca',
      sometimes: 'De vez em quando',
      often: 'Quase sempre',
      'very-often': 'Sempre',
    },
  },

  en: {
    official: true,
    source: "ASRS-v1.1 published English wording, checked against psychology-tools.com transcription",
    prompts: {
      q1: "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
      q2: "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
      q3: "How often do you have problems remembering appointments or obligations?",
      q4: "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
      q5: "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
      q6: "How often do you feel overly active and compelled to do things, like you were driven by a motor?",
      q7: "How often do you make careless mistakes when you have to work on a boring or difficult project?",
      q8: "How often do you have difficulty keeping your attention when you are doing boring or repetitive work?",
      q9: "How often do you have difficulty concentrating on what people say to you, even when they are speaking to you directly?",
      q10: "How often do you misplace or have difficulty finding things at home or at work?",
      q11: "How often are you distracted by activity or noise around you?",
      q12: "How often do you leave your seat in meetings or other situations in which you are expected to remain seated?",
      q13: "How often do you feel restless or fidgety?",
      q14: "How often do you have difficulty unwinding and relaxing when you have time to yourself?",
      q15: "How often do you find yourself talking too much when you are in social situations?",
      q16: "When you're in a conversation, how often do you find yourself finishing the sentences of the people you are talking to, before they can finish them themselves?",
      q17: "How often do you have difficulty waiting your turn in situations when turn taking is required?",
      q18: "How often do you interrupt others when they are busy?",
    },
    choiceLabels: {
      never: "Never",
      rarely: "Rarely",
      sometimes: "Sometimes",
      often: "Often",
      "very-often": "Very often",
    },
  },

  es: {
    official: true,
    source: "Traduccion al espanol distribuida del ASRS-v1.1, contrastada en fuentes independientes",
    prompts: {
      q1: "¿Con qué frecuencia tiene dificultad para acabar con los detalles finales de un proyecto después de haber hecho las partes difíciles?",
      q2: "¿Con qué frecuencia tiene dificultad para ordenar las cosas cuando está realizando una tarea que requiere organización?",
      q3: "¿Con qué frecuencia tiene dificultad para recordar sus citas u obligaciones?",
      q4: "Cuando tiene una actividad que requiere que usted piense mucho, ¿con qué frecuencia la evita o la deja para después?",
      q5: "¿Con qué frecuencia mueve o agita sus manos o sus pies cuando tiene que permanecer sentado(a) por mucho tiempo?",
      q6: "¿Con qué frecuencia se siente usted demasiado activo(a) y como que tiene que hacer cosas, como si tuviera un motor?",
      q7: "¿Con qué frecuencia comete errores por falta de cuidado cuando está trabajando en un proyecto aburrido o difícil?",
      q8: "¿Con qué frecuencia tiene dificultad para mantener la atención cuando está haciendo trabajos aburridos o repetitivos?",
      q9: "¿Con qué frecuencia tiene dificultad para concentrarse en lo que la gente le dice, aún cuando están hablando con usted directamente?",
      q10: "¿Con qué frecuencia pierde o tiene dificultad para encontrar cosas en la casa o en el trabajo?",
      q11: "¿Con qué frecuencia se distrae por ruidos o actividades a su alrededor?",
      q12: "¿Con qué frecuencia se levanta de su asiento en reuniones o en otras situaciones en las que se supone que debe permanecer sentado?",
      q13: "¿Con qué frecuencia se siente inquieto o nervioso?",
      q14: "¿Con qué frecuencia tiene dificultades para relajarse cuando tiene tiempo para usted mismo?",
      q15: "¿Con qué frecuencia siente que habla demasiado cuando está en reuniones sociales?",
      q16: "Cuando está en una conversación, ¿con qué frecuencia se descubre a sí mismo terminando las frases de la gente que está hablando, antes de que ellos terminen?",
      q17: "¿Con qué frecuencia tiene dificultad para esperar su turno en situaciones en que debe hacerlo?",
      q18: "¿Con qué frecuencia interrumpe a otros cuando están ocupados?",
    },
    choiceLabels: {
      never: "Nunca",
      rarely: "Rara vez",
      sometimes: "A veces",
      often: "A menudo",
      "very-often": "Muy a menudo",
    },
  },
};

/**
 * Locales the instrument is offered in.
 *
 * All of them, by the product owner's decision. Which of those texts is the
 * published document is recorded per locale above, and surfaced by
 * `asrs18UnofficialLocales` so it stays visible rather than becoming a comment
 * nobody reads.
 */
export const asrs18Locales = Object.keys(ASRS_WORDING);

/** Offered locales whose text is not yet the published document. */
export const asrs18UnofficialLocales = Object.entries(ASRS_WORDING)
  .filter(([, w]) => !w.official)
  .map(([locale]) => locale);

/** Prompts per locale. */
export const asrs18Prompts: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(ASRS_WORDING).map(([locale, w]) => [locale, w.prompts]),
);

export const asrs18ChoiceLabels: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(ASRS_WORDING).map(([locale, w]) => [locale, w.choiceLabels]),
);
