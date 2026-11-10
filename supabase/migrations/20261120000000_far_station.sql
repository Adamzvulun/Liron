-- Waymark: the Far Station, the Operator's trial (E13, #178, ADR 0035). Applies to dev on merge
-- and to prod on release (ADR 0018).
--
-- A first pass sends trial-far-station with its save. Like the other rank trials it is counted
-- once and gives no brass chest; the Operator's coat comes with the rank.
insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('morse', 'trial-far-station', 1);
