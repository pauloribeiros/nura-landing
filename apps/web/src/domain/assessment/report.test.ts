import { describe, expect, it } from 'vitest';
import { balanceOf, buildReportPlan, planQuotesOnlyInstrumentItems, quotedItems } from './report';
import { ASRS_DOMAINS, asrs18 } from './instruments/asrs18';
import { scoreAssessment } from './scoring';
import type { Answer } from './types';

/**
 * The report is the paid product, so it is the place where a wrong claim costs
 * the most — a person pays for it, keeps it, and may take it to a doctor.
 * These tests pin the three rules the plan exists to enforce: no DSM subtype,
 * items quoted rather than paraphrased, and the screening verdict taken from
 * the scorer rather than reached again.
 */

const answerAll = (choiceId: string): Answer[] =>
  asrs18.questions.map((q) => ({ questionId: q.id, choiceId }));

/** Answers that flag exactly the listed items and nothing else. */
const answerOnly = (ids: string[]): Answer[] =>
  asrs18.questions.map((q) => ({
    questionId: q.id,
    choiceId: ids.includes(q.id) ? 'very-often' : 'never',
  }));

const planFor = (answers: Answer[], context = {}) =>
  buildReportPlan(scoreAssessment(asrs18, answers), context);

describe('report plan', () => {
  it('has six sections, in order', () => {
    const plan = planFor(answerAll('very-often'));
    expect(plan.sections.map((s) => s.id)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6']);
  });

  it('carries the versions that produced it', () => {
    const plan = planFor(answerAll('very-often'));
    expect(plan.version).toBe(asrs18.version);
    expect(plan.scoringVersion).toBe(asrs18.scoringVersion);
  });

  it('takes the band from the scorer instead of deciding again', () => {
    expect(planFor(answerAll('very-often')).band).toBe('highlyConsistent');
    expect(planFor(answerAll('never')).band).toBe('notElevated');
  });

  it('quotes instrument items and never a context question', () => {
    const plan = planFor(answerAll('very-often'), {
      ctxSetting: 'work',
      ctxSince: 'childhood',
      ctxTrigger: 'ownSuspicion',
    });
    expect(planQuotesOnlyInstrumentItems(plan)).toBe(true);
    const instrumentIds = new Set(asrs18.questions.map((q) => q.id));
    for (const id of quotedItems(plan)) expect(instrumentIds.has(id)).toBe(true);
  });

  it('keeps quoted items in the published order', () => {
    const plan = planFor(answerAll('very-often'));
    const s2 = plan.sections.find((s) => s.id === 's2')!;
    expect(s2.items).toEqual([...ASRS_DOMAINS.inattention]);
  });

  it('names no DSM presentation anywhere in the plan', () => {
    // The plan is data, so the words it can carry are the copy keys. None of
    // them may be a diagnostic specifier.
    const forbidden = /predominant|inattentive type|hyperactive type|combined type|subtype/i;
    for (const answers of [answerAll('very-often'), answerAll('never'), answerOnly(ASRS_DOMAINS.inattention.slice(0, 5))]) {
      const plan = planFor(answers);
      const keys = plan.sections.map((s) => `${s.id}.${s.bodyKey}`).join(' ');
      expect(keys).not.toMatch(forbidden);
    }
  });

  describe('balance between the dimensions', () => {
    it('needs a two-item gap before calling either side higher', () => {
      expect(balanceOf(5, 4)).toBe('similar');
      expect(balanceOf(4, 5)).toBe('similar');
      expect(balanceOf(6, 4)).toBe('inattentionHigher');
      expect(balanceOf(4, 6)).toBe('hyperactivityHigher');
    });

    it('reports no flags at all as its own shape', () => {
      expect(balanceOf(0, 0)).toBe('fewFlags');
      expect(planFor(answerAll('never')).sections.find((s) => s.id === 's4')!.bodyKey)
        .toBe('fewFlags');
    });
  });

  describe('the context section', () => {
    it('speaks generally when no setting was given', () => {
      const s5 = planFor(answerAll('very-often')).sections.find((s) => s.id === 's5')!;
      expect(s5.bodyKey).toBe('noSetting');
    });

    it('uses the setting the person actually named', () => {
      const s5 = planFor(answerAll('very-often'), { ctxSetting: 'study' })
        .sections.find((s) => s.id === 's5')!;
      expect(s5.bodyKey).toBe('setting.study');
    });
  });

  it('describes an empty domain rather than omitting it', () => {
    // Someone who flags only inattention items still gets a hyperactivity
    // section — a report with a missing chapter reads as a broken product.
    const plan = planFor(answerOnly([...ASRS_DOMAINS.inattention]));
    const s3 = plan.sections.find((s) => s.id === 's3')!;
    expect(s3.bodyKey).toBe('none');
    expect(s3.items).toEqual([]);
  });
});
