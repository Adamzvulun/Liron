-- Waymark: more furniture, and the guild banners (task 7.8, #443; docs/game/the-home.md §7,
-- ADR 0035). Applies to dev on merge and to prod on release (ADR 0018).
--
-- Four more pieces to buy or find, and a banner for each guild: a wall piece its first rank
-- gives (Listener of the Signalers, Guest of the House of the Crossing), through
-- grant_milestones like rank gear, and so never sold, rolled or given (is_rank_gear). A player
-- who holds the rank already gets the banner with their next save.
insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('home-harbor', 'furniture', null, 'common', 60, null),
  ('home-stove', 'furniture', null, 'rare', 180, null),
  ('home-kilim', 'furniture', null, 'rare', 180, null),
  ('home-window-seat', 'furniture', null, 'epic', 450, null),
  ('home-banner-signal', 'furniture', null, 'epic', 450,
    '{"kind": "rank", "subject": "morse", "rank": "listener"}'),
  ('home-banner-crossing', 'furniture', null, 'epic', 450,
    '{"kind": "rank", "subject": "arabic", "rank": "guest"}');

insert into public.home_pieces (id, place, w, d, does) values
  ('home-harbor', 'wall', 1, 1, 'look'),
  ('home-stove', 'floor', 1, 1, 'look'),
  ('home-kilim', 'rug', 3, 2, 'look'),
  ('home-window-seat', 'floor', 3, 1, 'sit'),
  ('home-banner-signal', 'wall', 1, 1, 'look'),
  ('home-banner-crossing', 'wall', 1, 1, 'look');
