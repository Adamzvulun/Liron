-- The regular for word chapter 104 (feelings, the doctor and the holidays): chapter 105, Dr. Nour,
-- the town doctor. Its trial sends trial-105, and a pass gives a brass chest through the existing
-- chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-105', 1)
on conflict do nothing;
