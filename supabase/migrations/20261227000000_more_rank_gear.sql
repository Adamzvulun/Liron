-- Waymark: rank gear for the ranks opened on 2026-11-15 (#176, ADR 0035). Applies to dev on merge
-- and to prod on release (ADR 0018).
--
-- One piece for each rank you can reach now, as in 20261117000000_rank_gear.sql: taking the rank
-- (its rank-<id> event) gives it through grant_milestones; the Market and chests leave it out.
insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('signal-cap', 'gear', 'head', 'epic', 450, '{"kind": "rank", "subject": "morse", "rank": "signal-master"}'),
  ('ether-cloak', 'gear', 'back', 'epic', 450, '{"kind": "rank", "subject": "morse", "rank": "ghost"}'),
  ('olive-sprig', 'gear', 'hand', 'epic', 450, '{"kind": "rank", "subject": "arabic", "rank": "neighbor"}'),
  ('dallah', 'gear', 'hand', 'epic', 450, '{"kind": "rank", "subject": "arabic", "rank": "friend"}'),
  ('tatreez-vest', 'gear', 'torso', 'epic', 450, '{"kind": "rank", "subject": "arabic", "rank": "local"}'),
  ('story-cloak', 'gear', 'back', 'epic', 450, '{"kind": "rank", "subject": "arabic", "rank": "storyteller"}');
