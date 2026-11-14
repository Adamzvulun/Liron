-- The regular for word chapter 93 (the phone, the weather, a few feelings and greetings):
-- chapter 94, Hanan of the phone shop in the rainy week. Her trial sends trial-94, and a pass
-- gives a brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-94', 1)
on conflict do nothing;
