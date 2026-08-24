import type {
  Answer,
  AssessmentDefinition,
  ScoreResult,
  ScoringRule,
} from './types';

/** Raised when a definition cannot produce a trustworthy score. */
export class NotScorableError extends Error {
  constructor(readonly assessmentId: string, reason: string) {
    super(`Assessment "${assessmentId}" is not scorable: ${reason}`);
    this.name = 'NotScorableError';
  }
}

/**
 * A definition is scorable only when every rule can actually be evaluated.
 * Checked before scoring rather than during, so a missing threshold surfaces
 * as a refusal instead of as a plausible-looking number.
 */
export function assertScorable(definition: AssessmentDefinition): void {
  if (definition.pending) {
    throw new NotScorableError(definition.assessmentId, definition.pending);
  }

  for (const rule of definition.rules) {
    if (rule.kind === 'sum') continue;
    const missing = rule.questionIds.filter((id) => rule.positiveAt[id] === undefined);
    if (missing.length > 0) {
      throw new NotScorableError(
        definition.assessmentId,
        `rule "${rule.id}" has no threshold for ${missing.join(', ')}`,
      );
    }
  }
}

export function isScorable(definition: AssessmentDefinition): boolean {
  try {
    assertScorable(definition);
    return true;
  } catch {
    return false;
  }
}

/** Resolves an answer to the ordinal weight of the chosen option. */
function valueOf(
  definition: AssessmentDefinition,
  answers: Map<string, string>,
  questionId: string,
): number | undefined {
  const choiceId = answers.get(questionId);
  if (choiceId === undefined) return undefined;

  const question = definition.questions.find((q) => q.id === questionId);
  if (!question) return undefined;

  const scale = definition.scales.find((s) => s.id === question.scaleId);
  return scale?.choices.find((c) => c.id === choiceId)?.value;
}

function applyRule(
  definition: AssessmentDefinition,
  answers: Map<string, string>,
  rule: Exclude<ScoringRule, { kind: 'flagged-items' }>,
): { score: number; flag?: boolean } {
  if (rule.kind === 'sum') {
    const score = rule.questionIds.reduce(
      (total, id) => total + (valueOf(definition, answers, id) ?? 0),
      0,
    );
    return { score };
  }

  // threshold-count: each question clears its own bar, then the count is
  // compared to the cutoff.
  const positives = rule.questionIds.filter((id) => {
    const value = valueOf(definition, answers, id);
    return value !== undefined && value >= rule.positiveAt[id];
  }).length;

  return { score: positives, flag: positives >= rule.cutoff };
}

/**
 * Pure: same definition and answers always produce the same result. No dates,
 * no randomness, no I/O — so it can run identically on the client for a
 * preview and on the server for the result that actually counts.
 */
export function scoreAssessment(
  definition: AssessmentDefinition,
  answers: Answer[],
): ScoreResult {
  assertScorable(definition);

  // Last answer wins, so a re-answered question does not count twice.
  const byQuestion = new Map<string, string>();
  for (const answer of answers) byQuestion.set(answer.questionId, answer.choiceId);

  const scores: Record<string, number> = {};
  const flags: Record<string, boolean> = {};
  const flagged: Record<string, string[]> = {};
  const bands: Record<string, string> = {};

  for (const rule of definition.rules) {
    if (rule.kind === 'flagged-items') {
      flagged[rule.id] = rule.questionIds.filter((id) => {
        const value = valueOf(definition, byQuestion, id);
        return value !== undefined && value >= rule.positiveAt[id];
      });
      continue;
    }

    const { score, flag } = applyRule(definition, byQuestion, rule);
    scores[rule.id] = score;
    if (flag === undefined) continue;

    flags[rule.id] = flag;
    const band = rule.kind === 'threshold-count'
      ? rule.bands?.find((b) => score >= b.from && score <= b.to)
      : undefined;
    if (band) bands[rule.id] = band.key;
  }

  const answered = definition.questions.filter(
    (q) => valueOf(definition, byQuestion, q.id) !== undefined,
  ).length;

  return {
    assessmentId: definition.assessmentId,
    version: definition.version,
    scoringVersion: definition.scoringVersion,
    scores,
    flags,
    flagged,
    bands,
    completeness: definition.questions.length === 0 ? 0 : answered / definition.questions.length,
  };
}
