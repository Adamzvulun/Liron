-- The regular for word chapter 108 (wild things, far places and fine points): chapter 109,
-- Marwan, who keeps the zoo. Its trial sends trial-109, and a pass gives a brass chest through the
-- existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-109', 1)
on conflict do nothing;
