-- The regular for word chapter 101 (campus, exams and the night shift): chapter 102, Layla, a
-- student who works the inn's night shift. Its trial sends trial-102, and a pass gives a brass
-- chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-102', 1)
on conflict do nothing;
