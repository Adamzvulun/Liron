-- The regulars for word chapters 90–92 (the order words, the months still missing, the days and
-- years around now, words for when and how often, everyone and nothing, and good wishes):
-- chapters 91–93, the calendar maker, the evening bus and Eid at the inn. Each trial sends
-- trial-<n>, and a pass gives a brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(91, 93) n
on conflict do nothing;
