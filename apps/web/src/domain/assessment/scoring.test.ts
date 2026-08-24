import { describe, expect, it } from 'vitest';
import { NotScorableError, assertScorable, isScorable, scoreAssessment } from './scoring';
import type { AssessmentDefinition } from './types';
import {
  asrs18,
  asrs18ChoiceLabels,
  asrs18Locales,
  asrs18Prompts,
} from './instruments/asrs18';

/**
 * A small instrument with deliberately uneven thresholds, because that is the
 * property the ASRS depends on and a uniform cutoff would silently pass.
 */
function fixture(overrides: Partial<AssessmentDefinition> = {}): AssessmentDefinition {
  return {
    assessmentId: 'fixture',
    version: '1',
    scoringVersion: '1',
    provenance: { instrument: 'fixture', authors: '-', licence: '-', validatedFor: '-' },
    scales: [
      {
        id: 'freq',
        choices: [
          { id: 'never', value: 0 },
          { id: 'rarely', value: 1 },
          { id: 'sometimes', value: 2 },
          { id: 'often', value: 3 },
          { id: 'very-often', value: 4 },
        ],
      },
    ],
    questions: ['a', 'b', 'c'].map((id) => ({
      id,
      type: 'likert' as const,
      block: 'main',
      scaleId: 'freq',
    })),
    rules: [
      {
        kind: 'threshold-count',
        id: 'screen',
        questionIds: ['a', 'b', 'c'],
        // a counts from "sometimes", b and c only from "often"
        positiveAt: { a: 2, b: 3, c: 3 },
        cutoff: 2,
      },
      { kind: 'sum', id: 'total', questionIds: ['a', 'b', 'c'] },
    ],
    ...overrides,
  };
}

const answer = (questionId: string, choiceId: string) => ({ questionId, choiceId });

describe('threshold-count', () => {
  it('applies each question its own threshold', () => {
    // "sometimes" clears a (>=2) but not b or c (>=3)
    const result = scoreAssessment(
      fixture(),
      ['a', 'b', 'c'].map((id) => answer(id, 'sometimes')),
    );
    expect(result.scores.screen).toBe(1);
    expect(result.flags.screen).toBe(false);
  });

  it('does not treat the thresholds as uniform', () => {
    // A uniform ">= 2" rule would count all three here and raise the flag.
    const uneven = scoreAssessment(fixture(), [
      answer('a', 'sometimes'),
      answer('b', 'sometimes'),
      answer('c', 'often'),
    ]);
    expect(uneven.scores.screen).toBe(2);
    expect(uneven.flags.screen).toBe(true);
  });

  it('raises the flag only at the cutoff', () => {
    const below = scoreAssessment(fixture(), [answer('a', 'very-often')]);
    expect(below.flags.screen).toBe(false);

    const at = scoreAssessment(fixture(), [
      answer('a', 'very-often'),
      answer('b', 'often'),
    ]);
    expect(at.flags.screen).toBe(true);
  });

  it('ignores unanswered questions rather than counting them as zero', () => {
    const result = scoreAssessment(fixture(), [answer('a', 'often')]);
    expect(result.scores.screen).toBe(1);
  });
});

describe('sum', () => {
  it('adds the ordinal weight of each answer', () => {
    const result = scoreAssessment(fixture(), [
      answer('a', 'rarely'),
      answer('b', 'often'),
      answer('c', 'very-often'),
    ]);
    expect(result.scores.total).toBe(1 + 3 + 4);
  });

  it('treats a missing answer as no contribution', () => {
    const result = scoreAssessment(fixture(), [answer('a', 'very-often')]);
    expect(result.scores.total).toBe(4);
  });
});

describe('answers', () => {
  it('keeps only the last answer for a question', () => {
    const result = scoreAssessment(fixture(), [
      answer('a', 'very-often'),
      answer('a', 'never'),
    ]);
    expect(result.scores.total).toBe(0);
    expect(result.scores.screen).toBe(0);
  });

  it('reports completeness as a fraction of the instrument', () => {
    expect(scoreAssessment(fixture(), []).completeness).toBe(0);
    expect(scoreAssessment(fixture(), [answer('a', 'never')]).completeness).toBeCloseTo(1 / 3);
    expect(
      scoreAssessment(fixture(), ['a', 'b', 'c'].map((id) => answer(id, 'never'))).completeness,
    ).toBe(1);
  });

  it('counts "never" as answered — it is a real answer, not a blank', () => {
    expect(scoreAssessment(fixture(), [answer('a', 'never')]).completeness).toBeGreaterThan(0);
  });

  it('ignores an answer whose choice is not on the scale', () => {
    const result = scoreAssessment(fixture(), [answer('a', 'not-a-choice')]);
    expect(result.completeness).toBe(0);
    expect(result.scores.total).toBe(0);
  });
});

describe('refusing to score', () => {
  it('refuses when a threshold-count rule is missing a threshold', () => {
    const broken = fixture({
      rules: [
        {
          kind: 'threshold-count',
          id: 'screen',
          questionIds: ['a', 'b', 'c'],
          positiveAt: { a: 2 },
          cutoff: 2,
        },
      ],
    });
    expect(() => scoreAssessment(broken, [])).toThrow(NotScorableError);
    expect(() => assertScorable(broken)).toThrow(/no threshold for b, c/);
    expect(isScorable(broken)).toBe(false);
  });

  it('refuses while the definition is marked pending', () => {
    expect(() => scoreAssessment(fixture({ pending: 'awaiting source' }), [])).toThrow(
      NotScorableError,
    );
  });

  it('carries the versions through so a result stays traceable', () => {
    const result = scoreAssessment(fixture(), []);
    expect(result).toMatchObject({ assessmentId: 'fixture', version: '1', scoringVersion: '1' });
  });
});

describe('ASRS-18 definition', () => {
  const a = (questionId: string, choiceId: string) => ({ questionId, choiceId });
  const partA = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

  it('is scorable', () => {
    expect(isScorable(asrs18)).toBe(true);
    expect(asrs18.pending).toBeUndefined();
  });

  it('uses uneven Part A thresholds, not one cutoff for all six', () => {
    const rule = asrs18.rules.find((r) => r.id === 'partA-screen');
    if (rule?.kind !== 'threshold-count') throw new Error('rule missing');
    expect(rule.positiveAt).toEqual({ q1: 2, q2: 2, q3: 2, q4: 3, q5: 3, q6: 3 });
    expect(new Set(Object.values(rule.positiveAt)).size).toBeGreaterThan(1);
  });

  it('counts "De vez em quando" for q1-q3 but not for q4-q6', () => {
    // All six answered "sometimes": only the first three are in the shaded box,
    // so the screen must not be raised. A uniform ">= 2" rule would count six
    // and flag it.
    const result = scoreAssessment(asrs18, partA.map((q) => a(q, 'sometimes')));
    expect(result.scores['partA-screen']).toBe(3);
    expect(result.flags['partA-screen']).toBe(false);
  });

  it('raises the screen at four positives', () => {
    const three = scoreAssessment(asrs18, [
      a('q1', 'sometimes'), a('q2', 'sometimes'), a('q3', 'sometimes'),
      a('q4', 'rarely'), a('q5', 'rarely'), a('q6', 'rarely'),
    ]);
    expect(three.flags['partA-screen']).toBe(false);

    const four = scoreAssessment(asrs18, [
      a('q1', 'sometimes'), a('q2', 'sometimes'), a('q3', 'sometimes'),
      a('q4', 'often'), a('q5', 'rarely'), a('q6', 'rarely'),
    ]);
    expect(four.scores['partA-screen']).toBe(4);
    expect(four.flags['partA-screen']).toBe(true);
  });

  it('never raises the screen when nothing is answered', () => {
    expect(scoreAssessment(asrs18, []).flags['partA-screen']).toBe(false);
  });

  it('has an item text and a choice label for every locale it offers', () => {
    for (const locale of asrs18Locales) {
      expect(Object.keys(asrs18Prompts[locale])).toHaveLength(18);
      expect(Object.keys(asrs18ChoiceLabels[locale])).toHaveLength(5);
    }
  });

  it('offers no locale it cannot serve an official translation for', () => {
    // Translating a validated instrument ourselves would void the validation.
    expect(asrs18Locales).toEqual(['pt-br']);
  });

  it('has all 18 items, split 6 / 12 between the parts', () => {
    expect(asrs18.questions).toHaveLength(18);
    expect(asrs18.questions.filter((q) => q.block === 'partA')).toHaveLength(6);
    expect(asrs18.questions.filter((q) => q.block === 'partB')).toHaveLength(12);
  });

  it('screens on Part A at a cutoff of 4', () => {
    const rule = asrs18.rules.find((r) => r.id === 'partA-screen');
    expect(rule).toMatchObject({ kind: 'threshold-count', cutoff: 4 });
  });

  it('assigns every item to exactly one symptom subscale', () => {
    const sums = asrs18.rules.filter((r) => r.kind === 'sum');
    const covered = sums.flatMap((r) => r.questionIds);
    expect(new Set(covered).size).toBe(covered.length);
    expect(new Set(covered)).toEqual(new Set(asrs18.questions.map((q) => q.id)));
  });

  it('carries the attribution the licence requires', () => {
    expect(asrs18.provenance.authors).toMatch(/World Health Organization/);
    expect(asrs18.provenance.licence).toMatch(/attribution/i);
  });
});
