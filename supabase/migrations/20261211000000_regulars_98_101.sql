-- The regulars for word chapters 97–100 (chores, renting and the road; exams, work hours and
-- aches; trips, town and a night out; faces, clothes and the kitchen): chapters 98–101, Rana's
-- new flat, Tamer's exam results, Jamil the tour guide and Umm Hadi's wedding feast. Each trial
-- sends trial-<n>, and a pass gives a brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(98, 101) n
on conflict do nothing;
