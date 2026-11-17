-- Waymark: The Stranger at the Gate, the Long Road In's finale and the Arabic capstone (tasks
-- 4.2 and 4.3, #334, #335; ADR 0047). Applies to dev on merge and to prod on release (ADR 0018).
--
-- A first pass sends trial-stranger-at-the-gate with its save, once. Like Forty Winters it is
-- not a regular's chapter, so it gives no chest. The database then gives what can be earned no
-- other way:
-- - the innkeeper's pen, through grant_milestones (a 'trial' milestone);
-- - the achievement The Stranger at the Gate with the title Keeper of the Table, through
--   grant_achievements; the party feed announces the achievement (feed_from_achievement).
insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('arabic', 'trial-stranger-at-the-gate', 1);

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('guest-book-pen', 'gear', 'hand', 'epic', 450, '{"kind": "trial", "chapter": "stranger-at-the-gate"}');

insert into public.achievements (id, condition, gems, title) values
  ('stranger-at-the-gate', '{"kind": "events", "subject": "arabic", "kinds": ["trial-stranger-at-the-gate"], "n": 1}', 5, 'Keeper of the Table');
