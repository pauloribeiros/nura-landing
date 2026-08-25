import { describe, expect, it } from 'vitest';
import { ASRS_CONTEXT, CONTEXT_PREFIX, isContextAnswer } from './context';
import { asrs18 } from './instruments/asrs18';
import { scoreAssessment } from './scoring';
import { createSession, isComplete, recordAnswer } from './session';

/**
 * Context questions are NURA's, the instrument is the WHO's, and the whole
 * point is that the first can never move the second. That is easy to hold
 * today and easy to lose the day someone adds a rule referencing `ctxSetting`
 * because it "clearly relates to attention". These tests are what makes that
 * mistake fail loudly instead of quietly changing people's results.
 */

const answerEverything = () =>
  asrs18.questions.map((q) => ({ questionId: q.id, choiceId: 'very-often' }));

describe('context questions', () => {
  it('never collides with an instrument item id', () => {
    const instrumentIds = new Set(asrs18.questions.map((q) => q.id));
    for (const question of ASRS_CONTEXT) {
      expect(instrumentIds.has(question.id)).toBe(false);
      expect(question.id.startsWith(CONTEXT_PREFIX)).toBe(true);
      expect(isContextAnswer(question.id)).toBe(true);
    }
  });

  it('does not mark any instrument item as context', () => {
    for (const question of asrs18.questions) {
      expect(isContextAnswer(question.id)).toBe(false);
    }
  });

  it('is not referenced by any scoring rule', () => {
    const contextIds = new Set(ASRS_CONTEXT.map((q) => q.id));
    for (const rule of asrs18.rules) {
      for (const id of rule.questionIds) {
        expect(contextIds.has(id)).toBe(false);
      }
    }
  });

  it('leaves the score identical whether answered or not', () => {
    const withoutContext = scoreAssessment(asrs18, answerEverything());
    const withContext = scoreAssessment(asrs18, [
      ...answerEverything(),
      ...ASRS_CONTEXT.map((q) => ({ questionId: q.id, choiceId: q.choices[0].id })),
    ]);
    expect(withContext).toEqual(withoutContext);
  });

  it('does not hold the assessment incomplete when skipped', () => {
    let session = createSession(asrs18, { id: 'test', startedAt: '2026-01-01T00:00:00.000Z' });
    for (const answer of answerEverything()) session = recordAnswer(session, answer);

    // Every instrument item answered, no context answered at all.
    expect(isComplete(asrs18, session)).toBe(true);
  });

  it('offers choices for every question', () => {
    for (const question of ASRS_CONTEXT) {
      expect(question.choices.length).toBeGreaterThan(1);
      const ids = question.choices.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
