'use client';

import { useEffect } from 'react';

/** Where someone is inside a test, as far as the page's chrome is concerned. */
export type TestStage =
  /** Not in a test — everything shows. */
  | 'off'
  /** On the test page, but reading: the intro, the result is not here yet. */
  | 'reading'
  /** Answering. Nothing may sit between the person and the next question. */
  | 'answering';

/**
 * Marks the page as "a test is happening", which strips the chrome around it.
 *
 * `is-running-test` hides the site footer and the header's "Começar". While
 * someone is on a test page, the page is one task: the footer is ~295px of
 * site navigation under the choices — on a phone the single largest reason a
 * question did not fit the screen — and the header button is a way out of the
 * test to somewhere else, sat in the corner of every question. Both come back
 * on the result, where going elsewhere is a real next step.
 *
 * `is-answering` is the stricter half: it also hides the consent banner, which
 * is a fixed card at the bottom of the screen and was covering the answers.
 * The banner still gets asked — on the intro before the test starts, and on
 * the result after — just never over a question. Analytics stays off until
 * someone says yes, so deferring the question costs nothing but a later yes.
 *
 * Body classes rather than not rendering the pieces: they belong to the root
 * layout, and a running test is a state of the page, not a different page.
 * One owner per test, or two components would fight over removing the class.
 */
export function useFocusMode(stage: TestStage) {
  useEffect(() => {
    if (stage === 'off') return;

    const { body } = document;
    body.classList.add('is-running-test');
    if (stage === 'answering') body.classList.add('is-answering');

    return () => {
      body.classList.remove('is-running-test');
      body.classList.remove('is-answering');
    };
  }, [stage]);
}
