-- ============================================================================
-- Revokes everything the `anon` role inherited on the assessment tables.
--
-- The migration that created them granted only to `authenticated`, but the
-- project already had default privileges on the public schema, so `anon` came
-- out holding REFERENCES, TRIGGER and TRUNCATE.
--
-- None of those are reachable through PostgREST today, and `anon` never had
-- SELECT or any write. So this is not a hole being closed — it is removing a
-- grant nothing uses, on tables holding sensitive personal data, before some
-- future change makes it matter.
--
-- Note that `anon` is not the anonymous visitor: Supabase anonymous sign-in
-- issues a JWT with the `authenticated` role. `anon` is a request with no
-- session at all, which has no business here.
-- ============================================================================

begin;

revoke all on public.assessment_sessions from anon;
revoke all on public.assessment_answers  from anon;
revoke all on public.assessment_results  from anon;

-- Stop the same privileges being handed out again on the next table created
-- in this schema.
alter default privileges in schema public revoke all on tables from anon;

commit;
