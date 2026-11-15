-- The regular for word chapter 110 (the home, looks and the kitchen): chapter 111, Nawal, who does hair in the room behind her kitchen.
-- Its trial sends trial-111, and a pass gives a brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-111', 1)
on conflict do nothing;
