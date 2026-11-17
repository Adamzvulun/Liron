-- Waymark: rank events (ADR 0035, #174). Applies to dev on merge and to prod on release
-- (ADR 0018).
--
-- A rank is worked out in the browser from the subject's progress. When the player takes it,
-- the subject sends rank-<id> once, with the save that stores it in the subject state. The
-- event is what later steps read (rank gear #176, achievements #177); this step only lets the
-- database count it. Each rank is taken once, so the daily cap is 1.
insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('morse', 'rank-listener', 1),
  ('morse', 'rank-keyer', 1),
  ('morse', 'rank-operator', 1),
  ('morse', 'rank-telegraphist', 1),
  ('morse', 'rank-signal-master', 1),
  ('morse', 'rank-ghost', 1),
  ('arabic', 'rank-guest', 1),
  ('arabic', 'rank-traveler', 1),
  ('arabic', 'rank-neighbor', 1),
  ('arabic', 'rank-friend', 1),
  ('arabic', 'rank-local', 1),
  ('arabic', 'rank-storyteller', 1);
