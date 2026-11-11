-- The regulars for word chapters 86–87 (second words for taught meanings, and a few new ones):
-- chapters LXXXVII–LXXXVIII, spring at the inn. Each trial sends trial-<n>, and a pass gives a
-- brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(87, 88) n
on conflict do nothing;
