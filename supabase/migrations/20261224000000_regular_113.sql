-- The regular for word chapter 112 (campus, kind wishes and the weather): chapter 113, Ruba, a freshman who lives on campus.
-- Its trial sends trial-113, and a pass gives a brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-113', 1)
on conflict do nothing;
