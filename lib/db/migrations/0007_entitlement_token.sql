-- ============================================================================
-- A way into a paid report that does not depend on a cookie.
--
-- Access is decided today by the anonymous session in the browser that bought
-- it. That works exactly once: open the emailed link on a phone, or clear the
-- browser, and the report a person paid for answers 404. For something bought
-- and kept, that is the wrong failure.
--
-- The token is a second key to the same door, not a wider door. It is random,
-- belongs to one entitlement, and grants nothing but that report. It is never
-- exposed to the client that bought — it exists to be put in an email.
--
-- Deliberately no expiry. A report is a document someone paid for and may want
-- again in a year; a link that dies is a support ticket. Revocation is a
-- column that can be set, which is a decision rather than a clock.
-- ============================================================================

begin;

alter table public.assessment_entitlements
  add column if not exists access_token text,
  add column if not exists revoked_at timestamptz;

-- Uniqueness matters: the token IS the credential, so two rows sharing one
-- would hand out someone else's report.
create unique index if not exists assessment_entitlements_token
  on public.assessment_entitlements (access_token)
  where access_token is not null;

-- The browser must not be able to read it. `authenticated` keeps SELECT on the
-- table for the gate to work, so the token is protected by being useless to
-- read: a person can already see their own report. What matters is that no
-- OTHER person can select it, which the existing RLS policy already ensures.
--
-- Reading and writing the token from the server happens through service_role,
-- which already has what it needs.

commit;
