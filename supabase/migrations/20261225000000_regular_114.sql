-- The regular for word chapter 113 (the family you marry into, and the national days): chapter 114,
-- Lama, whose family is made of two. Its trial sends trial-114, and a pass gives a brass chest
-- through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-114', 1)
on conflict do nothing;
