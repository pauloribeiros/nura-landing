-- ============================================================================
-- Lets a person read back their own lead row.
--
-- 0004 withheld SELECT entirely, reasoning that the browser never needs to
-- read the mailing list. That was belt-and-braces on top of RLS, and it broke
-- something real: `ON CONFLICT DO UPDATE` requires SELECT privilege on the
-- columns of the arbiter index, so re-submitting a corrected address failed
-- with `permission denied` instead of replacing the typo.
--
-- The guarantee that actually matters is unchanged and comes from RLS, not
-- from the missing grant: the policy below is `auth.uid() = user_id`, so a
-- request can only ever see the single row it wrote itself. Enumerating the
-- list stays impossible. What becomes possible is reading back an address the
-- person typed in the first place.
-- ============================================================================

begin;

create policy "own leads are readable"
  on public.assessment_leads for select
  using (auth.uid() = user_id);

grant select on public.assessment_leads to authenticated;

commit;
