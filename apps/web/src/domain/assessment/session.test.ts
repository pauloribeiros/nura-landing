import { describe, expect, it } from 'vitest';
import {
  claimSession,
  createSession,
  goToPage,
  isComplete,
  isPageComplete,
  isResumable,
  paginate,
  progress,
  recordAnswer,
} from './session';
import { asrs18 } from './instruments/asrs18';
import type { AssessmentDefinition } from './types';

const start = { id: 'session-1', startedAt: '2026-08-23T00:00:00.000Z' };
const answer = (questionId: string, choiceId: string) => ({ questionId, choiceId });

describe('paginate', () => {
  it('splits the ASRS into one Part A page and two Part B pages', () => {
    const pages = paginate(asrs18, 6);
    expect(pages.map((p) => [p.block, p.questionIds.length])).toEqual([
      ['partA', 6],
      ['partB', 6],
      ['partB', 6],
    ]);
  });

  it('never mixes two blocks on one page', () => {
    for (const size of [1, 4, 5, 7, 18]) {
      const pages = paginate(asrs18, size);
      for (const page of pages) {
        const blocks = new Set(
          page.questionIds.map((id) => asrs18.questions.find((q) => q.id === id)!.block),
        );
        expect(blocks.size).toBe(1);
      }
    }
  });

  it('preserves the published item order', () => {
    // Reordering a licensed instrument would be a modification; only the
    // presentation may be chunked.
    const flat = paginate(asrs18, 4).flatMap((p) => p.questionIds);
    expect(flat).toEqual(asrs18.questions.map((q) => q.id));
  });

  it('marks the last page of a block when another block follows', () => {
    const pages = paginate(asrs18, 6);
    expect(pages.map((p) => p.endsBlock)).toEqual([true, false, false]);
  });

  it('marks a block boundary even when each block fits on one page', () => {
    // pageSize 18 collapses each block to a single page; Part A still ends a
    // block because Part B follows, and the final page never does.
    expect(paginate(asrs18, 18).map((p) => p.endsBlock)).toEqual([true, false]);
  });

  it('rejects a page size below one', () => {
    expect(() => paginate(asrs18, 0)).toThrow(RangeError);
  });
});

describe('answers', () => {
  it('starts empty and anonymous', () => {
    const session = createSession(asrs18, start);
    expect(session.answers).toEqual([]);
    expect(session.claimedBy).toBeUndefined();
    expect(session.pageIndex).toBe(0);
  });

  it('replaces a previous answer instead of appending a second one', () => {
    let session = createSession(asrs18, start);
    session = recordAnswer(session, answer('q1', 'never'));
    session = recordAnswer(session, answer('q1', 'often'));
    expect(session.answers).toEqual([answer('q1', 'often')]);
  });

  it('does not mutate the session it was given', () => {
    const session = createSession(asrs18, start);
    const next = recordAnswer(session, answer('q1', 'often'));
    expect(session.answers).toEqual([]);
    expect(next).not.toBe(session);
  });
});

describe('completion', () => {
  it('reports a page complete only when every question on it is answered', () => {
    const [pageA] = paginate(asrs18, 6);
    let session = createSession(asrs18, start);
    for (const id of pageA.questionIds.slice(0, 5)) {
      session = recordAnswer(session, answer(id, 'never'));
    }
    expect(isPageComplete(pageA, session)).toBe(false);

    session = recordAnswer(session, answer(pageA.questionIds[5], 'never'));
    expect(isPageComplete(pageA, session)).toBe(true);
  });

  it('is not complete until all 18 items are answered', () => {
    let session = createSession(asrs18, start);
    for (const q of asrs18.questions.slice(0, 17)) {
      session = recordAnswer(session, answer(q.id, 'never'));
    }
    expect(isComplete(asrs18, session)).toBe(false);

    session = recordAnswer(session, answer(asrs18.questions[17].id, 'never'));
    expect(isComplete(asrs18, session)).toBe(true);
  });
});

describe('navigation', () => {
  const pages = paginate(asrs18, 6);

  it('allows going back', () => {
    let session = goToPage(createSession(asrs18, start), pages, 2);
    session = goToPage(session, pages, 1);
    expect(session.pageIndex).toBe(1);
  });

  it('clamps out-of-range pages instead of throwing', () => {
    const session = createSession(asrs18, start);
    expect(goToPage(session, pages, -5).pageIndex).toBe(0);
    expect(goToPage(session, pages, 99).pageIndex).toBe(pages.length - 1);
  });
});

describe('progress', () => {
  const pages = paginate(asrs18, 6);

  it('reports answered out of total, not pages out of pages', () => {
    let session = createSession(asrs18, start);
    expect(progress(asrs18, session, pages)).toMatchObject({ answered: 0, total: 18, ratio: 0 });

    for (const q of asrs18.questions.slice(0, 9)) {
      session = recordAnswer(session, answer(q.id, 'never'));
    }
    expect(progress(asrs18, session, pages)).toMatchObject({ answered: 9, ratio: 0.5 });
  });

  it('counts an answer of "never" as answered', () => {
    const session = recordAnswer(createSession(asrs18, start), answer('q1', 'never'));
    expect(progress(asrs18, session, pages).answered).toBe(1);
  });
});

describe('resuming', () => {
  it('resumes a session from the same instrument version', () => {
    expect(isResumable(asrs18, createSession(asrs18, start))).toBe(true);
  });

  it('refuses a session answered against another version', () => {
    const older = { ...createSession(asrs18, start), version: 'asrs-v1.0' };
    expect(isResumable(asrs18, older)).toBe(false);
  });

  it('refuses a session from another assessment', () => {
    const other: AssessmentDefinition = { ...asrs18, assessmentId: 'cognition' };
    expect(isResumable(other, createSession(asrs18, start))).toBe(false);
  });
});

describe('claiming', () => {
  it('links an anonymous session to an account without touching the answers', () => {
    const session = recordAnswer(createSession(asrs18, start), answer('q1', 'often'));
    const claimed = claimSession(session, 'user-9');
    expect(claimed.claimedBy).toBe('user-9');
    expect(claimed.answers).toEqual(session.answers);
    expect(session.claimedBy).toBeUndefined();
  });
});
