-- Waymark: the Night Watch, the Telegraphist's trial (E13, #179, ADR 0035). Applies to dev on
-- merge and to prod on release (ADR 0018).
--
-- A first pass sends trial-night-watch with its save. It is counted once. It is not a
-- questline chapter, so it gives no brass chest.
insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('morse', 'trial-night-watch', 1);
