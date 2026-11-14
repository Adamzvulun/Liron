-- The regular for word chapter 105 (the landlord, the bed and the body): chapter 106, Abu Basel,
-- the landlord. Its trial sends trial-106, and a pass gives a brass chest through the existing
-- chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-106', 1)
on conflict do nothing;
