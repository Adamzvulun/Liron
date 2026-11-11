-- The regulars for word chapters 78–83 (more B1 words): chapters LXXIX–LXXXIV, a winter at the
-- inn. Each trial sends trial-<n>, and a pass gives a brass chest through the existing chest rules
-- (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(79, 84) n
on conflict do nothing;
