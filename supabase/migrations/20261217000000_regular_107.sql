-- The regular for word chapter 106 (family, public life and punctuation): chapter 107, Abu Wael
-- and Umm Wael's fortieth anniversary. Its trial sends trial-107, and a pass gives a brass chest
-- through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-107', 1)
on conflict do nothing;
