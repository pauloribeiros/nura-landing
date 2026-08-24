-- ============================================================================
-- Gives the server the access the design already assumed it had.
--
-- 0001 granted only to `authenticated`, on the reasoning that the client is the
-- only thing talking to these tables. That was incomplete: a result is written
-- by the server after scoring, precisely so the client cannot author what a
-- paid report is unlocked against. Without a grant, that write fails with
-- `permission denied` — service_role bypasses RLS, but not table privileges.
--
-- Scope is exactly what scoring needs: read the answers, write the result.
-- No delete anywhere, and no write to sessions or answers — the server has no
-- reason to alter what a person answered.
-- ============================================================================

begin;

grant usage on schema public to service_role;

grant select on public.assessment_sessions to service_role;
grant select on public.assessment_answers  to service_role;
grant select, insert, update on public.assessment_results to service_role;

commit;
