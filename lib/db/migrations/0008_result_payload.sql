-- ============================================================================
-- Room for a result the shared columns do not model.
--
-- `assessment_results` was shaped around a screening questionnaire: scores per
-- rule, flags, flagged items, interpretation bands. A timed reasoning test
-- produces none of those. It produces a points total, a per-dimension profile,
-- a speed factor and an elapsed time.
--
-- Two ways to hold that. A second table would duplicate the ownership rules,
-- the RLS, the grants and the entitlement join — four things that must stay
-- identical between assessments and would drift the moment one is edited and
-- the other is not. A jsonb column holds the part that genuinely differs and
-- leaves everything about WHO MAY READ IT in one place.
--
-- So the shared columns keep meaning what they meant, and `payload` carries
-- whatever an assessment computes that they cannot express. It is written by
-- the server, like the rest of the row.
-- ============================================================================

begin;

alter table public.assessment_results
  add column if not exists payload jsonb;

comment on column public.assessment_results.payload is
  'Assessment-specific result data the shared columns do not model. Server-written.';

commit;
