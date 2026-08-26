import { ASRS_DOMAINS, type AsrsDomain } from './instruments/asrs18';
import { isContextAnswer } from './context';
import type { ScoreResult } from './types';

/**
 * Turns a scored result into the plan for the paid report.
 *
 * The plan is structure, not prose: which sections exist, which copy key each
 * one reads, which parameters it needs and which instrument items it quotes.
 * Keeping the words in the message catalogue rather than in here means the
 * report is translated like everything else, and — more importantly — that the
 * responsible-language test can scan it. A report generated as raw strings in
 * a domain module would be the one place in the product where diagnostic
 * language could appear unchecked.
 *
 * Three rules constrain what a section may say, and they are enforced here
 * rather than trusted to whoever writes the copy:
 *
 *  - NO DSM PRESENTATION. It is tempting to call a profile "predominantly
 *    inattentive" when one domain has more flagged items than the other. Those
 *    are diagnostic specifiers from the DSM-5, and applying one to a person is
 *    a diagnosis. The plan describes the shape of the ANSWERS — more items in
 *    one dimension, similar in both — and never names a subtype.
 *  - ITEMS ARE QUOTED, NEVER PARAPHRASED. The ASRS licence forbids modifying
 *    the instrument, so a section that discusses an item carries its id and the
 *    renderer prints the published wording verbatim.
 *  - THE SCREENING CONCLUSION IS NOT RE-DERIVED. `band` comes from the scorer.
 *    A report that reached its own verdict could disagree with the free result
 *    the person already read.
 */

export type ReportSectionId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6';

/** How the two dimensions relate, described by count and never by subtype. */
export type BalanceShape = 'inattentionHigher' | 'hyperactivityHigher' | 'similar' | 'fewFlags';

export interface ReportSection {
  id: ReportSectionId;
  /** Message key under `report.<id>`, chosen by the data. */
  bodyKey: string;
  params?: Record<string, string | number>;
  /** Instrument item ids this section quotes, in published order. */
  items?: string[];
  /**
   * An extra sentence, keyed separately from the body.
   *
   * Context answers arrive as keys — `childhood`, `recent` — not as prose, so
   * interpolating one into a body string would print the key. Keeping it as
   * its own key lets the catalogue hold a proper sentence for each value, and
   * lets the section read fine when there is none.
   */
  noteKey?: string;
}

export interface ReportPlan {
  assessmentId: string;
  version: string;
  /** Carried so an old report stays traceable to the rules that produced it. */
  scoringVersion: string;
  band: string;
  sections: ReportSection[];
}

/** Flagged items for a domain, kept in the instrument's published order. */
function flaggedIn(domain: AsrsDomain, flagged: Set<string>): string[] {
  return ASRS_DOMAINS[domain].filter((id) => flagged.has(id));
}

/**
 * Which dimension carries more flagged items.
 *
 * A two-item gap is required before calling either side higher: one item of
 * difference is noise in a 9-item count, and reporting it as a lean would
 * invite the reader to draw a distinction the data cannot support.
 */
export function balanceOf(inattention: number, hyperactivity: number): BalanceShape {
  if (inattention === 0 && hyperactivity === 0) return 'fewFlags';
  const gap = inattention - hyperactivity;
  if (gap >= 2) return 'inattentionHigher';
  if (gap <= -2) return 'hyperactivityHigher';
  return 'similar';
}

export function buildReportPlan(
  result: ScoreResult,
  contextAnswers: Record<string, string | undefined> = {},
): ReportPlan {
  const band = result.bands['partA-screen'] ?? 'notElevated';
  const elevated = band === 'highlyConsistent';
  const screenCount = result.scores['partA-screen'] ?? 0;

  const flagged = new Set([
    ...(result.flagged['partA-detail'] ?? []),
    ...(result.flagged['partB-detail'] ?? []),
  ]);

  const inattention = flaggedIn('inattention', flagged);
  const hyperactivity = flaggedIn('hyperactivity', flagged);
  const balance = balanceOf(inattention.length, hyperactivity.length);

  const setting = contextAnswers.ctxSetting;
  const since = contextAnswers.ctxSince;

  const sections: ReportSection[] = [
    {
      id: 's1',
      bodyKey: elevated ? 'elevated' : 'notElevated',
      params: { count: screenCount, cutoff: 4 },
    },
    {
      id: 's2',
      bodyKey: inattention.length === 0 ? 'none' : 'some',
      params: { flagged: inattention.length, total: ASRS_DOMAINS.inattention.length },
      items: inattention,
    },
    {
      id: 's3',
      bodyKey: hyperactivity.length === 0 ? 'none' : 'some',
      params: { flagged: hyperactivity.length, total: ASRS_DOMAINS.hyperactivity.length },
      items: hyperactivity,
    },
    {
      id: 's4',
      bodyKey: balance,
      params: { inattention: inattention.length, hyperactivity: hyperactivity.length },
    },
    {
      // Without a context answer the section still exists, but speaks generally
      // instead of inventing a setting the person never named.
      id: 's5',
      bodyKey: setting ? `setting.${setting}` : 'noSetting',
      noteKey: since ? `since.${since}` : undefined,
    },
    {
      id: 's6',
      bodyKey: elevated ? 'elevated' : 'notElevated',
      // The items worth raising first are the ones that were flagged, quoted
      // as published so the person can read them out at an appointment.
      items: [...inattention, ...hyperactivity],
    },
  ];

  return {
    assessmentId: result.assessmentId,
    version: result.version,
    scoringVersion: result.scoringVersion,
    band,
    sections,
  };
}

/** Every item id a plan quotes. Used to assert none of them is a context id. */
export function quotedItems(plan: ReportPlan): string[] {
  return plan.sections.flatMap((s) => s.items ?? []);
}

export function planQuotesOnlyInstrumentItems(plan: ReportPlan): boolean {
  return quotedItems(plan).every((id) => !isContextAnswer(id));
}
