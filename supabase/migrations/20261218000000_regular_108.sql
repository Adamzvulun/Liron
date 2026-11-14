-- The regular for word chapter 107 (the deli, the gym and the day's prayers): chapter 108, Abu
-- Hatem, who runs the deli. Its trial sends trial-108, and a pass gives a brass chest through the
-- existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-108', 1)
on conflict do nothing;
