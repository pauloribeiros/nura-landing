import { describe, expect, it } from 'vitest';
import { buildReportPlan } from './report';
import { ASRS_DOMAINS, asrs18 } from './instruments/asrs18';
import { scoreAssessment } from './scoring';
import { ASRS_CONTEXT } from './context';
import type { Answer } from './types';
import ptBr from '../../../messages/pt-br.json';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';

/**
 * Every report a person can be given must have words in every locale.
 *
 * The plan picks a copy key from the data, so a combination nobody thought to
 * write copy for does not fail at build time — it fails for one paying
 * customer, who sees `report.s4.similar` where a paragraph should be. That is
 * the worst way to find out, so the combinations are enumerated here instead.
 *
 * Keys are collected by RUNNING the planner across the input space rather than
 * listed by hand. A hand-written list would go stale the day someone adds a
 * branch, which is exactly the day this test needs to catch it.
 */

const CATALOGUES: Record<string, unknown> = { 'pt-br': ptBr, en, es };

/** Answer patterns chosen to reach every branch the planner can take. */
const PATTERNS: Record<string, Answer[]> = {
  todosNunca: asrs18.questions.map((q) => ({ questionId: q.id, choiceId: 'never' })),
  todosSempre: asrs18.questions.map((q) => ({ questionId: q.id, choiceId: 'very-often' })),
  soDesatencao: asrs18.questions.map((q) => ({
    questionId: q.id,
    choiceId: (ASRS_DOMAINS.inattention as readonly string[]).includes(q.id) ? 'very-often' : 'never',
  })),
  soHiperatividade: asrs18.questions.map((q) => ({
    questionId: q.id,
    choiceId: (ASRS_DOMAINS.hyperactivity as readonly string[]).includes(q.id) ? 'very-often' : 'never',
  })),
  // One item apart, which must read as "similar" rather than as a lean.
  quaseEquilibrado: asrs18.questions.map((q, i) => ({
    questionId: q.id,
    choiceId: i < 9 || i === 9 ? 'very-often' : 'never',
  })),
};

const SETTINGS = [undefined, ...(ASRS_CONTEXT.find((q) => q.id === 'ctxSetting')?.choices ?? []).map((c) => c.id)];
const SINCES = [undefined, ...(ASRS_CONTEXT.find((q) => q.id === 'ctxSince')?.choices ?? []).map((c) => c.id)];

/** Resolves a dotted key inside a catalogue, or undefined. */
function lookup(catalogue: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, part) =>
      node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
    catalogue,
  );
}

/** Every `report.*` key the planner can emit, across the whole input space. */
function everyKey(): Set<string> {
  const keys = new Set<string>();

  for (const answers of Object.values(PATTERNS)) {
    const result = scoreAssessment(asrs18, answers);

    for (const ctxSetting of SETTINGS) {
      for (const ctxSince of SINCES) {
        const plan = buildReportPlan(result, { ctxSetting, ctxSince });
        for (const section of plan.sections) {
          keys.add(`report.${section.id}.${section.bodyKey}`);
          if (section.noteKey) keys.add(`report.${section.id}.${section.noteKey}`);
        }
      }
    }
  }
  return keys;
}

describe('report copy coverage', () => {
  const keys = [...everyKey()].sort();

  it('reaches a meaningful number of combinations', () => {
    // A guard on the guard: if the enumeration silently stopped exploring, the
    // rest of this file would pass while testing almost nothing.
    expect(keys.length).toBeGreaterThan(20);
  });

  for (const locale of Object.keys(CATALOGUES)) {
    it(`${locale} has copy for every report a person can get`, () => {
      const missing = keys.filter((k) => typeof lookup(CATALOGUES[locale], k) !== 'string');
      expect(missing).toEqual([]);
    });

    it(`${locale} leaves no placeholder unfilled`, () => {
      // A key that still reads `{count}` because the section never passes that
      // parameter would print a brace to a paying customer.
      const allowed = new Set(['count', 'cutoff', 'flagged', 'total', 'inattention', 'hyperactivity']);
      const offenders: string[] = [];

      for (const k of keys) {
        const text = lookup(CATALOGUES[locale], k);
        if (typeof text !== 'string') continue;
        for (const [, name] of text.matchAll(/\{(\w+)\}/g)) {
          if (!allowed.has(name)) offenders.push(`${k}: {${name}}`);
        }
      }
      expect(offenders).toEqual([]);
    });
  }

  it('names the same set of keys in all three locales', () => {
    // Copy present in one language and missing in another is the shape this
    // catches — a report that reads fine in Portuguese and breaks in Spanish.
    const shapes = Object.entries(CATALOGUES).map(([locale, cat]) => ({
      locale,
      present: keys.filter((k) => typeof lookup(cat, k) === 'string').length,
    }));
    expect(new Set(shapes.map((s) => s.present)).size).toBe(1);
  });
});
