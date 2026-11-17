-- Waymark: the Market's wares (#49, ADR 0033). Applies to dev on merge and to prod on release
-- (ADR 0018).
--
-- 16 gear items and 4 tunic dyes, copied from content/core/items.json (a test keeps them
-- equal). None has a milestone: they come from chests and the Market only. Chests already drop
-- any gear in this table, so these can come out of a chest as soon as this applies.

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('tarboosh', 'gear', 'head', 'common', 60, null),
  ('sunhat', 'gear', 'head', 'common', 60, null),
  ('turban', 'gear', 'head', 'rare', 180, null),
  ('vest', 'gear', 'torso', 'common', 60, null),
  ('robe', 'gear', 'torso', 'rare', 180, null),
  ('coat', 'gear', 'torso', 'epic', 450, null),
  ('sirwal', 'gear', 'legs', 'common', 60, null),
  ('silks', 'gear', 'legs', 'rare', 180, null),
  ('sandals', 'gear', 'feet', 'common', 60, null),
  ('ridingboots', 'gear', 'feet', 'rare', 180, null),
  ('flags', 'gear', 'hand', 'common', 60, null),
  ('scroll', 'gear', 'hand', 'common', 60, null),
  ('lamp', 'gear', 'hand', 'rare', 180, null),
  ('bedroll', 'gear', 'back', 'common', 60, null),
  ('oud', 'gear', 'back', 'rare', 180, null),
  ('banner', 'gear', 'back', 'epic', 450, null),
  ('crimson-dye', 'color', null, 'common', 60, null),
  ('saffron-dye', 'color', null, 'common', 60, null),
  ('indigo-dye', 'color', null, 'common', 60, null),
  ('forest-dye', 'color', null, 'common', 60, null);
