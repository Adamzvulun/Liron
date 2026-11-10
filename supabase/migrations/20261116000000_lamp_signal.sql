-- Waymark: the Lamp Signal, the Keyer's trial (E13, #175, ADR 0035). Applies to dev on merge
-- and to prod on release (ADR 0018).
--
-- A first pass sends trial-lamp-signal with its save. It is counted once; its gear comes with
-- the rank gear (#176). It is not a questline chapter, so it gives no brass chest.
insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('morse', 'trial-lamp-signal', 1);
