-- Waymark: Forty Winters, the Silent Beacon's finale and the Morse capstone (tasks 4.2 and 4.3,
-- #334, #335; ADR 0047). Applies to dev on merge and to prod on release (ADR 0018).
--
-- A first pass sends trial-forty-winters with its save, once. It isn't a questline chapter, so it
-- gives no brass chest. The database then gives what can be earned no other way:
-- - the beacon lens, through grant_milestones (a 'trial' milestone);
-- - the achievement Forty Winters with the title Keeper of the Hour (Keeper of the Beacon was
--   already Beacon Relit's, for the five trials), through
--   grant_achievements; the party feed announces the achievement (feed_from_achievement).
insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('morse', 'trial-forty-winters', 1);

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('beacon-lens', 'gear', 'hand', 'epic', 450, '{"kind": "trial", "chapter": "forty-winters"}');

insert into public.achievements (id, condition, gems, title) values
  ('forty-winters', '{"kind": "events", "subject": "morse", "kinds": ["trial-forty-winters"], "n": 1}', 5, 'Keeper of the Hour');
