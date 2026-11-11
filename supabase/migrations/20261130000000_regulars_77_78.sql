-- The regulars for word chapters 76–77 (the deck's B2 words): chapters LXXVII–LXXVIII, an autumn
-- at the inn. Each trial sends trial-<n>, and a pass gives a brass chest through the existing chest
-- rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(77, 78) n
on conflict do nothing;
