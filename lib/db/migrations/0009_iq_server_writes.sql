-- ============================================================================
-- Lets the server open a session and record answers — for the IQ test only in
-- practice, but the grant is on the tables, so it is stated plainly here.
--
-- 0003 granted service_role SELECT on sessions and answers and said "the
-- server has no reason to alter what a person answered". True for the ADHD
-- assessment, where the browser owns the session and writes each answer as it
-- goes. The IQ test is built the other way round: the browser never receives
-- the answer key, so it cannot score, and the run is submitted at the end for
-- the server to score AND record. With SELECT only, that insert failed with
-- `permission denied for table assessment_sessions` and the test could not
-- produce a result at all.
--
-- INSERT ONLY. No update, no delete: the reasoning in 0003 stands, it was just
-- aimed at the wrong verb. The server may write down what arrived; it still
-- cannot go back and change what someone answered.
-- ============================================================================

begin;

grant insert on public.assessment_sessions to service_role;
grant insert on public.assessment_answers  to service_role;

commit;
