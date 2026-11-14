-- The regular for word chapter 103 (shows, music and sweets): chapter 104, Muna, who hosts a talk
-- show on the radio. Its trial sends trial-104, and a pass gives a brass chest through the
-- existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-104', 1)
on conflict do nothing;
