-- Waymark: Spell it at the slate (#519, docs/game/arabic-spelling.md). Applies to dev on merge
-- and to prod on release (ADR 0018).
--
-- A round sends `spell-round`, and `spell-90` when 90% of its words were spelled right. The daily
-- contract is offered only once you have played a round on an earlier day, like the Long Copy's
-- (20270127000000): the database can't see whether every letter has been met.
insert into public.subject_event_kinds (subject_id, kind) values
  ('arabic', 'spell-round'),
  ('arabic', 'spell-90');

insert into public.contract_templates (id, subject_id, metric, kind, target, gold, text, requires_kind) values
  ('arabic-spell', 'arabic', 'event', 'spell-round', 2, 15, 'Spell 2 rounds at the slate', 'spell-round');
