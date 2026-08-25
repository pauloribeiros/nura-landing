-- ============================================================================
-- Email capture, opt-in only.
--
-- An address stored next to an assessment session is sensitive personal data
-- under the LGPD: it makes a mental-health screening result attributable to an
-- identifiable person. So the row records the consent that authorised it —
-- `consented_at` is NOT NULL, which makes a lead without consent impossible to
-- represent rather than merely discouraged.
--
-- The table is write-only from the browser. Someone can add their own address;
-- nobody can read the list back, not even their own row. There is no product
-- reason for the client to read leads, and a SELECT policy would be one
-- mistake away from exposing the mailing list.
-- ============================================================================

begin;

create table if not exists public.assessment_leads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  session_id    uuid references public.assessment_sessions (id) on delete set null,
  assessment_id text not null,
  email         text not null,
  locale        text,
  -- The moment consent was given. Not nullable on purpose: see above.
  consented_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- One address per person per assessment; re-submitting updates rather than
-- piling up duplicates.
create unique index if not exists assessment_leads_unique
  on public.assessment_leads (user_id, assessment_id);

alter table public.assessment_leads enable row level security;
alter table public.assessment_leads force row level security;

-- Insert only, and only for yourself.
create policy "own leads are insertable"
  on public.assessment_leads for insert
  with check (auth.uid() = user_id);

create policy "own leads are updatable"
  on public.assessment_leads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Deliberately no SELECT policy for `authenticated`: the browser never needs
-- to read this table. Reading is the server's job, through the secret key.

grant insert, update on public.assessment_leads to authenticated;
grant select, insert, update on public.assessment_leads to service_role;

commit;
