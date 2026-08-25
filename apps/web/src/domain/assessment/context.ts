/**
 * Optional context questions, asked after the instrument is finished.
 *
 * These are NURA's own questions, not the ASRS's. They exist to personalise
 * how a result is presented and to segment who is taking the test — never to
 * move a score. That separation is structural rather than a convention:
 *
 *  - they live in their own module, so no scoring rule can reference them;
 *  - their ids carry a `ctx` prefix, so a context answer can never collide
 *    with an instrument item id in storage;
 *  - `isComplete` and `scoreAssessment` know nothing about them, so a person
 *    who skips every one of them still gets the same result.
 *
 * Skipping is a first-class outcome, not a failure. The instrument is the
 * product; this is a courtesy, and a courtesy that blocks the result would
 * cost more completions than the segmentation is worth.
 */

export interface ContextChoice {
  id: string;
  /** Whether picking this one ends the question set for that person. */
  terminal?: boolean;
}

export interface ContextQuestion {
  id: string;
  choices: ContextChoice[];
}

/** Prefix that marks an answer as context rather than instrument. */
export const CONTEXT_PREFIX = 'ctx';

export function isContextAnswer(questionId: string): boolean {
  return questionId.startsWith(CONTEXT_PREFIX);
}

/**
 * Three questions, deliberately. Each one has to earn its place against the
 * completion it costs:
 *
 *  - `ctxSetting` is the only one that changes how the report reads.
 *  - `ctxSince` separates a lifelong pattern from a recent change, which is
 *    exactly the distinction a clinician asks about first and the screening
 *    instrument does not capture.
 *  - `ctxTrigger` is why the person is here today, which is the single most
 *    useful thing to know when writing the offer.
 */
export const ASRS_CONTEXT: ContextQuestion[] = [
  {
    id: 'ctxSetting',
    choices: [
      { id: 'work' },
      { id: 'study' },
      { id: 'home' },
      { id: 'several' },
    ],
  },
  {
    id: 'ctxSince',
    choices: [
      { id: 'childhood' },
      { id: 'adolescence' },
      { id: 'adulthood' },
      { id: 'recent' },
      { id: 'unsure' },
    ],
  },
  {
    id: 'ctxTrigger',
    choices: [
      { id: 'ownSuspicion' },
      { id: 'someoneSuggested' },
      { id: 'professionalSuggested' },
      { id: 'curiosity' },
    ],
  },
];
