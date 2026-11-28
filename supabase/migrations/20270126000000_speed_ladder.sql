-- Waymark: the Morse speed ladder (#508, docs/game/morse-speed.md). Applies to dev on merge and
-- to prod on release (ADR 0018).
--
-- A rung opens after Forty Winters, so every kind below requires it, or the rung before. The
-- player's save sends:
-- - ladder-rung: any rung opened (once a day);
-- - ladder-25: the 25 wpm rung, which gives the achievement Faster than Thought and the title Ghost;
-- - trial-ladder-30: the 30 wpm rung, which gives the metronome through grant_milestones (a
--   'trial' milestone with a text chapter, so it is earned only, never sold or rolled).
-- trial-ladder-30 also matches 'trial-%' in any-trial, but First Light is already met by then.
insert into public.subject_event_kinds (subject_id, kind, daily_cap, requires) values
  ('morse', 'ladder-rung', 1, 'trial-forty-winters'),
  ('morse', 'ladder-25', 1, 'ladder-rung'),
  ('morse', 'trial-ladder-30', 1, 'ladder-25');

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('metronome', 'gear', 'hand', 'epic', 450, '{"kind": "trial", "chapter": "ladder-30"}');

insert into public.achievements (id, condition, gems, title) values
  ('faster-than-thought', '{"kind": "events", "subject": "morse", "kinds": ["ladder-25"], "n": 1}', 3, 'Ghost');
