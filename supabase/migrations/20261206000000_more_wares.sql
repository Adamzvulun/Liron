-- Waymark: more Market wares, one more piece for each slot and two tunic dyes (docs/game/avatar.md,
-- "Ideas for later"). Applies to dev on merge and to prod on release (ADR 0018).
--
-- Copied from content/core/items.json (a test keeps them equal). No milestones: like the first
-- wares (20261112000000), they come from chests and the Market only, and market_stock and
-- open_chest pick them up from this table as soon as this applies.

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('kufi', 'gear', 'head', 'common', 60, null),
  ('shawl', 'gear', 'torso', 'common', 60, null),
  ('gold-sirwal', 'gear', 'legs', 'epic', 450, null),
  ('slippers', 'gear', 'feet', 'epic', 450, null),
  ('falcon', 'gear', 'hand', 'epic', 450, null),
  ('waterskin', 'gear', 'back', 'common', 60, null),
  ('rose-dye', 'color', null, 'common', 60, null),
  ('charcoal-dye', 'color', null, 'common', 60, null);
