-- ============================================================================
-- Who may read a paid report.
--
-- The security property this table exists for is one line long: a client can
-- READ its own entitlements and can never CREATE one. There is no INSERT,
-- UPDATE or DELETE policy for `authenticated`, and no grant either — the two
-- together mean a browser cannot grant itself access no matter what it sends.
-- Rows arrive from the server, after a payment provider confirmed money moved,
-- or by hand for a tester.
--
-- Deliberately provider-agnostic. `provider` and `provider_ref` are free text
-- so Stripe today and something else tomorrow both fit without a migration,
-- and `source` separates a real purchase from a manual grant so the two never
-- get confused in reporting.
-- ============================================================================

begin;

create table if not exists public.assessment_entitlements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- One entitlement per run: buying twice for the same session is a mistake,
  -- not a feature, so the database refuses it.
  session_id    uuid not null unique references public.assessment_sessions (id) on delete cascade,
  assessment_id text not null,

  -- 'purchase' when money moved, 'manual' when granted by hand. Kept apart so
  -- a test grant never shows up as revenue.
  source        text not null default 'purchase',
  provider      text,
  provider_ref  text,
  amount_cents  integer,
  currency      text,

  granted_at    timestamptz not null default now()
);

-- The same provider event must never grant twice, however many times a
-- webhook is redelivered.
create unique index if not exists assessment_entitlements_provider_ref
  on public.assessment_entitlements (provider, provider_ref)
  where provider_ref is not null;

create index if not exists assessment_entitlements_user_idx
  on public.assessment_entitlements (user_id);

alter table public.assessment_entitlements enable row level security;
alter table public.assessment_entitlements force row level security;

-- Read your own. That is the whole of what a browser may do here.
create policy "own entitlements are readable"
  on public.assessment_entitlements for select
  using (auth.uid() = user_id);

grant select on public.assessment_entitlements to authenticated;
grant select, insert, update on public.assessment_entitlements to service_role;

commit;
