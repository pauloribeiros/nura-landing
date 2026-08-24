-- ============================================================================
-- Assessment storage, with row level security enabled in the same migration
-- that creates the tables.
--
-- Answers here describe a person's attention, restlessness and routine. Under
-- the LGPD that is sensitive personal data, so there is deliberately no window
-- in which these tables exist without RLS: create, enable, policy — in order,
-- in one transaction.
--
-- Ownership is `auth.uid()` throughout. Supabase anonymous sign-in issues a
-- real uid, so someone can answer before creating an account without the row
-- ever being ownerless.
-- ============================================================================

begin;

-- ---------------------------------------------------------------- sessions --

create table if not exists public.assessment_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  assessment_id text not null,
  version       text not null,
  page_index    integer not null default 0,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists assessment_sessions_user_idx
  on public.assessment_sessions (user_id, assessment_id);

alter table public.assessment_sessions enable row level security;
alter table public.assessment_sessions force row level security;

create policy "own sessions are readable"
  on public.assessment_sessions for select
  using (auth.uid() = user_id);

create policy "own sessions are insertable"
  on public.assessment_sessions for insert
  with check (auth.uid() = user_id);

create policy "own sessions are updatable"
  on public.assessment_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own sessions are deletable"
  on public.assessment_sessions for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------- answers --

create table if not exists public.assessment_answers (
  session_id  uuid not null references public.assessment_sessions (id) on delete cascade,
  question_id text not null,
  choice_id   text not null,
  answered_at timestamptz not null default now(),
  primary key (session_id, question_id)
);

alter table public.assessment_answers enable row level security;
alter table public.assessment_answers force row level security;

-- Ownership is inherited from the session rather than duplicated on the row:
-- one place to get wrong instead of two.
create policy "answers follow their session"
  on public.assessment_answers for all
  using (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------- results --

create table if not exists public.assessment_results (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null unique references public.assessment_sessions (id) on delete cascade,
  assessment_id   text not null,
  version         text not null,
  scoring_version text not null,
  scores          jsonb not null,
  flags           jsonb not null,
  flagged         jsonb not null,
  bands           jsonb not null,
  completeness    numeric(4, 3) not null,
  created_at      timestamptz not null default now()
);

alter table public.assessment_results enable row level security;
alter table public.assessment_results force row level security;

-- Readable by the owner, but never writable by them. A result is what a
-- report is unlocked against, so the client must not be able to author one —
-- inserts come from the server, through the service role, after scoring.
create policy "own results are readable"
  on public.assessment_results for select
  using (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

commit;
