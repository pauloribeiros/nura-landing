import type { Answer, AssessmentDefinition } from './types';

/**
 * A run of an assessment.
 *
 * Anonymous by construction: nothing here knows about a user. Section 27 of the
 * master doc wants the person to answer before being asked to sign up, so the
 * session is the unit that exists first and gets claimed by an account later —
 * `claimedBy` is the only field an account ever writes.
 *
 * `id` and `startedAt` are injected rather than generated here, so every
 * function in this file stays pure and the tests stay deterministic.
 */
export interface AssessmentSession {
  id: string;
  assessmentId: string;
  /** Instrument version answered. A session is never migrated across versions:
   *  the questions would no longer be the ones the person saw. */
  version: string;
  startedAt: string;
  answers: Answer[];
  pageIndex: number;
  /** Set once an anonymous session is linked to an account. */
  claimedBy?: string;
}

export interface Page {
  index: number;
  /** Pages never span two blocks, so a transition screen always lands on a
   *  real boundary of the instrument. */
  block: string;
  questionIds: string[];
  /** True when this is the last page of its block and another block follows. */
  endsBlock: boolean;
}

export interface Progress {
  answered: number;
  total: number;
  /** 0..1 */
  ratio: number;
  pageIndex: number;
  pageCount: number;
}

/**
 * Splits the instrument into pages of at most `pageSize`, never mixing blocks.
 *
 * Question order is preserved exactly. The ASRS licence permits producing an
 * electronic version but not modifying the instrument, and reordering items to
 * suit a nicer thematic grouping would be a modification. Paginating the
 * presentation is not.
 */
export function paginate(definition: AssessmentDefinition, pageSize = 6): Page[] {
  if (pageSize < 1) throw new RangeError('pageSize must be at least 1');

  const blocks: { block: string; questionIds: string[] }[] = [];
  for (const question of definition.questions) {
    const last = blocks[blocks.length - 1];
    if (last && last.block === question.block) last.questionIds.push(question.id);
    else blocks.push({ block: question.block, questionIds: [question.id] });
  }

  const pages: Page[] = [];
  blocks.forEach((block, blockIndex) => {
    const isLastBlock = blockIndex === blocks.length - 1;
    for (let i = 0; i < block.questionIds.length; i += pageSize) {
      const questionIds = block.questionIds.slice(i, i + pageSize);
      const isLastPageOfBlock = i + pageSize >= block.questionIds.length;
      pages.push({
        index: pages.length,
        block: block.block,
        questionIds,
        endsBlock: isLastPageOfBlock && !isLastBlock,
      });
    }
  });

  return pages;
}

export function createSession(
  definition: AssessmentDefinition,
  { id, startedAt }: { id: string; startedAt: string },
): AssessmentSession {
  return {
    id,
    assessmentId: definition.assessmentId,
    version: definition.version,
    startedAt,
    answers: [],
    pageIndex: 0,
  };
}

/** Replaces any previous answer for the same question. Returns a new session. */
export function recordAnswer(
  session: AssessmentSession,
  answer: Answer,
): AssessmentSession {
  const answers = session.answers.filter((a) => a.questionId !== answer.questionId);
  return { ...session, answers: [...answers, answer] };
}

export function answeredIds(session: AssessmentSession): Set<string> {
  return new Set(session.answers.map((a) => a.questionId));
}

/** Every question on the page has an answer. */
export function isPageComplete(page: Page, session: AssessmentSession): boolean {
  const answered = answeredIds(session);
  return page.questionIds.every((id) => answered.has(id));
}

export function isComplete(
  definition: AssessmentDefinition,
  session: AssessmentSession,
): boolean {
  const answered = answeredIds(session);
  return definition.questions.every((q) => answered.has(q.id));
}

/**
 * Moves within the pages that exist. Going back is always allowed — section 21
 * asks for it, and an answer the person wants to revise is more accurate than
 * one they were locked out of.
 */
export function goToPage(
  session: AssessmentSession,
  pages: Page[],
  pageIndex: number,
): AssessmentSession {
  const clamped = Math.min(Math.max(pageIndex, 0), Math.max(pages.length - 1, 0));
  return { ...session, pageIndex: clamped };
}

export function progress(
  definition: AssessmentDefinition,
  session: AssessmentSession,
  pages: Page[],
): Progress {
  const answered = definition.questions.filter((q) =>
    session.answers.some((a) => a.questionId === q.id),
  ).length;
  const total = definition.questions.length;

  return {
    answered,
    total,
    ratio: total === 0 ? 0 : answered / total,
    pageIndex: session.pageIndex,
    pageCount: pages.length,
  };
}

/**
 * A session answered against an older version of the instrument cannot be
 * resumed: the person would be shown different questions than the ones their
 * answers belong to.
 */
export function isResumable(
  definition: AssessmentDefinition,
  session: AssessmentSession,
): boolean {
  return (
    session.assessmentId === definition.assessmentId && session.version === definition.version
  );
}

/** Links an anonymous session to an account, once there is one. */
export function claimSession(session: AssessmentSession, userId: string): AssessmentSession {
  return { ...session, claimedBy: userId };
}
