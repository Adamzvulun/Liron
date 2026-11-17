-- The regular for word chapter 111 (the road, the gym and the airport): chapter 112, Bilal, a company representative who lives between flights.
-- Its trial sends trial-112, and a pass gives a brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-112', 1)
on conflict do nothing;
