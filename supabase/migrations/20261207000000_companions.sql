-- Waymark: companions (ADR 0006: "plus a companion pet"; docs/game/avatar.md). A seventh gear
-- slot, `pet`, and four pets, copied from content/core/items.json (a test keeps them equal).
-- Applies to dev on merge and to prod on release (ADR 0018).
--
-- Pets are gear like the wares: no milestone, so they come from chests and the Market only, and
-- market_stock and open_chest pick them up from this table as soon as this applies.

alter table public.items drop constraint items_slot_check;
alter table public.items add constraint items_slot_check
  check (slot in ('head', 'torso', 'legs', 'feet', 'hand', 'back', 'pet'));

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('sand-cat', 'gear', 'pet', 'common', 60, null),
  ('hedgehog', 'gear', 'pet', 'common', 60, null),
  ('fennec', 'gear', 'pet', 'rare', 180, null),
  ('camel-calf', 'gear', 'pet', 'epic', 450, null);
