-- Waymark: The Long Copy (#509, docs/game/morse-speed.md). Applies to dev on merge and to prod on
-- release (ADR 0018).
--
-- A round sends `long-copy-round`, counted only once the Gatekeeper (trial-1) is passed, as the
-- Codebook itself opens then. The daily contract is offered only once you have played one
-- on an earlier day, like the Codebook's (20261114000000).
insert into public.subject_event_kinds (subject_id, kind, requires) values
  ('morse', 'long-copy-round', 'trial-1');

insert into public.contract_templates (id, subject_id, metric, kind, target, gold, text, requires_kind) values
  ('morse-long-copy', 'morse', 'event', 'long-copy-round', 1, 20, 'A Long Copy at your speed', 'long-copy-round');
