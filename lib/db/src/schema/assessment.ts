import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Assessment storage.
 *
 * Every row here is sensitive personal data under the LGPD: answers about
 * attention, restlessness and routine describe a person's mental health.
 * Three consequences are built in rather than bolted on later:
 *
 *  - RLS is enabled on all three tables in the same migration that creates
 *    them (see migrations/0001_assessment.sql). There is never a window where
 *    the tables exist unprotected.
 *  - `user_id` points at auth.users and is populated for anonymous sessions
 *    too, because Supabase anonymous sign-in issues a real uid. That is what
 *    lets someone answer before signing up without the row being ownerless.
 *  - deletion cascades from the session, so "delete my data" is one statement
 *    rather than a cleanup script.
 */

export const assessmentSessions = pgTable(
  'assessment_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** auth.users.id — set for anonymous sessions as well. */
    userId: uuid('user_id').notNull(),
    assessmentId: text('assessment_id').notNull(),
    /** Instrument version answered. A session never migrates across versions. */
    version: text('version').notNull(),
    pageIndex: integer('page_index').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('assessment_sessions_user_idx').on(table.userId, table.assessmentId)],
);

export const assessmentAnswers = pgTable(
  'assessment_answers',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull(),
    choiceId: text('choice_id').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // One answer per question: re-answering updates rather than appends, which
  // matches the domain rule that the last answer wins.
  (table) => [primaryKey({ columns: [table.sessionId, table.questionId] })],
);

export const assessmentResults = pgTable('assessment_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .unique()
    .references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  assessmentId: text('assessment_id').notNull(),
  version: text('version').notNull(),
  /** Bumped when a threshold is corrected without the questionnaire changing,
   *  so an old result stays traceable to the rules that produced it. */
  scoringVersion: text('scoring_version').notNull(),
  scores: jsonb('scores').notNull(),
  flags: jsonb('flags').notNull(),
  flagged: jsonb('flagged').notNull(),
  bands: jsonb('bands').notNull(),
  completeness: numeric('completeness', { precision: 4, scale: 3 }).notNull(),
  /** Written by the server only. The client may compute a preview, but what
   *  the report is unlocked against is this row. */
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AssessmentSessionRow = typeof assessmentSessions.$inferSelect;
export type NewAssessmentSession = typeof assessmentSessions.$inferInsert;
export type AssessmentAnswerRow = typeof assessmentAnswers.$inferSelect;
export type AssessmentResultRow = typeof assessmentResults.$inferSelect;
