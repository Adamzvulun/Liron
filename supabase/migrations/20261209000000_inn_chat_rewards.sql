-- Waymark: a contract and an achievement for talking with the regulars at the inn (E17, ADR 0038).
-- Applies to dev on merge and to prod on release (ADR 0018).
--
-- A chat of at least one of your lines sends `inn-chat`; the first chat with a regular also
-- sends `inn-regular`, so 10 of those is 10 different regulars.

insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('arabic', 'inn-chat', 20),
  ('arabic', 'inn-regular', 10);

-- Offered once you've had a chat, so nobody is asked before the Groq key is set up.
insert into public.contract_templates (id, subject_id, metric, kind, target, gold, text, requires_kind) values
  ('arabic-chat', 'arabic', 'event', 'inn-chat', 1, 15, 'Sit and talk with a regular at the inn', 'inn-chat');

insert into public.achievements (id, condition, gems, title) values
  ('known-at-the-inn', '{"kind": "event-total", "subject": "arabic", "kind_of": "inn-regular", "n": 10}', 3, 'the Well-Spoken');
